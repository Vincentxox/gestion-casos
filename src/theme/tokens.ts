export const colors = {
  primary: '#1366D6',
  primaryDark: '#0E4FA8',
  primarySoft: '#E6F0FC',
  ink: '#13305E',
  sky: '#1BA6E8',
  skySoft: '#E2F5FD',
  night: '#0A1426',
  track: '#E4E9F0',
  background: '#FFFFFF',
  surface: '#FFFFFF',
  surfaceMuted: '#F2F5F9',
  text: '#13203A',
  textMuted: '#5A6780',
  border: '#E4E9F0',
  error: '#B42318',
  success: '#16803B',
  successSoft: '#E8F5EE',
  warning: '#9A6700',
  warningSoft: '#FFF4D6',
  white: '#FFFFFF',
  info: '#1366D6',
  infoSoft: '#E6F0FC',
  neutral: '#52627A',
  neutralSoft: '#F0F3F7',
  dangerSoft: '#FDE7E2',
  dangerBadge: '#FEE2E2',
  dangerBorder: '#F3C7BD',
  dangerText: '#9A2B16',
  cardBorder: '#E4E9F0',
  purple: '#6941C6',
  purpleSoft: '#F1EBFF',
  backdrop: '#00000088',
  modalBackdrop: 'rgba(10,20,38,0.48)',
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
  sheet: 32,
  pill: 999,
} as const

export const iconSize = { inline: 16, base: 22, hero: 44 } as const

export const fonts = {
  regular: 'Onest_400Regular',
  medium: 'Onest_500Medium',
  semibold: 'Onest_600SemiBold',
  bold: 'Onest_700Bold',
  extrabold: 'Onest_800ExtraBold',
} as const

const noLigatures = { fontVariant: ['no-common-ligatures'] as ['no-common-ligatures'] }

export const typography = {
  display: { ...noLigatures, fontFamily: fonts.extrabold, fontSize: 28, lineHeight: 34 },
  title: { ...noLigatures, fontFamily: fonts.bold, fontSize: 20, lineHeight: 26 },
  heading: { ...noLigatures, fontFamily: fonts.bold, fontSize: 17, lineHeight: 22 },
  body: { ...noLigatures, fontFamily: fonts.regular, fontSize: 15, lineHeight: 22 },
  caption: { ...noLigatures, fontFamily: fonts.medium, fontSize: 13, lineHeight: 18 },
  overline: {
    ...noLigatures,
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
