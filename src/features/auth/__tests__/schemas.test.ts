import { loginSchema, registrationSchema } from '../schemas'

describe('esquemas de autenticación', () => {
  test('acepta credenciales de inicio de sesión completas', () => {
    expect(
      loginSchema.safeParse({
        email: 'usuario@example.com',
        password: 'cualquier-valor',
      }).success,
    ).toBe(true)
  })

  test('rechaza un correo electrónico inválido', () => {
    const result = loginSchema.safeParse({
      email: 'correo-invalido',
      password: 'cualquier-valor',
    })

    expect(result.success).toBe(false)
  })

  test.each([
    ['menos de ocho caracteres', 'Aa1!'],
    ['sin mayúscula', 'password1!'],
    ['sin número', 'Password!'],
    ['sin carácter especial', 'Password1'],
  ])('rechaza una contraseña %s', (_caseName, password) => {
    const result = registrationSchema.safeParse({
      fullName: 'Usuario de Prueba',
      email: 'usuario@example.com',
      password,
      passwordConfirmation: password,
    })

    expect(result.success).toBe(false)
  })

  test('rechaza contraseñas que no coinciden', () => {
    const result = registrationSchema.safeParse({
      fullName: 'Usuario de Prueba',
      email: 'usuario@example.com',
      password: 'Password1!',
      passwordConfirmation: 'Password2!',
    })

    expect(result.success).toBe(false)
  })

  test('acepta un registro válido', () => {
    const result = registrationSchema.safeParse({
      fullName: 'Usuario de Prueba',
      email: 'USUARIO@EXAMPLE.COM',
      password: 'Password1!',
      passwordConfirmation: 'Password1!',
    })

    expect(result.success).toBe(true)
  })
})
