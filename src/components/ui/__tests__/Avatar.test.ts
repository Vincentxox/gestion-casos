import { act, render } from '@testing-library/react-native'
import { createElement } from 'react'

import { colors } from '@/theme/tokens'

import { Avatar, avatarColor, avatarInitials } from '../Avatar'
import { useSignedProfilePhoto } from '@/features/settings/useSignedProfilePhoto'

jest.mock('@/features/settings/useSignedProfilePhoto', () => ({ useSignedProfilePhoto: jest.fn() }))

describe('Avatar', () => {
  it('muestra iniciales de nombre y apellido', () => {
    expect(avatarInitials('  María   Pérez López ')).toBe('ML')
    expect(avatarInitials('')).toBe('?')
  })

  it('mantiene un color estable para la misma persona', () => {
    expect(avatarColor('user-1')).toBe(avatarColor('user-1'))
    expect(avatarColor('user-1')).toMatch(/^#[0-9A-F]{6}$/i)
  })

  it('muestra al responsable actual con avatar neutro', async () => {
    const screen = await render(
      createElement(Avatar, { name: 'Ana', id: 'user-1', tone: 'neutral' }),
    )
    expect(screen.getByLabelText('Ana').props.style).toEqual(
      expect.arrayContaining([expect.objectContaining({ backgroundColor: colors.neutral })]),
    )
  })

  it('muestra la foto firmada y vuelve a las iniciales si la imagen falla', async () => {
    ;(useSignedProfilePhoto as jest.Mock).mockReturnValue({ data: 'https://foto-firmada' })
    const screen = await render(
      createElement(Avatar, { name: 'Ana López', id: 'u1', avatarPath: 'org/u1/foto.jpg' }),
    )
    const photo = screen.getByTestId('avatar-photo')
    expect(photo.props.source).toEqual([
      { uri: 'https://foto-firmada', cacheKey: 'org/u1/foto.jpg' },
    ])
    await act(async () => photo.props.onError({ nativeEvent: { error: 'imagen no disponible' } }))
    expect(screen.queryByTestId('avatar-photo')).toBeNull()
    expect(screen.getByText('AL')).toBeTruthy()
  })

  it('mantiene la clave de caché al renovarse el enlace firmado', async () => {
    ;(useSignedProfilePhoto as jest.Mock).mockReturnValue({ data: 'https://foto-firmada-1' })
    const props = { name: 'Ana López', id: 'u1', avatarPath: 'org/u1/foto.jpg' }
    const screen = await render(createElement(Avatar, props))
    expect(screen.getByTestId('avatar-photo').props.source).toEqual([
      { uri: 'https://foto-firmada-1', cacheKey: props.avatarPath },
    ])

    ;(useSignedProfilePhoto as jest.Mock).mockReturnValue({ data: 'https://foto-firmada-2' })
    await act(async () => screen.rerender(createElement(Avatar, props)))
    expect(screen.getByTestId('avatar-photo').props.source).toEqual([
      { uri: 'https://foto-firmada-2', cacheKey: props.avatarPath },
    ])
  })

  it('muestra iniciales si no puede firmar el enlace', async () => {
    ;(useSignedProfilePhoto as jest.Mock).mockReturnValue({ data: undefined, isError: true })
    const screen = await render(
      createElement(Avatar, { name: 'Ana López', id: 'u1', avatarPath: 'org/u1/foto.jpg' }),
    )
    expect(screen.getByText('AL')).toBeTruthy()
  })
})
