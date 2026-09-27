import { useNetInfo } from '@react-native-community/netinfo'
import { StyleSheet, Text, View } from 'react-native'

import { Icon } from '@/components/ui/Icon'
import { colors, radius, spacing, typography } from '@/theme/tokens'

export function OfflineBanner() {
  const network = useNetInfo()
  const online = network.isConnected === true && network.isInternetReachable !== false
  if (online || network.isConnected === null) return null

  return (
    <View accessibilityRole="alert" style={styles.banner}>
      <Icon name="cloud-offline-outline" size="inline" color={colors.warning} />
      <Text style={styles.text}>Sin conexión. Los cambios se enviarán al reconectar.</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
    backgroundColor: colors.warningSoft,
  },
  text: { ...typography.caption, color: colors.warning, flex: 1 },
})
