import { ActivityIndicator, StyleSheet, Text, View } from 'react-native'

import { colors, spacing, typography } from '@/theme/tokens'

export function AuthLoadingScreen() {
  return (
    <View accessibilityLiveRegion="polite" style={styles.container}>
      <ActivityIndicator color={colors.primary} size="large" />
      <Text style={styles.text}>Verificando sesión segura…</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    backgroundColor: colors.background,
  },
  text: {
    color: colors.textMuted,
    ...typography.body,
  },
})
