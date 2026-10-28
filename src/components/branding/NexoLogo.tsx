import Svg, { Circle, Path } from 'react-native-svg'

import { colors } from '@/theme/tokens'

/** Logo simplificado: la N une a quien pide (punto marino) con el trabajo resuelto (círculo celeste). */
export function NexoLogo({
  size = 40,
  variant = 'color',
  check = false,
}: {
  size?: number
  variant?: 'color' | 'onDark'
  check?: boolean
}) {
  const stem = variant === 'onDark' ? colors.white : colors.ink
  const diagonal = variant === 'onDark' ? '#4FA3FF' : colors.primary
  const sky = variant === 'onDark' ? '#38C0F5' : colors.sky
  return (
    <Svg accessible={false} width={size} height={size} viewBox="0 0 40 40">
      <Path d="M10 31V11" stroke={stem} strokeWidth={7} strokeLinecap="round" fill="none" />
      <Path d="M30 29V9" stroke={stem} strokeWidth={7} strokeLinecap="round" fill="none" />
      <Path d="M10 11L30 29" stroke={diagonal} strokeWidth={7} strokeLinecap="round" fill="none" />
      {variant === 'color' ? <Circle cx={10} cy={9} r={5.5} fill={stem} /> : null}
      <Circle cx={31} cy={31} r={check ? 6.5 : 5.5} fill={sky} />
      {check ? (
        <Path
          d="M28.3 31.2l1.9 1.9 3.6-3.8"
          stroke={colors.white}
          strokeWidth={1.6}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      ) : null}
    </Svg>
  )
}
