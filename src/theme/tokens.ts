export const colors = {
  primary: '#075EAD',
  primaryDark: '#064B8A',
  primarySoft: '#EAF3FC',
  background: '#F5F7FA',
  surface: '#FFFFFF',
  text: '#172B4D',
  textMuted: '#5E6C84',
  border: '#D7DEE8',
  error: '#B42318',
  success: '#16803B',
  successSoft: '#E8F5EE',
  warning: '#9A6700',
  warningSoft: '#FFF4D6',
  white: '#FFFFFF',
  info: '#075EAD',
  infoSoft: '#EAF3FC',
  neutral: '#52627A',
  neutralSoft: '#EDF0F4',
  dangerSoft: '#FDECE9',
  dangerBadge: '#FEE2E2',
  dangerText: '#B91C1C',
  cardBorder: '#E4E9F0',
  purple: '#6941C6',
  purpleSoft: '#F1EBFF',
  backdrop: '#00000088',
} as const

export const spacing = {
  xs: 4,
  sm: 8,
  base: 12,
  md: 16,
  compact: 20,
  lg: 24,
  roomy: 28,
  xl: 32,
} as const

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  pill: 999,
} as const

export const iconSize = { inline: 16, base: 22, hero: 44 } as const

export const fonts = {
  regular: 'PlusJakartaSans_400Regular',
  medium: 'PlusJakartaSans_500Medium',
  semibold: 'PlusJakartaSans_600SemiBold',
  bold: 'PlusJakartaSans_700Bold',
  extrabold: 'PlusJakartaSans_800ExtraBold',
} as const

export const typography = {
  display: { fontFamily: fonts.extrabold, fontSize: 28, lineHeight: 34 },
  title: { fontFamily: fonts.bold, fontSize: 20, lineHeight: 26 },
  heading: { fontFamily: fonts.bold, fontSize: 17, lineHeight: 22 },
  body: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 22 },
  caption: { fontFamily: fonts.medium, fontSize: 13, lineHeight: 18 },
  overline: {
    fontFamily: fonts.bold,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.9,
    textTransform: 'uppercase' as const,
  },
} as const

export const elevation = {
  sm: { elevation: 2, shadowColor: colors.text, shadowOpacity: 0.08, shadowRadius: 4 },
  md: { elevation: 4, shadowColor: colors.text, shadowOpacity: 0.12, shadowRadius: 8 },
} as const

export const phaseColors = {
  nueva: { fg: '#C2410C', bg: '#FFEDD5' },
  curso: { fg: '#0369A1', bg: '#E0F2FE' },
  detenida: { fg: '#854D0E', bg: '#FEF3C7' },
  revision: { fg: '#7E22CE', bg: '#F3E8FF' },
  cerrada: { fg: '#15803D', bg: '#DCFCE7' },
  rechazada: { fg: '#B91C1C', bg: '#FEE2E2' },
  cancelada: { fg: '#475569', bg: '#F1F5F9' },
} as const
