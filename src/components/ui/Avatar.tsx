import { StyleSheet, Text, View } from 'react-native'

import { colors, fonts, radius, typography } from '@/theme/tokens'

const palette = [colors.primary, colors.purple, colors.success, colors.neutral] as const

export function avatarInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  return parts.length
    ? `${parts[0]?.[0] ?? ''}${parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : ''}`.toLocaleUpperCase(
        'es',
      )
    : '?'
}

export function avatarColor(id: string): string {
  let hash = 0
  for (const character of id) hash = (hash * 31 + character.charCodeAt(0)) >>> 0
  return palette[hash % palette.length] ?? colors.primary
}

export function Avatar({
  name,
  id,
  size = 44,
}: {
  name: string
  id: string
  size?: 24 | 28 | 44 | 72
}) {
  return (
    <View
      accessibilityLabel={name}
      style={[
        styles.avatar,
        { width: size, height: size, borderRadius: radius.pill, backgroundColor: avatarColor(id) },
      ]}
    >
      <Text style={[styles.initials, size <= 28 && styles.small, size === 72 && styles.large]}>
        {avatarInitials(name)}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  avatar: { alignItems: 'center', justifyContent: 'center' },
  initials: { ...typography.body, color: colors.white, fontFamily: fonts.extrabold },
  small: { ...typography.overline },
  large: { ...typography.display, color: colors.white },
})
