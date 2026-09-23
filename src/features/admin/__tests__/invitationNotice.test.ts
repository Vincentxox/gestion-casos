import { formatInvitationNotice } from '../invitationNotice'

describe('formatInvitationNotice', () => {
  const invitation = {
    organizationName: ' Organización inicial ',
    role: 'tecnico' as const,
    email: ' PRUEBA@EJEMPLO.COM ',
  }

  it('incluye empresa, rol, correo y pasos sin divulgar el código de empresa', () => {
    const message = formatInvitationNotice({ ...invitation, downloadUrl: '' })

    expect(message).toContain('Organización inicial')
    expect(message).toContain('Técnico')
    expect(message).toContain('prueba@ejemplo.com')
    expect(message).toContain('confirma ese correo')
    expect(message).toContain('Comprobar acceso')
    expect(message).not.toContain('Descarga la app:')
    expect(message).not.toMatch(/[A-Z0-9]{4}-[A-Z0-9]{4}/)
  })

  it('añade el enlace solo si está configurado', () => {
    const message = formatInvitationNotice({
      ...invitation,
      downloadUrl: ' https://ejemplo.com/nexo-casos ',
    })

    expect(message).toContain('Descarga la app: https://ejemplo.com/nexo-casos')
  })
})
