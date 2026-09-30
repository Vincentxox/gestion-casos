import { fireEvent, render, waitFor } from '@testing-library/react-native'

import { AppFeedback } from '@/components/feedback/AppFeedback'

import { ChangeCaseStatusScreen } from '../screens/ChangeCaseStatusScreen'

jest.mock('@/store/authStore', () => ({
  useAuthStore: () => ({ id: 'chief', role: 'jefe_area' }),
}))
jest.mock('../casePermissions', () => ({
  getAvailableCaseActions: () => ['rechazar', 'aceptar'],
}))
jest.mock('../useCases', () => ({
  useCaseDetail: () => ({ data: { status: 'solicitado' }, isLoading: false, error: null }),
  useChangeCaseStatus: () => ({ mutateAsync: jest.fn(), isPending: false }),
}))

test('limpia el error del motivo al cambiar de Rechazar a Aceptar', async () => {
  const props = {
    navigation: { goBack: jest.fn() },
    route: { params: { caseId: 'case', action: 'rechazar' } },
  } as unknown as Parameters<typeof ChangeCaseStatusScreen>[0]
  const screen = await render(<ChangeCaseStatusScreen {...props} />)

  await fireEvent.press(screen.getByRole('button', { name: 'Confirmar: Rechazar solicitud' }))
  expect(screen.getByText('Explica el motivo con al menos 3 caracteres.')).toBeTruthy()

  await fireEvent.press(screen.getByText('Aceptar solicitud'))
  expect(screen.queryByText('Explica el motivo con al menos 3 caracteres.')).toBeNull()
})

test('muestra el mensaje de la acción aceptada, no uno genérico', async () => {
  const toast = jest.spyOn(AppFeedback, 'toast').mockImplementation(() => {})
  const props = {
    navigation: { goBack: jest.fn() },
    route: { params: { caseId: 'case', action: 'aceptar' } },
  } as unknown as Parameters<typeof ChangeCaseStatusScreen>[0]
  const screen = await render(<ChangeCaseStatusScreen {...props} />)

  await fireEvent.press(screen.getByRole('button', { name: 'Confirmar: Aceptar solicitud' }))
  await waitFor(() => expect(toast).toHaveBeenCalledWith('Solicitud aceptada', { tone: 'success' }))
  toast.mockRestore()
})
