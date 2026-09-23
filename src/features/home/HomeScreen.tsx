import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs'
import { useFocusEffect } from '@react-navigation/native'
import { useCallback } from 'react'
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { StatTile } from '@/components/stats/StatTile'
import { hasPermission } from '@/features/auth/permissions'
import { ROLE_LABELS } from '@/features/auth/types'
import { useCases } from '@/features/cases/useCases'
import { StatusBadge } from '@/components/badges/StatusBadge'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { SkeletonList } from '@/components/ui/SkeletonList'
import type { MainTabParamList } from '@/navigation/types'
import { useAuthStore } from '@/store/authStore'
import { colors, radius, spacing, typography } from '@/theme/tokens'
import { formatRelativeDate } from '@/theme/formatters'

import { getAdminAlerts, getHomeTileTarget, getHomeTiles } from './homePresentation'
import { useHomeSummary } from './useHomeSummary'

type Props = BottomTabScreenProps<MainTabParamList, 'Home'>

export function HomeScreen({ navigation }: Props) {
  const profile = useAuthStore((state) => state.profile)
  const summary = useHomeSummary(Boolean(profile?.organizationId))
  const showRecent =
    profile?.role === 'solicitante' ||
    profile?.role === 'tecnico' ||
    (profile?.role === 'jefe_area' && summary.data?.area_kind === 'solicitante')
  const cases = useCases(showRecent)
  const refetchSummary = summary.refetch
  const refetchCases = cases.refetch
  useFocusEffect(
    useCallback(() => {
      void refetchSummary()
      if (showRecent) void refetchCases()
    }, [refetchSummary, refetchCases, showRecent]),
  )
  if (!profile) return null

  const canCreate = hasPermission(profile.role, 'cases.create') && Boolean(profile.areaId)
  const alerts = summary.data?.admin ? getAdminAlerts(summary.data.admin) : []
  const tiles = summary.data ? getHomeTiles(profile, summary.data) : []
  const firstName = profile.fullName.trim().split(/\s+/)[0] || 'usuario'
  const recentCases = (cases.data ?? [])
    .filter((item) =>
      profile.role === 'tecnico' ? item.assignedTo === profile.id : item.createdBy === profile.id,
    )
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 3)

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={summary.isRefetching}
            onRefresh={() => {
              void summary.refetch()
              if (showRecent) void cases.refetch()
            }}
          />
        }
      >
        <View style={styles.header}>
          <Text style={styles.eyebrow}>{profile.organizationName || 'NEXO CASOS'}</Text>
          <Text accessibilityRole="header" style={styles.title}>
            Hola, {firstName}
          </Text>
          <Text style={styles.subtitle}>
            {ROLE_LABELS[profile.role]} · {profile.areaName || 'Sin área asignada'}
          </Text>
        </View>

        {summary.isLoading ? <Text style={styles.message}>Cargando tu resumen…</Text> : null}
        {summary.isError ? (
          <View style={styles.notice}>
            <Text style={styles.noticeTitle}>No pudimos cargar el Inicio</Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => void summary.refetch()}
              style={styles.link}
            >
              <Text style={styles.linkText}>Reintentar</Text>
            </Pressable>
          </View>
        ) : null}

        {alerts.length > 0 ? (
          <View style={styles.notice}>
            <Text style={styles.noticeTitle}>Completa la configuración</Text>
            {alerts.map((alert) => (
              <Pressable
                accessibilityRole="button"
                key={`${alert.screen}-${alert.label}`}
                onPress={() => navigation.navigate('Administration', { screen: alert.screen })}
                style={styles.alertRow}
              >
                <Text style={styles.alertText}>{alert.label}</Text>
                <Text style={styles.linkText}>›</Text>
              </Pressable>
            ))}
          </View>
        ) : null}

        {tiles.length > 0 ? (
          <View style={styles.section}>
            <SectionHeader title="Lo que requiere tu atención" />
            <View style={styles.tileGrid}>
              {tiles.map((tile) => (
                <StatTile
                  key={tile.label}
                  {...tile}
                  onPress={() =>
                    navigation.navigate('CasesTab', {
                      screen: 'Cases',
                      params: getHomeTileTarget(profile, tile.label),
                    })
                  }
                />
              ))}
            </View>
          </View>
        ) : null}

        {!profile.areaId && profile.role !== 'administrador' && profile.role !== 'auditor' ? (
          <View style={styles.notice}>
            <Text style={styles.noticeTitle}>Área pendiente de asignación</Text>
            <Text style={styles.message}>
              Tu administrador aún no te asignó un área. Sin área no puedes crear solicitudes.
            </Text>
          </View>
        ) : null}
        {canCreate ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => navigation.navigate('CasesTab', { screen: 'CreateCase' })}
            style={styles.primaryAction}
          >
            <Text style={styles.primaryActionText}>＋ Nueva solicitud</Text>
          </Pressable>
        ) : null}
        {profile.role === 'tecnico' &&
        tiles.length > 0 &&
        tiles.every((tile) => tile.value === 0) ? (
          <Text style={styles.message}>
            No tienes trabajos asignados. Cuando el jefe de tu área te asigne una solicitud,
            aparecerá aquí.
          </Text>
        ) : null}
        {showRecent ? (
          <View style={styles.section}>
            <SectionHeader
              title={profile.role === 'tecnico' ? 'Mis trabajos' : 'Mis solicitudes recientes'}
            />
            {cases.isError ? (
              <Pressable accessibilityRole="button" onPress={() => void cases.refetch()}>
                <Text style={styles.linkText}>No fue posible cargar la lista. Reintentar</Text>
              </Pressable>
            ) : cases.isLoading ? (
              <SkeletonList count={3} />
            ) : recentCases.length === 0 ? (
              <Text style={styles.message}>
                {profile.role === 'tecnico'
                  ? 'No tienes trabajos asignados todavía.'
                  : 'Tus solicitudes aparecerán aquí cuando crees la primera.'}
              </Text>
            ) : (
              recentCases.map((item) => (
                <Pressable
                  accessibilityRole="button"
                  key={item.id}
                  onPress={() =>
                    navigation.navigate('CasesTab', {
                      screen: 'CaseDetail',
                      params: { caseId: item.id },
                    })
                  }
                  style={styles.recentCard}
                >
                  <Text style={styles.recentNumber}>
                    {item.caseNumber} · {formatRelativeDate(item.createdAt)}
                  </Text>
                  <Text numberOfLines={1} style={styles.recentTitle}>
                    {item.title}
                  </Text>
                  <StatusBadge status={item.status} />
                </Pressable>
              ))
            )}
          </View>
        ) : null}
        <Pressable
          accessibilityRole="button"
          onPress={() => navigation.navigate('CasesTab', { screen: 'Cases' })}
          style={styles.link}
        >
          <Text style={styles.linkText}>
            {profile.role === 'tecnico' ? 'Ver mis trabajos' : 'Ver solicitudes'} →
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  content: { gap: spacing.lg, padding: spacing.lg, paddingBottom: spacing.xl },
  header: { gap: spacing.sm },
  eyebrow: { color: colors.primary, ...typography.overline },
  title: { color: colors.text, ...typography.display },
  subtitle: { color: colors.textMuted, ...typography.body },
  section: { gap: spacing.md },
  sectionTitle: { color: colors.text, ...typography.title },
  tileGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  notice: {
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.warningSoft,
  },
  noticeTitle: { color: colors.text, ...typography.heading },
  message: { color: colors.textMuted, ...typography.body },
  alertRow: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  alertText: { flex: 1, color: colors.text, ...typography.body },
  primaryAction: {
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    backgroundColor: colors.primary,
  },
  primaryActionText: { color: colors.white, fontWeight: '800', fontSize: 16 },
  link: { minHeight: 44, justifyContent: 'center' },
  linkText: { color: colors.primary, fontWeight: '800', fontSize: 15 },
  recentCard: {
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  recentNumber: { color: colors.primary, ...typography.caption, fontWeight: '800' },
  recentTitle: { color: colors.text, ...typography.heading },
})
