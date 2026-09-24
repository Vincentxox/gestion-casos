import { Ionicons } from '@expo/vector-icons'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import type { CoordinatorStackParamList } from '@/navigation/types'
import { useAuthStore } from '@/store/authStore'
import { colors, radius, spacing } from '@/theme/tokens'

type Props = NativeStackScreenProps<CoordinatorStackParamList, 'MaintenanceCoordinator'>

const QUICK_ACTIONS = [
  {
    id: 'solicitudes',
    title: 'Solicitudes',
    description: 'Registra las solicitudes recibidas en papel.',
    icon: 'document-text-outline',
    sections: ['Agregar', 'Ver lista', 'Editar'],
  },
  {
    id: 'actividades',
    title: 'Actividades',
    description: 'Organiza el trabajo de mantenimiento.',
    icon: 'construct-outline',
    sections: ['Agregar', 'Ver lista', 'Editar'],
  },
  {
    id: 'asignaciones',
    title: 'Asignaciones',
    description: 'Asigna actividades a los técnicos.',
    icon: 'people-outline',
    sections: ['Agregar', 'Ver lista', 'Editar'],
  },
  {
    id: 'seguimiento',
    title: 'Seguimiento',
    description: 'Consulta estados y avances de cada actividad.',
    icon: 'time-outline',
    sections: ['Ver lista'],
  },
] as const

export function MaintenanceCoordinatorScreen({ navigation }: Props) {
  const fullName = useAuthStore((state) => state.profile?.fullName)

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.eyebrow}>COORDINACIÓN</Text>
          <Text accessibilityRole="header" style={styles.title}>
            Panel del coordinador
          </Text>
          <Text style={styles.subtitle}>
            {fullName ? `Hola, ${fullName}. ` : ''}Organiza las solicitudes y el trabajo del equipo.
          </Text>
        </View>

        <Text style={styles.sectionTitle}>Accesos principales</Text>
        <View style={styles.grid}>
          {QUICK_ACTIONS.map((option) => (
            <Pressable
              accessibilityRole="button"
              key={option.id}
              onPress={() =>
                option.id === 'actividades' || option.id === 'asignaciones'
                  ? navigation.navigate('MaintenanceActivities', {
                      initialSection: option.id === 'asignaciones' ? 'lista' : 'agregar',
                    })
                  : navigation.navigate('MaintenanceModule', {
                      title: option.title,
                      sections: [...option.sections],
                    })
              }
              style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
            >
              <View style={styles.iconContainer}>
                <Ionicons color={colors.primary} name={option.icon} size={25} />
              </View>
              <Text style={styles.cardTitle}>{option.title}</Text>
              <Text style={styles.cardDescription}>{option.description}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Informes</Text>
        <Pressable
          accessibilityRole="button"
          onPress={() =>
            navigation.navigate('MaintenanceModule', {
              title: 'Informes',
              sections: ['Ver lista', 'Generar'],
            })
          }
          style={({ pressed }) => [styles.reportCard, pressed && styles.cardPressed]}
        >
          <View style={styles.reportIcon}>
            <Ionicons color={colors.primary} name="stats-chart-outline" size={26} />
          </View>
          <View style={styles.reportText}>
            <Text style={styles.cardTitle}>Consultar informes</Text>
            <Text style={styles.cardDescription}>Revisa resultados por intervalo de fechas.</Text>
          </View>
          <Ionicons color={colors.primary} name="chevron-forward" size={20} />
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  content: { gap: spacing.lg, padding: spacing.lg, paddingBottom: spacing.xl },
  header: { gap: spacing.sm },
  eyebrow: { color: colors.primary, fontSize: 12, fontWeight: '800', letterSpacing: 1.2 },
  title: { color: colors.text, fontSize: 28, fontWeight: '800' },
  subtitle: { color: colors.textMuted, fontSize: 15, lineHeight: 22 },
  sectionTitle: { color: colors.text, fontSize: 18, fontWeight: '800' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  card: {
    width: '48%',
    minHeight: 158,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    padding: spacing.md,
  },
  cardPressed: { opacity: 0.75 },
  iconContainer: {
    width: 46,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
  },
  cardTitle: { color: colors.text, fontSize: 15, fontWeight: '800' },
  cardDescription: { color: colors.textMuted, fontSize: 12, lineHeight: 17 },
  reportCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    padding: spacing.md,
  },
  reportIcon: {
    width: 46,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
  },
  reportText: { flex: 1, gap: spacing.xs },
})
