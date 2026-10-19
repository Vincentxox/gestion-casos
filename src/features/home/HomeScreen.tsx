import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { useFocusEffect } from '@react-navigation/native'
import { useCallback, useState } from 'react'
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { NexoLogo } from '@/components/branding/NexoLogo'
import { StatTile } from '@/components/stats/StatTile'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Chip } from '@/components/ui/Chip'
import { Icon } from '@/components/ui/Icon'
import { EmptyState } from '@/components/feedback/EmptyState'
import { OfflineBanner } from '@/components/feedback/OfflineBanner'
import { ROLE_LABELS } from '@/features/auth/types'
import { useCases } from '@/features/cases/useCases'
import { ACTIVE_CASE_STATUSES } from '@/features/cases/caseSearch'
import { CaseCard } from '@/features/cases/components/CaseCard'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { SkeletonList } from '@/components/ui/SkeletonList'
import type { MainTabParamList, RootStackParamList } from '@/navigation/types'
import { useAuthStore } from '@/store/authStore'
import { colors, fonts, radius, spacing, typography } from '@/theme/tokens'

import {
  getAdminAlerts,
  getGreeting,
  getHomeHero,
  getHomeRecentCases,
  getHomeTileTarget,
  getHomeTiles,
} from './homePresentation'
import { useHomeSummary } from './useHomeSummary'
import { useCaseIndicators } from './useIndicators'

type Props = BottomTabScreenProps<MainTabParamList, 'Home'>

