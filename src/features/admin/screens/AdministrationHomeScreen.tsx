import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'

import { Card } from '@/components/ui/Card'
import { Chip } from '@/components/ui/Chip'
import { Icon } from '@/components/ui/Icon'
import { IconTile } from '@/components/ui/IconTile'
import { ScreenContainer } from '@/components/ui/ScreenContainer'
import type { AdministrationStackParamList, MainTabParamList } from '@/navigation/types'
import { useHomeSummary } from '@/features/home/useHomeSummary'
import { useCaseIndicators } from '@/features/home/useIndicators'
import { getAdminAlerts } from '@/features/home/homePresentation'
import { colors, spacing, tone, typography } from '@/theme/tokens'
import { plural } from '@/theme/formatters'

type Props = NativeStackScreenProps<AdministrationStackParamList, 'AdministrationHome'>

const OPTIONS = [
  {
    route: 'AccessRequests' as const,
    icon: 'person-add-outline' as const,
    title: 'Solicitudes de acceso',
    description: 'Aprueba o rechaza a quienes pidieron unirse.',
  },
  {
    route: 'Users' as const,
    icon: 'people-outline' as const,
    title: 'Usuarios',
    description: 'Asigna el rol y el área de cada miembro.',
  },
  {
    route: 'Areas' as const,
    icon: 'business-outline' as const,
    title: 'Áreas',
    description: 'Organiza áreas solicitantes y técnicas.',
  },
  {
    route: 'Categories' as const,
    icon: 'pricetag-outline' as const,
    title: 'Tipos de servicio',
    description: 'Define lo que atiende cada área técnica.',
  },
  {
    route: 'Resources' as const,
    icon: 'cube-outline' as const,
    title: 'Recursos',
    description: 'Administra materiales, herramientas y equipos.',
  },
  {
    route: 'Invitations' as const,
    icon: 'mail-outline' as const,
    title: 'Invitaciones',
    description: 'Invita personas y revisa sus accesos.',
  },
  {
    route: 'Organization' as const,
    icon: 'key-outline' as const,
    title: 'Mi empresa',
    description: 'Consulta y actualiza el nombre de tu empresa.',
  },
  {
    route: 'PriorityTargets' as const,
    icon: 'time-outline' as const,
    title: 'Plazos por prioridad',
    description: 'Define el tiempo para aceptar y resolver solicitudes nuevas.',
  },
]

