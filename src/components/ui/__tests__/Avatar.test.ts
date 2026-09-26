import { avatarColor, avatarInitials } from '../Avatar'

describe('Avatar', () => {
  it('muestra iniciales de nombre y apellido', () => {
    expect(avatarInitials('  María   Pérez López ')).toBe('ML')
    expect(avatarInitials('')).toBe('?')
  })

  it('mantiene un color estable para la misma persona', () => {
    expect(avatarColor('user-1')).toBe(avatarColor('user-1'))
    expect(avatarColor('user-1')).toMatch(/^#[0-9A-F]{6}$/i)
  })
})
