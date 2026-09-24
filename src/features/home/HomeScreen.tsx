import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs'
import { useFocusEffect } from '@react-navigation/native'
import { useCallback, useState } from 'react'
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { StatTile } from '@/components/stats/StatTile'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Icon } from '@/components/ui/Icon'
import { IconTile } from '@/components/ui/IconTile'
import { EmptyState } from '@/components/feedback/EmptyState'
import { hasPermission } from '@/features/auth/permissions'
import { ROLE_LABELS } from '@/features/auth/types'
import { useCases } from '@/features/cases/useCases'
import { CaseCard } from '@/features/cases/components/CaseCard'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { SkeletonList } from '@/components/ui/SkeletonList'
import type { MainTabParamList } from '@/navigation/types'
import { useAuthStore } from '@/store/authStore'
import { colors, fonts, phaseColors, radius, spacing, typography } from '@/theme/tokens'

import {
  getAdminAlerts,
  getGreeting,
  getHomeHero,
  getHomeRecentCases,
  getHomeTileTarget,
  getHomeTiles,
} from './homePresentation'
import { useHomeSummary } from './useHomeSummary'

type Props = BottomTabScreenProps<MainTabParamList, 'Home'>

export function HomeScreen({ navigation }: Props) {
  const profile = useAuthStore((state) => state.profile)
  const summary = useHomeSummary(Boolean(profile?.organizationId))
  const showRecent = Boolean(profile?.organizationId)
  const cases = useCases(showRecent)
  const [today] = useState(() => new Date())
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
  const tiles = summary.data ? getHomeTiles(profile, summary.data).slice(0, 4) : []
  const hero = summary.data ? getHomeHero(profile, summary.data) : null
  const hasPending = Boolean(hero?.count || summary.data?.admin?.solicitudes_acceso_pendientes)
  const rawFirstName = profile.fullName.trim().split(/\s+/)[0] || 'usuario'
  const firstName = rawFirstName.charAt(0).toLocaleUpperCase('es-GT') + rawFirstName.slice(1)
  const rawDateLabel = new Intl.DateTimeFormat('es-GT', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(today)
  const dateLabel = rawDateLabel.charAt(0).toLocaleUpperCase('es-GT') + rawDateLabel.slice(1)
  const recentCases = getHomeRecentCases(profile, summary.data?.area_kind ?? null, cases.data ?? [])

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
          <View style={styles.headerTop}>
            <View style={styles.identity}>
              <Text style={styles.eyebrow}>{dateLabel}</Text>
              <Text accessibilityRole="header" style={styles.title}>
                {getGreeting(today.getHours())}, {firstName}
              </Text>
              <Text style={styles.subtitle}>
                {ROLE_LABELS[profile.role]} · {profile.areaName || 'Sin área asignada'}
              </Text>
            </View>
            <Pressable
              accessibilityLabel="Ver pendientes"
              accessibilityRole="button"
              onPress={() => {
                if (hero?.count)
                  navigation.navigate('CasesTab', { screen: 'Cases', params: hero.target })
                else if (summary.data?.admin?.solicitudes_acceso_pendientes)
                  navigation.navigate('Administration', { screen: 'AccessRequests' })
                else navigation.navigate('CasesTab', { screen: 'Cases' })
              }}
              style={styles.bell}
            >
              <Icon name="notifications-outline" color={colors.text} />
              {hasPending ? <View style={styles.notificationDot} /> : null}
            </Pressable>
            <Avatar name={profile.fullName} id={profile.id} size={44} />
          </View>
        </View>

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
              <Text style={styles.heroEyebrow}>{hero.eyebrow}</Text>
              <Text style={styles.heroTitle}>{hero.title}</Text>
              {hero.detail.length > 0 ? (
                <View style={styles.heroDetails}>
                  {hero.detail.map((part) => (
                    <View key={part} style={styles.heroTag}>
                      <Text style={styles.heroDetail}>{part}</Text>
                    </View>
                  ))}
                </View>
              ) : null}
              {hero.supportingText ? (
                <Text style={styles.heroSupport}>{hero.supportingText}</Text>
              ) : null}
              <View style={styles.heroButton}>
                <Button
                  label={hero.actionLabel}
                  icon="arrow-forward"
                  variant="secondary"
                  onPress={() =>
                    navigation.navigate('CasesTab', { screen: 'Cases', params: hero.target })
                  }
                />
              </View>
            </View>
          ) : (
            <Card>
              <EmptyState
                title="Todo al día"
                message="No tienes solicitudes pendientes en este momento."
                variant="allDone"
                compact
              />
            </Card>
          )
        ) : null}

        {alerts.length > 0 ? (
          <View style={styles.notice}>
            <View style={styles.alertHeading}>
              <IconTile icon="warning-outline" phase="detenida" size={36} />
              <Text style={styles.noticeTitle}>Completa la configuración</Text>
            </View>
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

        {!profile.areaId && profile.role !== 'administrador' && profile.role !== 'auditor' ? (
          <View style={styles.notice}>
            <Text style={styles.noticeTitle}>Área pendiente de asignación</Text>
            <Text style={styles.message}>
              Tu administrador aún no te asignó un área. Sin área no puedes crear solicitudes.
            </Text>
          </View>
        ) : null}
        {canCreate ? (
          <Button
            label="Nueva solicitud"
            icon="add"
            onPress={() => navigation.navigate('CasesTab', { screen: 'CreateCase' })}
          />
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
  content: { gap: spacing.lg, padding: spacing.lg, paddingBottom: spacing.xl },
  header: { gap: spacing.sm },
  headerTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.base },
  identity: { flex: 1, gap: spacing.xs },
  bell: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  notificationDot: {
    position: 'absolute',
    top: 7,
    right: 7,
    width: 8,
    height: 8,
    borderRadius: radius.pill,
    backgroundColor: phaseColors.nueva.fg,
  },
  eyebrow: { color: colors.primary, ...typography.overline },
  title: { color: colors.text, ...typography.display },
  subtitle: { color: colors.textMuted, ...typography.caption },
  hero: {
    gap: spacing.base,
    padding: spacing.lg,
    borderRadius: radius.xl,
    backgroundColor: colors.primary,
  },
  heroTitle: { ...typography.title, color: colors.white },
  heroEyebrow: { ...typography.overline, color: colors.white },
  heroDetails: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  heroTag: {
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.white,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.xs,
  },
  heroDetail: { ...typography.caption, color: colors.white },
  heroSupport: { ...typography.body, color: colors.white },
  heroButton: { width: '100%' },
  section: { gap: spacing.md },
  tileGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  recentHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  notice: {
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.warningSoft,
  },
  noticeTitle: { color: colors.text, ...typography.heading },
  alertHeading: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  message: { color: colors.textMuted, ...typography.body },
  alertRow: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  alertText: { flex: 1, color: colors.text, ...typography.body },
  link: { minHeight: 44, justifyContent: 'center' },
  linkText: { ...typography.body, fontFamily: fonts.bold, color: colors.primary },
})
