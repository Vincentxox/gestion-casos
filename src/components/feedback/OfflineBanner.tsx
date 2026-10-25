import { useNetInfo } from '@react-native-community/netinfo'
import { StyleSheet, Text, View } from 'react-native'

import { Icon } from '@/components/ui/Icon'
import { colors, fonts, radius, spacing, tone, typography } from '@/theme/tokens'

export function OfflineBanner({ message }: { message?: string }) {
  const network = useNetInfo()
  const online = network.isConnected === true && network.isInternetReachable !== false
  if (online || network.isConnected === null) return null

  return (
    <View accessibilityRole="alert" style={styles.banner}>
      <View style={styles.titleRow}>
        <Icon name="cloud-offline-outline" color={tone.warning.text} size={22} />
        <Text style={styles.title}>Sin conexión</Text>
      </View>
      <Text style={styles.text}>{message ?? 'Los cambios se enviarán al reconectar.'}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  banner: {
    gap: spacing.xs,
    padding: spacing.md,
    borderWidth: 1,
    borderRadius: radius.lg,
    borderColor: tone.warning.border,
    backgroundColor: tone.warning.bg,
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  title: { ...typography.body, fontFamily: fonts.bold, color: tone.warning.text, flexShrink: 1 },
  text: { ...typography.caption, color: colors.textMuted },
})
