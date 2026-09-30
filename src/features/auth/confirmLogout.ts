import { AppFeedback } from '@/components/feedback/AppFeedback'

export function confirmLogout(onConfirm: () => void) {
  AppFeedback.show(
    '¿Cerrar sesión?',
    'Tendrás que volver a ingresar con tu cuenta para ver tus solicitudes.',
    [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Cerrar sesión', style: 'destructive', onPress: onConfirm },
    ],
  )
}
