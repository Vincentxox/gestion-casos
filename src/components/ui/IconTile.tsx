import { StyleSheet, View } from 'react-native'

import { Icon, type IconName } from '@/components/ui/Icon'
import { colors, phaseColors, radius } from '@/theme/tokens'

export function IconTile({
  icon,
  phase,
  size = 40,
  backgroundColor,
  iconColor,
}: {
  icon: IconName
  phase?: keyof typeof phaseColors
  size?: 36 | 40 | 44
  backgroundColor?: string
  iconColor?: string
}) {
  const foreground = iconColor ?? (phase ? phaseColors[phase].fg : colors.neutral)
  const background = backgroundColor ?? (phase ? phaseColors[phase].bg : colors.surface)
  return (
    <View style={[styles.tile, { width: size, height: size, backgroundColor: background }]}>
      <Icon name={icon} size={size === 36 ? 18 : 22} color={foreground} />
    </View>
  )
}

const styles = StyleSheet.create({
  tile: { borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
})
