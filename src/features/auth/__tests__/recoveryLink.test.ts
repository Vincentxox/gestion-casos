import { parseRecoveryLink } from '../recoveryLink'

test('acepta el enlace de recuperación con tokens', () => {
  const url = 'gestion-casos://auth/reset#access_token=a&refresh_token=r&type=recovery'
  expect(parseRecoveryLink(url)).toEqual({ type: 'valid', url })
})

test('detecta enlaces vencidos o sin tokens', () => {
  expect(parseRecoveryLink('gestion-casos://auth/reset#error_code=otp_expired')).toEqual({
    type: 'expired',
  })
  expect(parseRecoveryLink('gestion-casos://auth/reset#type=recovery')).toEqual({ type: 'expired' })
})

test('ignora Google y otros enlaces', () => {
  expect(
    parseRecoveryLink('gestion-casos://auth/callback#access_token=a&refresh_token=r'),
  ).toBeNull()
  expect(parseRecoveryLink('https://example.com/auth/reset#type=recovery')).toBeNull()
})
