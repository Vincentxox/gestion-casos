import { Ionicons } from '@expo/vector-icons'
import type { ComponentProps } from 'react'

import { colors, iconSize } from '@/theme/tokens'

export type IconName = ComponentProps<typeof Ionicons>['name']

export function Icon({
  name,
  size = 'base',
  color = colors.text,
  label,
}: {
  name: IconName
  size?: keyof typeof iconSize | number
  color?: string
  label?: string
}) {
  return (
    <Ionicons
      accessible={Boolean(label)}
      accessibilityLabel={label}
      accessibilityElementsHidden={!label}
      importantForAccessibility={label ? 'auto' : 'no'}
      name={name}
      size={typeof size === 'number' ? size : iconSize[size]}
      color={color}
    />
  )
}
