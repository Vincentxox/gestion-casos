import { AppFeedback } from '@/components/feedback/AppFeedback'

import { confirmLogout } from '../confirmLogout'

test('solo cierra sesión tras la confirmación explícita', () => {
  const onConfirm = jest.fn()
  const alert = jest.spyOn(AppFeedback, 'show').mockImplementation(() => {})

  confirmLogout(onConfirm)

  expect(alert).toHaveBeenCalledWith('¿Cerrar sesión?', undefined, [
    { text: 'Cancelar', style: 'cancel' },
    { text: 'Cerrar sesión', style: 'destructive', onPress: onConfirm },
  ])
  expect(onConfirm).not.toHaveBeenCalled()
  const buttons = alert.mock.calls[0]?.[2]
  buttons?.[1]?.onPress?.()
  expect(onConfirm).toHaveBeenCalledTimes(1)
  alert.mockRestore()
})
