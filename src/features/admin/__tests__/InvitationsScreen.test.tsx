import { fireEvent, render, waitFor } from '@testing-library/react-native'
import { Alert, Share } from 'react-native'

import { InvitationsScreen } from '../screens/InvitationsScreen'

const mockCreate = jest.fn().mockResolvedValue(undefined)

jest.mock('@/store/authStore', () => ({
  useAuthStore: (selector: (state: unknown) => unknown) =>
    selector({ profile: { organizationName: 'Empresa de prueba' } }),
}))
jest.mock('@/features/areas/useAreas', () => ({
  useAreas: () => ({ data: [], isLoading: false }),
}))
jest.mock('../useInvitations', () => ({
  useInvitations: () => ({
    data: [
      {
        id: 'invitation-1',
        email: 'persona@example.com',
        role: 'solicitante',
        acceptedAt: null,
        revokedAt: null,
      },
    ],
    isLoading: false,
    error: null,
  }),
  useCreateInvitation: () => ({ mutateAsync: mockCreate, isPending: false }),
  useRevokeInvitation: () => ({ mutateAsync: jest.fn() }),
}))

test('comparte una invitación pendiente sin código de empresa', async () => {
  const share = jest.spyOn(Share, 'share').mockResolvedValue({ action: Share.sharedAction })
  const screen = await render(<InvitationsScreen />)

  await fireEvent.press(
    screen.getByLabelText('Compartir aviso de invitación con persona@example.com'),
  )

  await waitFor(() => expect(share).toHaveBeenCalledTimes(1))
  const content = share.mock.calls[0]?.[0]
  expect(content?.message).toContain('Empresa de prueba')
  expect(content?.message).toContain('persona@example.com')
  expect(content?.message).not.toMatch(/[A-Z0-9]{4}-[A-Z0-9]{4}/)
  share.mockRestore()
})

test('ofrece compartir el aviso después de guardar la invitación', async () => {
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(jest.fn())
  const share = jest.spyOn(Share, 'share').mockResolvedValue({ action: Share.sharedAction })
  const screen = await render(<InvitationsScreen />)

  await fireEvent.changeText(screen.getByLabelText('Correo electrónico'), 'nuevo@example.com')
  await fireEvent.press(screen.getByText('Crear invitación'))

  await waitFor(() =>
    expect(mockCreate).toHaveBeenCalledWith({
      email: 'nuevo@example.com',
      role: 'solicitante',
      areaId: null,
    }),
  )
  const actions = alert.mock.calls.find(([title]) => title === 'Invitación creada')?.[2]
  expect(actions?.map((item) => item.text)).toContain('Compartir aviso')
  actions?.find((item) => item.text === 'Compartir aviso')?.onPress?.()

  await waitFor(() => expect(share).toHaveBeenCalledTimes(1))
  expect(share.mock.calls[0]?.[0].message).toContain('nuevo@example.com')
  alert.mockRestore()
  share.mockRestore()
})