export function HomeScreen({ navigation }: Props) {
  const profile = useAuthStore((state) => state.profile)
  const summary = useHomeSummary(Boolean(profile?.organizationId))
  const canSeeIndicators = Boolean(
    profile?.organizationId && ['administrador', 'jefe_area', 'auditor'].includes(profile.role),
  )
  const indicators = useCaseIndicators(canSeeIndicators)
  const showRecent = Boolean(profile?.organizationId)
  const cases = useCases(
    {
      scope:
        profile?.role === 'tecnico'
          ? 'mis_trabajos'
          : profile?.role === 'solicitante'
            ? 'mias'
            : profile?.role === 'jefe_area'
              ? 'mi_area'
              : 'todas',
      statuses: ACTIVE_CASE_STATUSES,
      priorities: null,
      createdFrom: null,
      createdTo: null,
      overdueOnly: false,
      unassignedOnly: false,
      searchText: null,
      sort: 'recientes',
    },
    showRecent,
  )
  const [today] = useState(() => new Date())
  const refetchSummary = summary.refetch
  const refetchCases = cases.refetch
  const refetchIndicators = indicators.refetch
  useFocusEffect(
    useCallback(() => {
      void refetchSummary()
      if (showRecent) void refetchCases()
      if (canSeeIndicators) void refetchIndicators()
    }, [refetchSummary, refetchCases, refetchIndicators, canSeeIndicators, showRecent]),
  )
  if (!profile) return null

  const alerts = summary.data?.admin ? getAdminAlerts(summary.data.admin) : []
  const tiles = summary.data ? getHomeTiles(profile, summary.data).slice(0, 4) : []
  const hero = summary.data ? getHomeHero(profile, summary.data) : null
  const rawFirstName = profile.fullName.trim().split(/\s+/)[0] || 'usuario'
  const firstName = rawFirstName.charAt(0).toLocaleUpperCase('es-GT') + rawFirstName.slice(1)
  const rawDateLabel = new Intl.DateTimeFormat('es-GT', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(today)
  const dateLabel = rawDateLabel.charAt(0).toLocaleUpperCase('es-GT') + rawDateLabel.slice(1)
  const recentCases = getHomeRecentCases(
    profile,
    summary.data?.area_kind ?? null,
    cases.data?.pages.flat() ?? [],
  )

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
              if (canSeeIndicators) void indicators.refetch()
            }}
          />
        }
      >
        <View style={styles.brandRow}>
          <View style={styles.brand}>
            <NexoLogo size={30} />
            <Text style={styles.wordmark}>nexo</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Avisos, ${summary.data?.notificaciones_sin_leer ?? 0} sin leer`}
            onPress={() =>
              navigation
                .getParent<NativeStackNavigationProp<RootStackParamList>>()
                ?.navigate('NotificationsFlow')
            }
            style={styles.bell}
          >
            <Icon name="notifications-outline" color={colors.text} size={21} />
            {(summary.data?.notificaciones_sin_leer ?? 0) > 0 ? (
              <Text style={styles.bellCount}>
                {(summary.data?.notificaciones_sin_leer ?? 0) > 99
                  ? '99+'
                  : summary.data?.notificaciones_sin_leer}
              </Text>
            ) : null}
          </Pressable>
        </View>

        <View style={styles.header}>
          <Text style={styles.eyebrow}>{dateLabel}</Text>
          <Text accessibilityRole="header" style={styles.title}>
            {getGreeting(today.getHours())}, {firstName}
          </Text>
          <Text style={styles.subtitle}>
            {ROLE_LABELS[profile.role]} · {profile.areaName || 'Sin área asignada'}
          </Text>
        </View>

        <OfflineBanner />

        {summary.isLoading ? <SkeletonList count={2} /> : null}
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

        {!summary.isLoading && hero ? (
          hero.count > 0 ? (
            <View style={styles.hero}>
              <View accessibilityElementsHidden importantForAccessibility="no" style={styles.line}>
                <View style={styles.lineStart} />
                <View style={styles.lineTrack} />
                <View style={styles.lineEnd} />
              </View>
              <Text style={styles.heroTitle}>{hero.title}</Text>
              {hero.supportingText ? (
                <Text style={styles.message}>{hero.supportingText}</Text>
              ) : null}
              {hero.detail.length > 0 ? (
                <View style={styles.heroDetails}>
                  {hero.detail.map((part) => (
                    <Chip
                      key={part.id}
                      label={part.label}
                      onPress={() =>
                        navigation.navigate('CasesTab', {
                          screen: 'Cases',
                          params: getHomeTileTarget(profile, part.id),
                        })
                      }
                    />
                  ))}
                </View>
              ) : null}
              <Pressable
                accessibilityRole="button"
                onPress={() =>
                  navigation.navigate('CasesTab', { screen: 'Cases', params: hero.target })
                }
                style={styles.link}
              >
                <Text style={styles.linkText}>{hero.actionLabel}</Text>
                <Icon name="arrow-forward" size="inline" color={colors.primary} />
              </Pressable>
            </View>
          ) : (
            <EmptyState
              title="Todo al día"
              message="No tienes solicitudes pendientes en este momento."
              variant="allDone"
              compact
            />
          )
        ) : null}

        {alerts.length > 0 ? (
          <View style={styles.section}>
            <SectionHeader title="Completa la configuración" />
            {alerts.map((alert) => (
              <Pressable
                accessibilityRole="button"
                key={`${alert.screen}-${alert.label}`}
                onPress={() => navigation.navigate('Administration', { screen: alert.screen })}
                style={styles.alertRow}
              >
                <Icon name="alert-circle-outline" size="inline" color={colors.warning} />
                <Text style={styles.alertText}>{alert.label}</Text>
                <Icon name="chevron-forward" size="inline" color={colors.textMuted} />
              </Pressable>
            ))}
          </View>
        ) : null}

        {!summary.isLoading && tiles.length > 0 ? (
          <View style={styles.section}>
            <SectionHeader title="Tus números" />
            <View style={styles.tileGrid}>
              {tiles.map((tile) => (
                <StatTile
                  key={tile.id}
                  {...tile}
                  onPress={() =>
                    navigation.navigate('CasesTab', {
                      screen: 'Cases',
                      params: getHomeTileTarget(profile, tile.id),
                    })
                  }
                />
              ))}
            </View>
          </View>
        ) : null}

        {canSeeIndicators ? (
          <View style={styles.section}>
            <SectionHeader title="Indicadores" />
            {indicators.isLoading ? <SkeletonList count={1} /> : null}
            {indicators.isError ? (
              <Pressable accessibilityRole="button" onPress={() => void indicators.refetch()}>
                <Text style={styles.linkText}>
                  No fue posible cargar los indicadores. Reintentar
                </Text>
              </Pressable>
            ) : null}
            {indicators.data ? (
              <Card contentStyle={styles.indicatorCard}>
                <Text style={styles.indicatorTitle}>{indicators.data.total} solicitudes</Text>
                <Text style={styles.message}>
                  Vencidas ahora: {indicators.data.vencidas_hoy.aceptacion} por aceptación ·{' '}
                  {indicators.data.vencidas_hoy.resolucion} por resolución
                </Text>
                <Text style={styles.message}>
                  Fuera de plazo: {indicators.data.fuera_de_plazo.aceptacion} aceptadas ·{' '}
                  {indicators.data.fuera_de_plazo.resolucion} resueltas
                </Text>
                <Text style={styles.message}>
                  Prioridad: {indicators.data.por_prioridad.alta ?? 0} alta ·{' '}
                  {indicators.data.por_prioridad.media ?? 0} media ·{' '}
                  {indicators.data.por_prioridad.baja ?? 0} baja
                </Text>
                <Text style={styles.message}>
                  Promedios: {indicators.data.tiempos_promedio_horas.aceptacion ?? '—'} h para
                  aceptar · {indicators.data.tiempos_promedio_horas.resolucion ?? '—'} h para
                  resolver
                </Text>
                <Button
                  label="Ver todos los indicadores"
                  variant="text"
                  onPress={() => navigation.navigate('CasesTab', { screen: 'Indicators' })}
                />
              </Card>
            ) : null}
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
        {showRecent ? (
          <View style={styles.section}>
            <View style={styles.recentHeading}>
              <SectionHeader title="Lo que te toca hoy" />
              <Button
                label="Ver todo"
                variant="text"
                onPress={() => navigation.navigate('CasesTab', { screen: 'Cases' })}
              />
            </View>
            {cases.isError ? (
              <Pressable accessibilityRole="button" onPress={() => void cases.refetch()}>
                <Text style={styles.linkText}>No fue posible cargar la lista. Reintentar</Text>
              </Pressable>
            ) : cases.isLoading ? (
              <SkeletonList count={3} />
            ) : recentCases.length === 0 ? (
              <EmptyState
                title="Sin solicitudes recientes"
                message="Aquí aparecerán las solicitudes que puedas consultar."
                variant="allDone"
                compact
              />
            ) : (
              recentCases.map((item) => (
                <CaseCard
                  key={item.id}
                  item={item}
                  onPress={() =>
                    navigation.navigate('CasesTab', {
                      screen: 'CaseDetail',
                      params: { caseId: item.id },
                      initial: false,
                    })
                  }
                />
              ))
            )}
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  content: {
    gap: spacing.lg,
    paddingHorizontal: spacing.compact,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xl,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginRight: -spacing.sm,
  },
  brand: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  wordmark: { fontFamily: fonts.extrabold, fontSize: 19, letterSpacing: -0.4, color: colors.ink },
  bell: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceMuted,
  },
  bellCount: {
    position: 'absolute',
    top: 2,
    right: 0,
    minWidth: 18,
    paddingHorizontal: 3,
    textAlign: 'center',
    overflow: 'hidden',
    borderRadius: radius.pill,
    backgroundColor: colors.sky,
    color: colors.white,
    ...typography.caption,
    fontSize: 11,
    lineHeight: 18,
  },
  header: { gap: spacing.xs },
  eyebrow: { ...typography.body, fontFamily: fonts.medium, fontSize: 14, color: colors.textMuted },
  title: {
    ...typography.display,
    fontSize: 36,
    lineHeight: 40,
    letterSpacing: -1.1,
    color: colors.ink,
  },
  subtitle: { color: colors.textMuted, ...typography.caption },
  hero: { gap: spacing.base },
  line: { flexDirection: 'row', alignItems: 'center' },
  lineStart: { width: 14, height: 14, borderRadius: radius.pill, backgroundColor: colors.ink },
  lineTrack: { flex: 1, height: 6, marginHorizontal: -2, backgroundColor: colors.primary },
  lineEnd: {
    width: 14,
    height: 14,
    borderRadius: radius.pill,
    borderWidth: 3,
    borderColor: colors.sky,
    backgroundColor: colors.background,
  },
  heroTitle: { ...typography.title, fontFamily: fonts.extrabold, color: colors.ink },
  heroDetails: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  section: { gap: spacing.sm },
  indicatorCard: { gap: spacing.sm },
  indicatorTitle: { ...typography.heading, color: colors.text },
  tileGrid: { flexDirection: 'row', flexWrap: 'wrap', columnGap: spacing.md },
  recentHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  notice: { gap: spacing.sm },
  noticeTitle: { color: colors.text, ...typography.heading },
  message: { color: colors.textMuted, ...typography.body },
  alertRow: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  alertText: { flex: 1, color: colors.text, ...typography.body },
  link: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  linkText: { ...typography.body, fontFamily: fonts.bold, color: colors.primary },
})
