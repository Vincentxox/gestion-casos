import { Alert } from 'react-native'

export function confirmLogout(onConfirm: () => void) {
  Alert.alert('¿Cerrar sesión?', undefined, [
    { text: 'Cancelar', style: 'cancel' },
    { text: 'Cerrar sesión', style: 'destructive', onPress: onConfirm },
  ])
}
