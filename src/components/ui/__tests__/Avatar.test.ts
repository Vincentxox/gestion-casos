import { render } from '@testing-library/react-native'
import { createElement } from 'react'

import { colors } from '@/theme/tokens'

import { Avatar, avatarColor, avatarInitials } from '../Avatar'

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
})
