import { Linking, StyleSheet, Text } from 'react-native'

import { PRIVACY_POLICY_URL, TERMS_URL } from '@/config/legalLinks'
import { colors, fonts } from '@/theme/tokens'

export function LegalConsentText({ action }: { action: 'register' | 'google' }) {
  return (
    <Text style={styles.copy} testID="legal-consent-copy">
      {action === 'register'
        ? 'Al crear tu cuenta aceptas los '
        : 'Al continuar con Google aceptas los '}
      <Text
        accessibilityLabel="Abrir términos y condiciones"
        accessibilityRole="link"
        onPress={() => void Linking.openURL(TERMS_URL)}
        style={styles.link}
      >
        Términos y condiciones
      </Text>
      {' y la '}
      <Text
        accessibilityLabel="Abrir política de privacidad"
        accessibilityRole="link"
        onPress={() => void Linking.openURL(PRIVACY_POLICY_URL)}
        style={styles.link}
      >
        Política de privacidad
      </Text>
      {'.'}
    </Text>
  )
}

const styles = StyleSheet.create({
  copy: {
    color: colors.textMuted,
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
  },
  link: {
    color: colors.primary,
    fontFamily: fonts.semibold,
    textDecorationLine: 'underline',
  },
})
