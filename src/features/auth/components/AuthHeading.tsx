import type { ReactNode } from 'react'
import { StyleSheet, Text, View } from 'react-native'

import { NexoLogo } from '@/components/branding/NexoLogo'
import { colors, fonts, spacing, typography } from '@/theme/tokens'

/** Logo con el nombre «nexo casos», arriba de las pantallas de acceso. */
export function AuthBrand() {
  return (
    <View accessibilityLabel="Nexo Casos" accessible style={styles.brand}>
      <NexoLogo size={48} check />
      <View>
        <Text style={styles.wordmark}>nexo</Text>
        <Text style={styles.wordmarkSub}>casos</Text>
      </View>
    </View>
  )
}

/** Título grande y explicación de las pantallas de acceso. */
export function AuthHeading({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <View style={styles.heading}>
      <Text accessibilityRole="header" style={styles.title}>
        {title}
      </Text>
      {children ? <Text style={styles.subtitle}>{children}</Text> : null}
    </View>
  )
}

const styles = StyleSheet.create({
  brand: { flexDirection: 'row', alignItems: 'center', gap: spacing.base },
  wordmark: {
    fontFamily: fonts.extrabold,
    fontSize: 26,
    lineHeight: 28,
    letterSpacing: -0.8,
    color: colors.ink,
  },
  wordmarkSub: {
    fontFamily: fonts.semibold,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 3,
    textTransform: 'uppercase',
    color: colors.primary,
  },
  heading: { gap: spacing.sm },
  title: {
    ...typography.display,
    color: colors.ink,
  },
  subtitle: { ...typography.body, fontSize: 16, lineHeight: 23, color: colors.textMuted },
})
