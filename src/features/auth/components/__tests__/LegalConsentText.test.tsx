import { fireEvent, render } from '@testing-library/react-native'
import { Linking } from 'react-native'

import { PRIVACY_POLICY_URL, TERMS_URL } from '@/config/legalLinks'

import { LegalConsentText } from '../LegalConsentText'

afterEach(() => jest.restoreAllMocks())

test.each([
  ['register', 'Al crear tu cuenta aceptas los '],
  ['google', 'Al continuar con Google aceptas los '],
] as const)('muestra el texto legal de %s y abre ambos enlaces', async (action, prefix) => {
  const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined)
  const screen = await render(<LegalConsentText action={action} />)

  expect(screen.getByTestId('legal-consent-copy').props.children[0]).toBe(prefix)
  await fireEvent.press(screen.getByRole('link', { name: 'Abrir términos y condiciones' }))
  await fireEvent.press(screen.getByRole('link', { name: 'Abrir política de privacidad' }))

  expect(openURL).toHaveBeenNthCalledWith(1, TERMS_URL)
  expect(openURL).toHaveBeenNthCalledWith(2, PRIVACY_POLICY_URL)
})
