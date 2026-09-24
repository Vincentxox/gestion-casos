import { Ionicons } from '@expo/vector-icons'
import { useQuery } from '@tanstack/react-query'
import { z } from 'zod'
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { supabase } from '@/services/supabase/client'
import { useAuthStore } from '@/store/authStore'
import { colors, radius, spacing } from '@/theme/tokens'

const statsSchema = z.object({
  solicitudes_total: z.number(),
  solicitudes_pendientes: z.number(),
  solicitudes_en_proceso: z.number(),
  solicitudes_finalizadas: z.number(),
  tecnico_con_mas_solicitudes_resueltas: z
    .object({ nombre: z.string(), solicitudes_resueltas: z.number() })
    .nullable(),
})

async function getDashboardStats() {
  const { data, error } = await supabase.rpc('get_maintenance_dashboard_stats')
  if (error) throw error
  return statsSchema.parse(data)
}

export function MaintenanceOverviewScreen() {
  const profile = useAuthStore((state) => state.profile)
  const isViewer = profile?.role === 'visualizador'
  const stats = useQuery({ queryKey: ['maintenance-dashboard-stats'], queryFn: getDashboardStats })

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.eyebrow}>{isViewer ? 'VISUALIZACIÓN' : 'RESUMEN GENERAL'}</Text>
          <Text accessibilityRole="header" style={styles.title}>
            {isViewer ? 'Panel del visualizador' : `Hola, ${profile?.fullName || 'usuario'}`}
          </Text>
          <Text style={styles.subtitle}>
            {isViewer
              ? 'Consulta el estado general de las solicitudes de mantenimiento.'
              : 'Estado de las solicitudes de mantenimiento.'}
          </Text>
        </View>

        {stats.isLoading ? (
          <ActivityIndicator color={colors.primary} size="large" />
        ) : stats.isError || !stats.data ? (
          <View style={styles.messageCard}>
            <Text style={styles.messageText}>No fue posible cargar las estadísticas.</Text>
            <Pressable accessibilityRole="button" onPress={() => void stats.refetch()}>
              <Text style={styles.retryText}>Reintentar</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <View style={styles.statsGrid}>
              <StatCard label="Solicitudes" value={stats.data.solicitudes_total} />
              <StatCard label="Pendientes" value={stats.data.solicitudes_pendientes} />
              <StatCard label="En proceso" value={stats.data.solicitudes_en_proceso} />
              <StatCard label="Finalizadas" value={stats.data.solicitudes_finalizadas} />
            </View>
            <View style={styles.highlightCard}>
              <Ionicons color={colors.primary} name="ribbon-outline" size={28} />
              <View style={styles.highlightContent}>
                <Text style={styles.highlightLabel}>Técnico con más solicitudes resueltas</Text>
                <Text style={styles.highlightName}>
                  {stats.data.tecnico_con_mas_solicitudes_resueltas?.nombre ?? 'Aún no hay datos'}
                </Text>
                {stats.data.tecnico_con_mas_solicitudes_resueltas ? (
                  <Text style={styles.highlightDetail}>
                    {stats.data.tecnico_con_mas_solicitudes_resueltas.solicitudes_resueltas}{' '}
                    solicitudes resueltas
                  </Text>
                ) : null}
              </View>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  content: { gap: spacing.lg, padding: spacing.lg },
  header: { gap: spacing.sm },
  eyebrow: { color: colors.primary, fontSize: 12, fontWeight: '800', letterSpacing: 1.2 },
  title: { color: colors.text, fontSize: 28, fontWeight: '800' },
  subtitle: { color: colors.textMuted, fontSize: 15, lineHeight: 22 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  statCard: {
    width: '48%',
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    padding: spacing.md,
  },
  statValue: { color: colors.primary, fontSize: 29, fontWeight: '800' },
  statLabel: { color: colors.textMuted, fontSize: 13, fontWeight: '700' },
  highlightCard: {
    flexDirection: 'row',
    gap: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.primarySoft,
    padding: spacing.lg,
  },
  highlightContent: { flex: 1, gap: spacing.xs },
  highlightLabel: { color: colors.textMuted, fontSize: 13, fontWeight: '700' },
  highlightName: { color: colors.text, fontSize: 18, fontWeight: '800' },
  highlightDetail: { color: colors.primary, fontSize: 13, fontWeight: '700' },
  messageCard: {
    gap: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    padding: spacing.lg,
  },
  messageText: { color: colors.text, fontSize: 14 },
  retryText: { color: colors.primary, fontSize: 14, fontWeight: '800' },
})
