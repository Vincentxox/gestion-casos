import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { ScrollView, StyleSheet, Text, View } from 'react-native'

import { Card } from '@/components/ui/Card'
import { Icon } from '@/components/ui/Icon'
import { IconTile } from '@/components/ui/IconTile'
import { ScreenContainer } from '@/components/ui/ScreenContainer'
import type { AdministrationStackParamList } from '@/navigation/types'
import { useHomeSummary } from '@/features/home/useHomeSummary'
import { colors, spacing, typography } from '@/theme/tokens'

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
]

export function AdministrationHomeScreen({ navigation }: Props) {
  const summary = useHomeSummary()
  const counts: Record<string, number | undefined> = {
    AccessRequests: summary.data?.admin?.solicitudes_acceso_pendientes,
    Users: summary.data?.admin?.usuarios_sin_area,
    Invitations: summary.data?.admin?.invitaciones_pendientes,
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

        {OPTIONS.map((option) => (
          <Card
            accessibilityLabel={option.title}
            key={option.route}
            onPress={() => navigation.navigate(option.route)}
            contentStyle={styles.card}
          >
            <IconTile icon={option.icon} size={44} />
            <View style={styles.cardContent}>
              <Text style={styles.cardTitle}>
                {option.title}
                {counts[option.route] ? ` · ${counts[option.route]}` : ''}
              </Text>
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
  card: {
    minHeight: 112,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  cardContent: { flex: 1, gap: spacing.xs },
  cardTitle: { ...typography.heading, color: colors.text },
  cardDescription: { ...typography.caption, color: colors.textMuted },
})
