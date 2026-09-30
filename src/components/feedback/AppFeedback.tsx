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
type ToastTone = 'success' | 'info'

type ConfirmOptions = {
  title: string
  confirmLabel?: string
  cancelLabel?: string
} & ({ tone: 'danger'; message: string } | { tone?: 'info' | 'warning'; message?: string })

interface AlertOptions {
  title: string
  message?: string
  tone?: DialogTone
}

interface FeedbackApi {
  confirm: (options: ConfirmOptions) => Promise<boolean>
  alert: (options: AlertOptions) => Promise<void>
  toast: (message: string, options?: { tone?: ToastTone }) => void
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
    const options: ConfirmOptions =
      affirmative.style === 'destructive'
        ? {
            title,
            message: message ?? '¿Deseas continuar?',
            confirmLabel: affirmative.text,
            cancelLabel: cancel.text,
            tone: 'danger',
          }
        : { title, message, confirmLabel: affirmative.text, cancelLabel: cancel.text, tone: 'info' }
    void activeFeedback.confirm(options).then((confirmed) => {
      if (confirmed) affirmative.onPress?.()
      else cancel.onPress?.()
    })
  },
  toast(message: string, options?: { tone?: ToastTone }) {
    activeFeedback?.toast(message, options)
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
  const stacked =
    dialog?.kind === 'confirm' &&
    ((dialog.cancelLabel ?? 'Cancelar').length > 14 ||
      (dialog.confirmLabel ?? 'Confirmar').length > 14)

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
              <Icon name={meta.icon} color={meta.color} size={28} />
            </View>
            <Text accessibilityRole="header" style={styles.dialogTitle}>
              {dialog.title}
            </Text>
            {dialog.message ? <Text style={styles.dialogMessage}>{dialog.message}</Text> : null}
            <View
              style={[
                styles.dialogActions,
                stacked ? styles.dialogActionsStacked : styles.dialogActionsRow,
              ]}
              testID="app-dialog-actions"
            >
              {stacked ? (
                <Button
                  label={dialog.confirmLabel ?? 'Confirmar'}
                  onPress={() => onClose(true)}
                  containerStyle={styles.dialogActionFullWidth}
                  variant={tone === 'danger' ? 'destructive' : 'primary'}
                />
              ) : null}
              {dialog.kind === 'confirm' ? (
                <Button
                  label={dialog.cancelLabel ?? 'Cancelar'}
                  onPress={() => onClose(false)}
                  containerStyle={stacked ? styles.dialogActionFullWidth : styles.dialogAction}
                  variant="secondary"
                />
              ) : null}
              {!stacked ? (
                <Button
                  label={
                    dialog.kind === 'confirm' ? (dialog.confirmLabel ?? 'Confirmar') : 'Entendido'
                  }
                  onPress={() => onClose(true)}
                  containerStyle={styles.dialogAction}
                  variant={tone === 'danger' ? 'destructive' : 'primary'}
                />
              ) : null}
            </View>
          </View>
        ) : null}
      </View>
    </Modal>
  )
}

function AppToast({
  value,
  onClose,
}: {
  value: { message: string; tone: ToastTone } | null
  onClose: () => void
}) {
  const insets = useSafeAreaInsets()
  if (!value) return null

  return (
    <View
      accessibilityLiveRegion="polite"
      style={[styles.toast, { top: insets.top + spacing.xl * 4 }]}
      testID="app-toast"
    >
      <View style={styles.toastIcon}>
        <Icon
          name={value.tone === 'success' ? 'checkmark' : 'information-circle-outline'}
          color={value.tone === 'success' ? '#6EE7A0' : '#93C5FD'}
          size="base"
        />
      </View>
      <Text style={styles.toastText}>{value.message}</Text>
      <Pressable
        accessibilityLabel="Cerrar aviso"
        accessibilityRole="button"
        hitSlop={0}
        onPress={onClose}
        style={styles.toastClose}
      >
        <Icon name="close" color={colors.white} size="base" />
      </Pressable>
    </View>
  )
}

export function AppFeedbackProvider({ children }: { children: ReactNode }) {
  const [dialog, setDialog] = useState<DialogState | null>(null)
  const [toastValue, setToastValue] = useState<{ message: string; tone: ToastTone } | null>(null)
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
  const toast = useCallback((message: string, options?: { tone?: ToastTone }) => {
    setToastValue({ message, tone: options?.tone ?? 'success' })
    void feedback.success()
  }, [])

  useEffect(() => {
    if (!toastValue) return
    const timeout = setTimeout(
      () => setToastValue(null),
      toastValue.message.length > 40 ? 4000 : 3000,
    )
    return () => clearTimeout(timeout)
  }, [toastValue])

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
        <AppToast value={toastValue} onClose={() => setToastValue(null)} />
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
    backgroundColor: colors.modalBackdrop,
  },
  dialogCard: {
    width: '100%',
    maxWidth: 342,
    alignSelf: 'center',
    alignItems: 'center',
    gap: spacing.md,
    paddingTop: spacing.roomy,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    borderRadius: radius.xl,
    backgroundColor: colors.surface,
    ...elevation.md,
  },
  dialogIcon: {
    width: 56,
    height: 56,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dialogTitle: {
    fontFamily: typography.title.fontFamily,
    fontSize: 19,
    lineHeight: 25,
    color: colors.text,
    textAlign: 'center',
  },
  dialogMessage: { ...typography.body, color: colors.textMuted, textAlign: 'center' },
  dialogActions: { alignSelf: 'stretch', gap: spacing.sm },
  dialogActionsRow: { flexDirection: 'row' },
  dialogActionsStacked: { flexDirection: 'column', alignSelf: 'stretch' },
  dialogAction: { flex: 1 },
  dialogActionFullWidth: { alignSelf: 'stretch' },
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
    backgroundColor: colors.text,
    ...elevation.md,
  },
  toastIcon: {
    width: 32,
    height: 32,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  toastClose: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toastText: { ...typography.body, color: colors.white, flex: 1 },
})
