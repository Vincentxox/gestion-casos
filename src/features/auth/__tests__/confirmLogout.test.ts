import { AppFeedback } from '@/components/feedback/AppFeedback'

import { confirmLogout } from '../confirmLogout'

test('solo cierra sesión tras la confirmación explícita', () => {
  const onConfirm = jest.fn()
  const alert = jest.spyOn(AppFeedback, 'show').mockImplementation(() => {})

  confirmLogout(onConfirm)

  expect(alert).toHaveBeenCalledWith(
    '¿Cerrar sesión?',
    'Tendrás que volver a ingresar con tu cuenta para ver tus solicitudes.',
    [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Cerrar sesión', style: 'destructive', onPress: onConfirm },
    ],
    { tone: 'danger', icon: 'log-out-outline' },
  )
  expect(onConfirm).not.toHaveBeenCalled()
  const buttons = alert.mock.calls[0]?.[2]
  if (!Array.isArray(buttons)) throw new Error('Faltan acciones de confirmación')
  buttons[1]?.onPress?.()
  expect(onConfirm).toHaveBeenCalledTimes(1)
  alert.mockRestore()
})