export function AdministrationHomeScreen({ navigation }: Props) {
  const summary = useHomeSummary()
  const indicators = useCaseIndicators(true)
  const alerts = summary.data?.admin ? getAdminAlerts(summary.data.admin) : []
  const counts: Record<string, number | undefined> = {
    AccessRequests: summary.data?.admin?.solicitudes_acceso_pendientes,
    Users: summary.data?.admin?.usuarios_sin_area,
    Invitations: summary.data?.admin?.invitaciones_pendientes,
  }
  const notices: Record<string, string> = {
    AccessRequests: `${counts.AccessRequests ?? 0} ${plural(counts.AccessRequests ?? 0, 'pendiente', 'pendientes')}`,
    Users: `${counts.Users ?? 0} sin área`,
    Invitations: `${counts.Invitations ?? 0} ${plural(counts.Invitations ?? 0, 'pendiente', 'pendientes')}`,
  }
  return (
    <ScreenContainer padded={false}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.eyebrow}>CONFIGURACIÓN</Text>
          <Text accessibilityRole="header" style={styles.title}>
            Administrar
          </Text>
          <Text style={styles.subtitle}>
            Gestiona los miembros, áreas y servicios de tu empresa.
          </Text>
        </View>

        <View style={styles.section}>
          <Text accessibilityRole="header" style={styles.sectionTitle}>
            Por completar
          </Text>
          {summary.isLoading ? (
            <Text style={styles.cardDescription}>Cargando pendientes…</Text>
          ) : null}
          {summary.isError ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => void summary.refetch()}
              style={styles.alertRow}
            >
              <Text style={styles.linkText}>No pudimos cargar los pendientes. Reintentar</Text>
            </Pressable>
          ) : null}
          {!summary.isLoading && !summary.isError && alerts.length === 0 ? (
            <Text style={styles.cardDescription}>Todo está al día.</Text>
          ) : null}
          {alerts.map((alert) => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={alert.label}
              key={`${alert.screen}-${alert.label}`}
              onPress={() => navigation.navigate(alert.screen)}
              style={styles.alertRow}
            >
              <Icon name="alert-circle-outline" size="base" color={tone.warning.text} />
              <Text style={styles.alertText}>{alert.label}</Text>
              <Icon name="chevron-forward" size="inline" color={colors.textMuted} />
            </Pressable>
          ))}
        </View>

        <View style={styles.indicatorsStrip}>
          <View style={styles.indicatorsCopy}>
            <Text style={styles.stripTitle}>Indicadores</Text>
            {indicators.isLoading ? <Text style={styles.cardDescription}>Cargando…</Text> : null}
            {indicators.isError ? (
              <Pressable accessibilityRole="button" onPress={() => void indicators.refetch()}>
                <Text style={styles.linkText}>Reintentar indicadores</Text>
              </Pressable>
            ) : null}
            {indicators.data ? (
              <Text style={styles.cardDescription}>
                {indicators.data.total} solicitudes ·{' '}
                {(indicators.data.vencidas_hoy.aceptacion ?? 0) +
                  (indicators.data.vencidas_hoy.resolucion ?? 0)}{' '}
                vencidas
              </Text>
            ) : null}
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Ver indicadores"
            onPress={() =>
              navigation
                .getParent<BottomTabNavigationProp<MainTabParamList>>()
                ?.navigate('CasesTab', { screen: 'Indicators' })
            }
            style={styles.indicatorsAction}
          >
            <Text style={styles.linkText}>Ver indicadores</Text>
          </Pressable>
        </View>

        <Text accessibilityRole="header" style={styles.sectionTitle}>
          Gestión
        </Text>
        {OPTIONS.map((option) => (
          <Card
            accessibilityLabel={option.title}
            key={option.route}
            onPress={() => navigation.navigate(option.route)}
            contentStyle={styles.card}
          >
            <IconTile icon={option.icon} size={44} />
            <View style={styles.cardContent}>
              <View style={styles.titleRow}>
                <Text style={styles.cardTitle}>{option.title}</Text>
                {counts[option.route] ? (
                  <Chip label={notices[option.route] ?? ''} tone="warning" />
                ) : null}
              </View>
              <Text style={styles.cardDescription}>{option.description}</Text>
            </View>
            <Icon name="chevron-forward" size="base" color={colors.textMuted} />
          </Card>
        ))}
      </ScrollView>
    </ScreenContainer>
  )
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, gap: spacing.md, padding: spacing.lg },
  header: { gap: spacing.sm, marginBottom: spacing.sm },
  eyebrow: { ...typography.overline, color: colors.primary },
  title: { ...typography.display, color: colors.text },
  subtitle: { ...typography.body, color: colors.textMuted },
  section: { gap: spacing.sm },
  sectionTitle: { ...typography.title, color: colors.ink },
  alertRow: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: spacing.sm,
    backgroundColor: tone.warning.bg,
  },
  alertText: { ...typography.body, flex: 1, color: colors.text },
  indicatorsStrip: {
    minHeight: 80,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: spacing.md,
    backgroundColor: tone.info.bg,
  },
  indicatorsCopy: { flex: 1, gap: spacing.xs },
  stripTitle: { ...typography.heading, color: colors.ink },
  indicatorsAction: { minHeight: 44, justifyContent: 'center' },
  linkText: { ...typography.caption, color: colors.primary },
  card: {
    minHeight: 112,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  cardContent: { flex: 1, gap: spacing.xs },
  titleRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: spacing.xs },
  cardTitle: { ...typography.heading, color: colors.text },
  cardDescription: { ...typography.caption, color: colors.textMuted },
})
