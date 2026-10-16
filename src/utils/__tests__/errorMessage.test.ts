import { getErrorMessage } from '../errorMessage'

const fallback = 'Comprueba tus permisos y la conexión.'

test('muestra el mensaje de negocio P0001 de PostgREST', () => {
  expect(
    getErrorMessage(
      { code: 'P0001', message: 'Reasigna primero sus trabajos abiertos: CAS-2026-00006' },
      fallback,
    ),
  ).toBe('Reasigna primero sus trabajos abiertos: CAS-2026-00006')
})

test.each(['42501', 'PGRST116'])('oculta el mensaje técnico %s', (code) => {
  expect(getErrorMessage({ code, message: 'technical database error' }, fallback)).toBe(fallback)
})

test('conserva el mensaje de una instancia de Error', () => {
  expect(getErrorMessage(new Error('Error del servicio'), fallback)).toBe('Error del servicio')
})

test('usa el texto de respaldo para otros valores', () => {
  expect(getErrorMessage({ message: 'No comprobado' }, fallback)).toBe(fallback)
  expect(getErrorMessage(null, fallback)).toBe(fallback)
})
