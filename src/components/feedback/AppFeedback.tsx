import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { Button } from '@/components/ui/Button'
import { Icon, type IconName } from '@/components/ui/Icon'
import { feedback } from '@/services/feedback'
import { colors, elevation, phaseColors, radius, spacing, typography } from '@/theme/tokens'

type DialogTone = 'info' | 'warning' | 'danger'

interface ConfirmOptions {
  title: string
  message?: string
  confirmLabel?: string
  cancelLabel?: string
  tone?: DialogTone
}

interface AlertOptions {
  title: string
  message?: string
  tone?: DialogTone
}

interface FeedbackApi {
  confirm: (options: ConfirmOptions) => Promise<boolean>
  alert: (options: AlertOptions) => Promise<void>
  toast: (message: string) => void
}

interface FeedbackAction {
  text?: string
  style?: 'default' | 'cancel' | 'destructive'
  onPress?: () => void
}

let activeFeedback: FeedbackApi | null = null

/** Adaptador para los mensajes existentes mientras todos usan el diálogo de la app. */
export const AppFeedback = {
  show(title: string, message?: string, actions?: FeedbackAction[]) {
    if (!activeFeedback) return
    if (!actions?.length) {
      const tone =
        /^(No fue|No se pudo|Error|Revisa|Código no válido|Área inválida|Nombre inválido|Motivo inválido|Demasiados intentos)/i.test(
          title,
        )
          ? 'warning'
          : 'info'
      void activeFeedback.alert({ title, message, tone })
      return
    }
    const affirmative = actions.find((action) => action.style !== 'cancel')
    const cancel = actions.find((action) => action.style === 'cancel')
    if (!affirmative) {
      void activeFeedback.alert({ title, message })
      return
    }
    if (!cancel) {
      void activeFeedback.alert({ title, message }).then(() => affirmative.onPress?.())
      return
    }
    void activeFeedback
      .confirm({
        title,
        message,
        confirmLabel: affirmative.text,
        cancelLabel: cancel.text,
        tone: affirmative.style === 'destructive' ? 'danger' : 'info',
      })
      .then((confirmed) => {
        if (confirmed) affirmative.onPress?.()
        else cancel.onPress?.()
      })
  },
  toast(message: string) {
    activeFeedback?.toast(message)
  },
}

type DialogState = ({ kind: 'confirm' } & ConfirmOptions) | ({ kind: 'alert' } & AlertOptions)

const FeedbackContext = createContext<FeedbackApi | null>(null)

export function useFeedback(): FeedbackApi {
  const context = useContext(FeedbackContext)
  if (!context) throw new Error('AppFeedbackProvider no está disponible')
  return context
}

const toneMeta: Record<DialogTone, { icon: IconName; color: string; background: string }> = {
  info: {
    icon: 'information-circle-outline',
    color: phaseColors.curso.fg,
    background: phaseColors.curso.bg,
  },
  warning: {
    icon: 'warning-outline',
    color: phaseColors.nueva.fg,
    background: phaseColors.nueva.bg,
  },
  danger: {
    icon: 'alert-circle-outline',
    color: phaseColors.rechazada.fg,
    background: phaseColors.rechazada.bg,
  },
}

