import { AppFeedback } from '@/components/feedback/AppFeedback'

export function confirmLogout(onConfirm: () => void) {
  AppFeedback.show('¿Cerrar sesión?', undefined, [
    { text: 'Cancelar', style: 'cancel' },
    { text: 'Cerrar sesión', style: 'destructive', onPress: onConfirm },
  ])
}
