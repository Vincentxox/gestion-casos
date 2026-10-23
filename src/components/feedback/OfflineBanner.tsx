import { useNetInfo } from '@react-native-community/netinfo'
import { StyleSheet, Text, View } from 'react-native'

import { colors, fonts, radius, spacing, typography } from '@/theme/tokens'

export function OfflineBanner({ message }: { message?: string }) {
  const network = useNetInfo()
  const online = network.isConnected === true && network.isInternetReachable !== false
  if (online || network.isConnected === null) return null

  return (
    <View accessibilityRole="alert" style={styles.banner}>
      <Text style={styles.title}>{message ?? 'Sin conexión'}</Text>
      <View accessibilityElementsHidden importantForAccessibility="no" style={styles.line}>
        <View style={styles.start} />
        <View style={styles.progress} />
        <View style={styles.rest} />
        <View style={styles.end} />
      </View>
      {!message ? <Text style={styles.text}>Los cambios se enviarán al reconectar.</Text> : null}
    </View>
  )
}

const styles = StyleSheet.create({
  banner: { gap: spacing.sm, paddingVertical: spacing.sm },
  title: { ...typography.body, fontFamily: fonts.bold, color: colors.text },
  line: { flexDirection: 'row', alignItems: 'center' },
  start: { width: 12, height: 12, borderRadius: radius.pill, backgroundColor: colors.ink },
  progress: { flex: 1, height: 4, marginHorizontal: -1, backgroundColor: colors.warning },
  rest: { flex: 2, height: 4, backgroundColor: colors.track },
  end: {
    width: 12,
    height: 12,
    borderRadius: radius.pill,
    borderWidth: 3,
    borderColor: colors.track,
    backgroundColor: colors.surface,
  },
  text: { ...typography.caption, color: colors.textMuted },
})
