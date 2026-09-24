import { Ionicons } from '@expo/vector-icons'
import { useQuery } from '@tanstack/react-query'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import {
  getRecentAssignedActivities,
  type AssignedActivity,
} from '@/features/technician/technicianService'
import type { TechnicianStackParamList } from '@/navigation/types'
import { useAuthStore } from '@/store/authStore'
import { colors, radius, spacing } from '@/theme/tokens'

type Props = NativeStackScreenProps<TechnicianStackParamList, 'MaintenanceTechnician'>

const STATUS_LABELS: Record<AssignedActivity['estado'], string> = {
  pendiente: 'Pendiente',
  en_proceso: 'En proceso',
  finalizada: 'Finalizada',
}

const ACTIONS = [
  {
    title: 'Registrar avance',
    description: 'Actualiza el estado y las observaciones del trabajo.',
    icon: 'checkmark-circle-outline',
    sections: ['Ver lista', 'Registrar avance'],
  },
  {
    title: 'Fotografías',
    description: 'Prepara la evidencia de las actividades realizadas.',
    icon: 'images-outline',
    sections: ['Ver lista', 'Agregar'],
  },
  {
    title: 'Insumos y repuestos',
    description: 'Registra los materiales utilizados en cada actividad.',
    icon: 'build-outline',
    sections: ['Ver lista', 'Agregar'],
  },
] as const

export function MaintenanceTechnicianScreen({ navigation }: Props) {
  const profile = useAuthStore((state) => state.profile)
  const userId = profile?.id
  const assignments = useQuery({
    queryKey: ['technician-assigned-activities', userId],
    queryFn: () => (userId ? getRecentAssignedActivities(userId) : Promise.resolve([])),
    enabled: Boolean(userId),
  })

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            onRefresh={() => void assignments.refetch()}
            refreshing={assignments.isRefetching}
            tintColor={colors.primary}
          />
        }
      >
        <View style={styles.header}>
          <Text style={styles.eyebrow}>MI TRABAJO</Text>
          <Text accessibilityRole="header" style={styles.title}>
            Panel del técnico
          </Text>
          <Text style={styles.subtitle}>
            {profile?.fullName ? `Hola, ${profile.fullName}. ` : ''}Consulta el trabajo que te han
            asignado.
          </Text>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Mis actividades</Text>
          <Text style={styles.sectionHint}>Últimas 10 asignaciones activas</Text>
        </View>

        {!userId ? (
          <Message text="No fue posible identificar tu perfil." />
        ) : assignments.isLoading ? (
          <ActivityIndicator color={colors.primary} size="large" />
        ) : assignments.isError ? (
          <View style={styles.messageCard}>
            <Text style={styles.messageText}>No fue posible cargar tus actividades.</Text>
            <Pressable accessibilityRole="button" onPress={() => void assignments.refetch()}>
              <Text style={styles.retryText}>Reintentar</Text>
            </Pressable>
          </View>
        ) : assignments.data?.length ? (
          <View style={styles.activityList}>
            {assignments.data.map((activity) => (
              <View key={activity.id} style={styles.activityCard}>
                <Text numberOfLines={2} style={styles.activityDescription}>
                  {activity.descripcion}
                </Text>
                <View
                  style={[
                    styles.statusBadge,
                    activity.estado === 'finalizada'
                      ? styles.statusDone
                      : activity.estado === 'en_proceso'
                        ? styles.statusInProgress
                        : styles.statusPending,
                  ]}
                >
                  <Text style={styles.statusText}>{STATUS_LABELS[activity.estado]}</Text>
                </View>
              </View>
            ))}
          </View>
        ) : (
          <Message text="Aún no tienes actividades asignadas." />
        )}

        <Text style={styles.sectionTitle}>Accesos de trabajo</Text>
        <View style={styles.actions}>
          {ACTIONS.map((action) => (
            <Pressable
              accessibilityRole="button"
              key={action.title}
              onPress={() =>
                navigation.navigate('MaintenanceModule', {
                  title: action.title,
                  sections: [...action.sections],
                })
              }
              style={({ pressed }) => [styles.actionCard, pressed && styles.actionPressed]}
            >
              <View style={styles.actionIcon}>
                <Ionicons color={colors.primary} name={action.icon} size={24} />
              </View>
              <View style={styles.actionText}>
                <Text style={styles.actionTitle}>{action.title}</Text>
                <Text style={styles.actionDescription}>{action.description}</Text>
              </View>
              <Ionicons color={colors.primary} name="chevron-forward" size={20} />
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

function Message({ text }: { text: string }) {
  return (
    <View style={styles.messageCard}>
      <Text style={styles.messageText}>{text}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  content: { gap: spacing.lg, padding: spacing.lg, paddingBottom: spacing.xl },
  header: { gap: spacing.sm },
  eyebrow: { color: colors.primary, fontSize: 12, fontWeight: '800', letterSpacing: 1.2 },
  title: { color: colors.text, fontSize: 28, fontWeight: '800' },
  subtitle: { color: colors.textMuted, fontSize: 15, lineHeight: 22 },
  sectionHeader: { gap: spacing.xs },
  sectionTitle: { color: colors.text, fontSize: 18, fontWeight: '800' },
  sectionHint: { color: colors.textMuted, fontSize: 12 },
  activityList: { gap: spacing.sm },
  activityCard: {
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    padding: spacing.md,
  },
  activityDescription: { color: colors.text, fontSize: 15, fontWeight: '700', lineHeight: 21 },
  statusBadge: {
    alignSelf: 'flex-start',
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  statusPending: { backgroundColor: colors.warningSoft },
  statusInProgress: { backgroundColor: colors.primarySoft },
  statusDone: { backgroundColor: colors.successSoft },
  statusText: { color: colors.text, fontSize: 12, fontWeight: '800' },
  messageCard: {
    gap: spacing.sm,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    padding: spacing.lg,
  },
  messageText: { color: colors.text, fontSize: 14, lineHeight: 20 },
  retryText: { color: colors.primary, fontSize: 14, fontWeight: '800' },
  actions: { gap: spacing.sm },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    padding: spacing.md,
  },
  actionPressed: { opacity: 0.75 },
  actionIcon: {
    width: 46,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
  },
  actionText: { flex: 1, gap: spacing.xs },
  actionTitle: { color: colors.text, fontSize: 15, fontWeight: '800' },
  actionDescription: { color: colors.textMuted, fontSize: 12, lineHeight: 17 },
})
