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
import { colors, elevation, fonts, radius, spacing, tone, typography } from '@/theme/tokens'

export type DialogTone = 'info' | 'success' | 'warning' | 'error' | 'danger'
type ToastTone = 'success' | 'info'

type ConfirmOptions = {
  title: string
  confirmLabel?: string
  cancelLabel?: string
  icon?: IconName
} & (
  { tone: 'danger'; message: string } | { tone?: Exclude<DialogTone, 'danger'>; message?: string }
)

interface AlertOptions {
  title: string
  message?: string
  tone?: DialogTone
  icon?: IconName
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

type ShowOptions = { tone: DialogTone; icon?: IconName }

let activeFeedback: FeedbackApi | null = null

/** Adaptador para los mensajes existentes mientras todos usan el diálogo de la app. */
export const AppFeedback = {
  show(
    title: string,
    message?: string,
    actionsOrOptions?: FeedbackAction[] | ShowOptions,
    explicitOptions?: ShowOptions,
  ) {
    if (!activeFeedback) return
    const actions = Array.isArray(actionsOrOptions) ? actionsOrOptions : undefined
    const options = Array.isArray(actionsOrOptions) ? explicitOptions : actionsOrOptions
    if (!actions?.length) {
      void activeFeedback.alert({
        title,
        message,
        tone: options?.tone ?? 'info',
        icon: options?.icon,
      })
      return
    }
    const affirmative = actions.find((action) => action.style !== 'cancel')
    const cancel = actions.find((action) => action.style === 'cancel')
    if (!affirmative) {
      void activeFeedback.alert({
        title,
        message,
        tone: options?.tone ?? 'info',
        icon: options?.icon,
      })
      return
    }
    if (!cancel) {
      void activeFeedback
        .alert({ title, message, tone: options?.tone ?? 'info', icon: options?.icon })
        .then(() => affirmative.onPress?.())
      return
    }
    const confirmOptions: ConfirmOptions =
      affirmative.style === 'destructive' || options?.tone === 'danger'
        ? {
            title,
            message: message ?? '¿Deseas continuar?',
            confirmLabel: affirmative.text,
            cancelLabel: cancel.text,
            tone: 'danger',
            icon: options?.icon,
          }
        : {
            title,
            message,
            confirmLabel: affirmative.text,
            cancelLabel: cancel.text,
            tone: options?.tone ?? 'info',
            icon: options?.icon,
          }
    void activeFeedback.confirm(confirmOptions).then((confirmed) => {
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
const DialogOpenContext = createContext(false)

export function useFeedbackDialogOpen() {
  return useContext(DialogOpenContext)
}

export function useFeedback(): FeedbackApi {
  const context = useContext(FeedbackContext)
  if (!context) throw new Error('AppFeedbackProvider no está disponible')
  return context
}

const toneMeta: Record<DialogTone, { icon: IconName; color: string; background: string }> = {
  info: {
    icon: 'information-circle-outline',
    color: tone.info.text,
    background: tone.info.bg,
  },
  warning: { icon: 'warning-outline', color: tone.warning.text, background: tone.warning.bg },
  success: {
    icon: 'checkmark-circle-outline',
    color: tone.success.text,
    background: tone.success.bg,
  },
  error: { icon: 'close-circle-outline', color: tone.danger.text, background: tone.danger.bg },
  danger: { icon: 'alert-circle-outline', color: tone.danger.text, background: tone.danger.bg },
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
            <View
              testID="app-dialog-icon"
              style={[styles.dialogIcon, { backgroundColor: meta.background }]}
            >
              <Icon name={dialog.icon ?? meta.icon} color={meta.color} size="base" />
            </View>
            <Text accessibilityRole="header" style={styles.dialogTitle}>
              {dialog.title}
            </Text>
            {dialog.message ? <Text style={styles.dialogMessage}>{dialog.message}</Text> : null}
            <View style={styles.dialogActions} testID="app-dialog-actions">
              <Button
                label={
                  dialog.kind === 'confirm' ? (dialog.confirmLabel ?? 'Confirmar') : 'Entendido'
                }
                onPress={() => onClose(true)}
                variant={tone === 'danger' ? 'destructive' : 'primary'}
              />
              {dialog.kind === 'confirm' ? (
                <Button
                  label={dialog.cancelLabel ?? 'Cancelar'}
                  onPress={() => onClose(false)}
                  variant="secondary"
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
      pointerEvents="box-none"
      style={[styles.toastLayer, { top: insets.top + spacing.sm }]}
      testID="app-toast"
    >
      <View style={styles.toast}>
        <View
          testID="app-toast-icon"
          style={[styles.toastIcon, value.tone === 'info' && styles.toastIconInfo]}
        >
          <Icon
            name={value.tone === 'success' ? 'checkmark' : 'information'}
            color={colors.white}
            size="inline"
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
          <Icon name="close" color={colors.white} size="inline" />
        </Pressable>
      </View>
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
      <DialogOpenContext.Provider value={dialog !== null}>
        <View style={styles.root}>
          {children}
          <AppToast value={toastValue} onClose={() => setToastValue(null)} />
          <AppDialog dialog={dialog} onClose={close} />
        </View>
      </DialogOpenContext.Provider>
    </FeedbackContext.Provider>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  dialogOverlay: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing.roomy,
    backgroundColor: colors.modalBackdrop,
  },
  dialogCard: {
    width: '100%',
    maxWidth: 360,
    alignSelf: 'center',
    alignItems: 'center',
    gap: spacing.base,
    padding: spacing.lg,
    borderRadius: radius.sheet,
    backgroundColor: colors.surface,
  },
  dialogIcon: {
    width: 48,
    height: 48,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dialogTitle: {
    ...typography.title,
    fontFamily: fonts.extrabold,
    color: colors.ink,
    textAlign: 'center',
  },
  dialogMessage: { ...typography.body, color: colors.textMuted, textAlign: 'center' },
  dialogActions: { width: '100%', flexDirection: 'column', gap: spacing.sm, marginTop: spacing.xs },
  toastLayer: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    zIndex: 100,
    alignItems: 'center',
  },
  toast: {
    maxWidth: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radius.pill,
    paddingVertical: spacing.xs,
    paddingLeft: spacing.sm,
    backgroundColor: colors.toastBg,
    ...elevation.md,
  },
  toastIcon: {
    width: 30,
    height: 30,
    borderRadius: radius.pill,
    backgroundColor: tone.success.text,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toastIconInfo: { backgroundColor: colors.primary },
  toastClose: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toastText: { ...typography.body, fontFamily: fonts.bold, color: colors.white, flexShrink: 1 },
})
