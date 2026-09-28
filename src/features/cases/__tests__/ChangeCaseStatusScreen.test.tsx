import { fireEvent, render } from '@testing-library/react-native'

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
