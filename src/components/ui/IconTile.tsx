import { StyleSheet, View } from 'react-native'

import { Icon, type IconName } from '@/components/ui/Icon'
import { colors, phaseColors, radius } from '@/theme/tokens'

export function IconTile({
  icon,
  phase,
  size = 44,
}: {
  icon: IconName
  phase?: keyof typeof phaseColors
  size?: 36 | 44
}) {
  const foreground = phase ? phaseColors[phase].fg : colors.neutral
  const background = phase ? phaseColors[phase].bg : colors.neutralSoft
  return (
    <View style={[styles.tile, { width: size, height: size, backgroundColor: background }]}>
      <Icon name={icon} size={size === 36 ? 18 : 22} color={foreground} />
    </View>
  )
}

const styles = StyleSheet.create({
  tile: { borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
})