function AppDialog({
  dialog,
  onClose,
}: {
  dialog: DialogState | null
  onClose: (yes: boolean) => void
}) {
  const tone = dialog?.tone ?? 'info'
  const meta = toneMeta[tone]

  return (
    <Modal
      animationType="fade"
      onRequestClose={() => onClose(false)}
      testID="app-dialog-modal"
      transparent
      visible={dialog !== null}
    >
      <View style={styles.dialogOverlay}>
        <Pressable
          accessibilityLabel="Cerrar diálogo"
          onPress={() => onClose(false)}
          style={StyleSheet.absoluteFill}
        />
        {dialog ? (
          <View accessibilityViewIsModal style={styles.dialogCard}>
            <View style={[styles.dialogIcon, { backgroundColor: meta.background }]}>
              <Icon name={meta.icon} color={meta.color} size="base" />
            </View>
            <Text accessibilityRole="header" style={styles.dialogTitle}>
              {dialog.title}
            </Text>
            {dialog.message ? <Text style={styles.dialogMessage}>{dialog.message}</Text> : null}
            <View style={styles.dialogActions}>
              {dialog.kind === 'confirm' ? (
                <Button
                  label={dialog.cancelLabel ?? 'Cancelar'}
                  onPress={() => onClose(false)}
                  style={styles.dialogAction}
                  variant="secondary"
                />
              ) : null}
              <Button
                label={
                  dialog.kind === 'confirm' ? (dialog.confirmLabel ?? 'Confirmar') : 'Entendido'
                }
                onPress={() => onClose(true)}
                style={styles.dialogAction}
                variant={tone === 'danger' ? 'danger' : 'primary'}
              />
            </View>
          </View>
        ) : null}
      </View>
    </Modal>
  )
}

function AppToast({ message }: { message: string | null }) {
  const insets = useSafeAreaInsets()
  if (!message) return null

  return (
    <View
      accessibilityLiveRegion="polite"
      pointerEvents="none"
      style={[styles.toast, { bottom: insets.bottom + spacing.md + 56 }]}
      testID="app-toast"
    >
      <Icon name="checkmark-circle" color={colors.white} size="inline" />
      <Text style={styles.toastText}>{message}</Text>
    </View>
  )
}

export function AppFeedbackProvider({ children }: { children: ReactNode }) {
  const [dialog, setDialog] = useState<DialogState | null>(null)
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const resolveDialog = useRef<((confirmed: boolean) => void) | null>(null)

  const close = useCallback((confirmed: boolean) => {
    resolveDialog.current?.(confirmed)
    resolveDialog.current = null
    setDialog(null)
  }, [])

  const open = useCallback((nextDialog: DialogState): Promise<boolean> => {
    resolveDialog.current?.(false)
    return new Promise((resolve) => {
      resolveDialog.current = resolve
      setDialog(nextDialog)
    })
  }, [])

  const confirm = useCallback(
    (options: ConfirmOptions) => open({ ...options, kind: 'confirm' }),
    [open],
  )
  const alert = useCallback(
    async (options: AlertOptions) => {
      await open({ ...options, kind: 'alert' })
    },
    [open],
  )
  const toast = useCallback((message: string) => {
    setToastMessage(message)
    void feedback.success()
  }, [])

  useEffect(() => {
    if (!toastMessage) return
    const timeout = setTimeout(() => setToastMessage(null), 3000)
    return () => clearTimeout(timeout)
  }, [toastMessage])

  useEffect(
    () => () => {
      resolveDialog.current?.(false)
    },
    [],
  )

  const api = useMemo(() => ({ confirm, alert, toast }), [confirm, alert, toast])

  useEffect(() => {
    activeFeedback = api
    return () => {
      if (activeFeedback === api) activeFeedback = null
    }
  }, [api])

  return (
    <FeedbackContext.Provider value={api}>
      <View style={styles.root}>
        {children}
        <AppToast message={toastMessage} />
        <AppDialog dialog={dialog} onClose={close} />
      </View>
    </FeedbackContext.Provider>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  dialogOverlay: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing.lg,
    backgroundColor: colors.backdrop,
  },
  dialogCard: {
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    ...elevation.md,
  },
  dialogIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dialogTitle: { ...typography.heading, color: colors.text },
  dialogMessage: { ...typography.body, color: colors.textMuted },
  dialogActions: { flexDirection: 'row', gap: spacing.sm },
  dialogAction: { flex: 1 },
  toast: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    zIndex: 100,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radius.md,
    padding: spacing.md,
    backgroundColor: `${colors.text}EB`,
    ...elevation.md,
  },
  toastText: { ...typography.body, color: colors.white, flex: 1 },
})
