import { z } from 'zod'

const email = z
  .string()
  .trim()
  .min(1, 'El correo electrónico es obligatorio')
  .email('Ingresa un correo electrónico válido')

const password = z
  .string()
  .min(8, 'La contraseña debe tener al menos 8 caracteres')
  .regex(/[A-Z]/, 'La contraseña debe incluir una letra mayúscula')
  .regex(/[0-9]/, 'La contraseña debe incluir un número')
  .regex(/[^A-Za-z0-9]/, 'La contraseña debe incluir un carácter especial')

export const loginSchema = z.object({
  email,
  password: z.string().min(1, 'La contraseña es obligatoria'),
})

export const registrationSchema = z
  .object({
    fullName: z.string().trim().min(2, 'Ingresa tu nombre completo'),
    email,
    password,
    passwordConfirmation: z.string().min(1, 'Confirma tu contraseña'),
  })
  .refine((values) => values.password === values.passwordConfirmation, {
    message: 'Las contraseñas no coinciden',
    path: ['passwordConfirmation'],
  })

export type LoginInput = z.infer<typeof loginSchema>
export type RegistrationInput = z.infer<typeof registrationSchema>
