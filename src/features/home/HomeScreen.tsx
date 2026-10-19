import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { useFocusEffect } from '@react-navigation/native'
import { useCallback, useState } from 'react'
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import Svg, { Circle } from 'react-native-svg'

import { NexoLogo } from '@/components/branding/NexoLogo'
import { OfflineBanner } from '@/components/feedback/OfflineBanner'
import { RequestState } from '@/components/feedback/RequestState'
import { Icon } from '@/components/ui/Icon'
import { Avatar } from '@/components/ui/Avatar'
import { useCaseCounts } from '@/features/cases/useCases'
import { notificationTimeLabel } from '@/features/notifications/notificationPresentation'
import { useNotifications } from '@/features/notifications/useNotifications'
import type { MainTabParamList, RootStackParamList } from '@/navigation/types'
import { useAuthStore } from '@/store/authStore'
import { colors, fonts, phaseColors, radius, spacing, typography } from '@/theme/tokens'

import {
  getGreeting,
  getHomePhases,
  getTodayNotifications,
  NEXT_STEP_BUTTON_LABELS,
  NEXT_STEP_LABELS,
  NEXT_STEP_VISUALS,
  nextStepDeadlineLabel,
  nextStepDueMeta,
} from './homePresentation'
import { useFirstSteps } from './useFirstSteps'
import { useHomeSummary } from './useHomeSummary'
import { useNextSteps } from './useNextSteps'

type Props = BottomTabScreenProps<MainTabParamList, 'Home'>

const PHASES = [
  { key: 'por_aceptar', label: 'Por aceptar', color: phaseColors.nueva.fg, status: 'pendientes' },
  { key: 'en_curso', label: 'En curso', color: phaseColors.curso.fg, status: 'en_curso' },
  { key: 'en_revision', label: 'En revisión', color: phaseColors.revision.fg, status: 'en_curso' },
  { key: 'cerradas', label: 'Cerradas', color: phaseColors.cerrada.fg, status: 'cerradas' },
] as const

const RING_CIRCUMFERENCE = 2 * Math.PI * 25

export function HomeScreen({ navigation }: Props) {
  const profile = useAuthStore((state) => state.profile)
  const enabled = Boolean(profile?.organizationId)
  const summary = useHomeSummary(enabled)
  const nextSteps = useNextSteps(enabled)
  const notifications = useNotifications()
  const counts = useCaseCounts(
    {
      scope: 'mias',
      statuses: null,
      priority: null,
      updatedSince: null,
      searchText: null,
      sortPending: false,
    },
    enabled,
  )
  const firstSteps = useFirstSteps(profile?.id)
  const [nextIndex, setNextIndex] = useState(0)
  const [now, setNow] = useState(() => new Date())
  const refetchSummary = summary.refetch
  const refetchNext = nextSteps.refetch
  const refetchCounts = counts.refetch
  const refetchNotifications = notifications.refetch
  useFocusEffect(
    useCallback(() => {
      setNow(new Date())
      if (enabled) {
        void refetchSummary()
        void refetchNext()
        void refetchCounts()
        void refetchNotifications()
      }
    }, [enabled, refetchSummary, refetchNext, refetchCounts, refetchNotifications]),
  )
  if (!profile) return null

  const openNotifications = () =>
    navigation
      .getParent<NativeStackNavigationProp<RootStackParamList>>()
      ?.navigate('NotificationsFlow')
  const items = nextSteps.data?.items ?? []
  const currentIndex = items.length ? nextIndex % items.length : 0
  const currentStep = nextSteps.isError ? undefined : items[currentIndex]
  const phases = getHomePhases(counts.data ?? [])
  const today = getTodayNotifications(notifications.data ?? [], now)
  const rawFirstName = profile.fullName.trim().split(/\s+/)[0] || 'usuario'
  const firstName = rawFirstName.charAt(0).toLocaleUpperCase('es-GT') + rawFirstName.slice(1)
  const dateLabel = new Intl.DateTimeFormat('es-GT', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(now)
  const firstStepItems = [
    { id: 'profile', label: 'Revisa tu perfil', action: () => navigation.navigate('Profile') },
    {
      id: 'cases',
      label: 'Explora Solicitudes',
      action: () => navigation.navigate('CasesTab', { screen: 'Cases' }),
    },
    { id: 'notices', label: 'Conoce tus avisos', action: openNotifications },
    { id: 'help', label: 'Descubre la ayuda', action: () => navigation.navigate('Help') },
    {
      id: 'start',
      label: profile.role === 'administrador' ? 'Configura tu empresa' : 'Consulta una solicitud',
      action: () =>
        profile.role === 'administrador'
          ? navigation.navigate('Administration', { screen: 'AdministrationHome' })
          : navigation.navigate('CasesTab', { screen: 'Cases' }),
    },
  ]
  const nextFirstStep = firstStepItems.find((step) => !firstSteps.completed.includes(step.id))

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={summary.isRefetching}
            onRefresh={() => {
              void summary.refetch()
              void nextSteps.refetch()
              void counts.refetch()
              void notifications.refetch()
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
            accessibilityLabel={
              summary.isError
                ? 'Avisos, conteo no disponible'
                : `Avisos, ${summary.data?.notificaciones_sin_leer ?? 0} sin leer`
            }
            onPress={openNotifications}
            style={styles.bell}
          >
            <Icon name="notifications-outline" color={colors.text} size={21} />
            {(summary.data?.notificaciones_sin_leer ?? 0) > 0 ? (
              <Text style={styles.bellCount}>{summary.data?.notificaciones_sin_leer}</Text>
            ) : null}
          </Pressable>
        </View>

        <View style={styles.header}>
          <Text style={styles.eyebrow}>
            {dateLabel.charAt(0).toLocaleUpperCase('es-GT') + dateLabel.slice(1)}
          </Text>
          <Text accessibilityRole="header" style={styles.title}>
            {getGreeting(now.getHours())}, {firstName}
          </Text>
          <Text style={styles.subtitle}>{profile.areaName || 'Sin área asignada'}</Text>
        </View>

        <OfflineBanner />
        {firstSteps.loaded && !firstSteps.hidden ? (
          <View style={styles.firstStepsCard}>
            <View style={styles.sectionTitleRow}>
              <Text accessibilityRole="header" style={styles.sectionTitle}>
                Primeros pasos
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Ocultar Primeros pasos"
                onPress={firstSteps.hide}
                style={styles.smallAction}
              >
                <Icon name="close" color={colors.textMuted} size={20} />
              </Pressable>
            </View>
            <View style={styles.firstStepsBody}>
              <View
                accessibilityLabel={`${firstSteps.completed.length} de 5 pasos completados`}
                style={styles.progressRing}
              >
                <Svg width={60} height={60} viewBox="0 0 60 60">
                  <Circle
                    cx={30}
                    cy={30}
                    r={25}
                    stroke={colors.track}
                    strokeWidth={5}
                    fill="none"
                  />
                  <Circle
                    cx={30}
                    cy={30}
                    r={25}
                    stroke={colors.sky}
                    strokeWidth={5}
                    strokeDasharray={`${(RING_CIRCUMFERENCE * firstSteps.completed.length) / 5} ${RING_CIRCUMFERENCE}`}
                    strokeLinecap="round"
                    rotation={-90}
                    origin="30, 30"
                    fill="none"
                  />
                </Svg>
                <Text style={styles.progressText}>{firstSteps.completed.length}/5</Text>
              </View>
              <View style={styles.firstStepsCopy}>
                <Text style={styles.bodyText}>
                  {nextFirstStep ? 'Conoce Nexo Casos paso a paso.' : '¡Ya conoces lo esencial!'}
                </Text>
                {nextFirstStep ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={nextFirstStep.label}
                    onPress={() => {
                      firstSteps.complete(nextFirstStep.id)
                      nextFirstStep.action()
                    }}
                    style={styles.inlineAction}
                  >
                    <Text style={styles.actionText}>{nextFirstStep.label}</Text>
                    <Icon name="arrow-forward" size="inline" color={colors.primary} />
                  </Pressable>
                ) : null}
              </View>
            </View>
          </View>
        ) : null}

        <View style={styles.section}>
          <Text accessibilityRole="header" style={styles.sectionTitle}>
            Tu siguiente paso
          </Text>
          {nextSteps.isLoading ? (
            <RequestState kind="loading" title="Buscando tu siguiente paso…" />
          ) : null}
          {nextSteps.isError ? (
            <RequestState
              kind="error"
              title="No pudimos cargar tu siguiente paso"
              onRetry={() => void nextSteps.refetch()}
            />
          ) : null}
          {!nextSteps.isLoading && !nextSteps.isError && !currentStep ? (
            <Text style={styles.quietEmpty}>Estás al día</Text>
          ) : null}
          {currentStep ? (
            <View style={items.length > 1 ? styles.stackBack : undefined}>
              <View style={styles.stackCard}>
                <View style={styles.nextTop}>
                  <Text style={styles.stepCounter}>
                    {currentIndex + 1} de {nextSteps.data?.total ?? items.length}
                  </Text>
                  <Text style={[styles.deadline, currentStep.overdueStage && styles.overdue]}>
                    {nextStepDeadlineLabel(currentStep, now)}
                  </Text>
                </View>
                <View style={styles.nextActionRow}>
                  <View
                    style={[
                      styles.stepIcon,
                      {
                        backgroundColor:
                          phaseColors[NEXT_STEP_VISUALS[currentStep.action].phase].bg,
                      },
                    ]}
                  >
                    <Icon
                      name={NEXT_STEP_VISUALS[currentStep.action].icon}
                      color={phaseColors[NEXT_STEP_VISUALS[currentStep.action].phase].fg}
                    />
                  </View>
                  <Text style={styles.nextAction}>{NEXT_STEP_LABELS[currentStep.action]}</Text>
                </View>
                <Text style={styles.nextCase}>{currentStep.title}</Text>
                <Text style={styles.nextMeta}>
                  {currentStep.caseNumber} · prioridad {currentStep.priority} ·{' '}
                  {nextStepDueMeta(currentStep, now)}
                </Text>
                <View style={styles.nextActions}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Luego"
                    onPress={() => setNextIndex((value) => value + 1)}
                    style={styles.secondaryAction}
                  >
                    <Text style={styles.secondaryText}>Luego</Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`${NEXT_STEP_BUTTON_LABELS[currentStep.action]} ${currentStep.caseNumber}, abre el detalle`}
                    onPress={() =>
                      navigation.navigate('CasesTab', {
                        screen: 'CaseDetail',
                        params: { caseId: currentStep.id },
                        initial: false,
                      })
                    }
                    style={styles.primaryAction}
                  >
                    <Text style={styles.primaryText}>
                      {NEXT_STEP_BUTTON_LABELS[currentStep.action]}
                    </Text>
                    <Icon name="arrow-forward" size="inline" color={colors.white} />
                  </Pressable>
                </View>
              </View>
            </View>
          ) : null}
        </View>

        <View style={styles.section}>
          <Text accessibilityRole="header" style={styles.sectionTitle}>
            Tus solicitudes
          </Text>
          {counts.isLoading ? (
            <RequestState kind="loading" title="Cargando tus solicitudes…" />
          ) : null}
          {counts.isError ? (
            <RequestState
              kind="error"
              title="No pudimos cargar tus solicitudes"
              onRetry={() => void counts.refetch()}
            />
          ) : null}
          {!counts.isLoading && !counts.isError ? (
            <View style={styles.phaseCard}>
              <Text style={styles.phaseTotal}>{phases.total} abiertas y cerradas</Text>
              <View style={styles.phaseBar}>
                {PHASES.map((phase) => {
                  const value = phases[phase.key]
                  return value > 0 ? (
                    <View key={phase.key} style={{ flex: value, backgroundColor: phase.color }} />
                  ) : null
                })}
                {phases.total === 0 ? <View style={styles.phaseEmpty} /> : null}
              </View>
              <View style={styles.phaseLegend}>
                {PHASES.map((phase) => (
                  <Pressable
                    key={phase.key}
                    accessibilityRole="button"
                    accessibilityLabel={`${phase.label}, ${phases[phase.key]} ${phases[phase.key] === 1 ? 'solicitud' : 'solicitudes'}`}
                    onPress={() =>
                      navigation.navigate('CasesTab', {
                        screen: 'Cases',
                        params: {
                          scope: 'mias',
                          status: phase.status,
                          ...(phase.key === 'por_aceptar' ? { exactStatus: 'solicitado' } : {}),
                        },
                      })
                    }
                    style={styles.phaseItem}
                  >
                    <View style={[styles.phaseDot, { backgroundColor: phase.color }]} />
                    <Text style={styles.phaseLabel}>
                      {phase.label} {phases[phase.key]}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          ) : null}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionTitleRow}>
            <Text accessibilityRole="header" style={styles.sectionTitle}>
              Hoy
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Ver todos los avisos"
              onPress={openNotifications}
              style={styles.smallAction}
            >
              <Text style={styles.actionText}>Ver todo</Text>
            </Pressable>
          </View>
          {notifications.isLoading ? (
            <RequestState kind="loading" title="Cargando novedades…" />
          ) : null}
          {notifications.isError ? (
            <RequestState
              kind="error"
              title="No pudimos cargar las novedades"
              onRetry={() => void notifications.refetch()}
            />
          ) : null}
          {!notifications.isLoading && !notifications.isError && today.length === 0 ? (
            <Text style={styles.quietEmpty}>Sin novedades hoy</Text>
          ) : null}
          {today.map((item) => (
            <Pressable
              key={item.id}
              accessibilityRole="button"
              accessibilityLabel={`${item.title}, ${item.caseNumber ?? 'solicitud'}`}
              onPress={() =>
                navigation.navigate('CasesTab', {
                  screen: 'CaseDetail',
                  params: { caseId: item.caseId },
                  initial: false,
                })
              }
              style={styles.todayRow}
            >
              {item.actorName ? (
                <Avatar name={item.actorName} id={item.actorId ?? item.actorName} size={44} />
              ) : (
                <View style={styles.todayIcon}>
                  <Icon
                    name={
                      item.action === 'mensaje' ? 'chatbubble-outline' : 'notifications-outline'
                    }
                    size={20}
                    color={colors.primary}
                  />
                </View>
              )}
              <View style={styles.todayCopy}>
                <Text style={styles.todayTitle}>
                  {item.action === 'mensaje' && item.actorName
                    ? `${item.actorName} escribió en ${item.caseNumber ?? item.caseTitle ?? 'una solicitud'}`
                    : item.title}
                </Text>
                {item.comment ? (
                  <Text numberOfLines={2} style={styles.todayComment}>
                    «{item.comment}»
                  </Text>
                ) : null}
                <Text style={styles.todayMeta}>
                  {item.action === 'mensaje' && item.actorName
                    ? ''
                    : `${item.caseNumber ?? item.caseTitle ?? 'Solicitud'} · `}
                  {notificationTimeLabel(item.createdAt, now)}
                </Text>
              </View>
              <Icon name="chevron-forward" size="inline" color={colors.textMuted} />
            </Pressable>
          ))}
        </View>
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
    paddingBottom: spacing.xl * 3,
  },
  brandRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  brand: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  wordmark: { fontFamily: fonts.extrabold, fontSize: 19, color: colors.ink },
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
    textAlign: 'center',
    borderRadius: radius.pill,
    overflow: 'hidden',
    backgroundColor: colors.sky,
    color: colors.white,
    ...typography.caption,
    fontSize: 11,
    lineHeight: 18,
  },
  header: { gap: spacing.xs },
  eyebrow: { ...typography.caption, color: colors.textMuted },
  title: { ...typography.display, fontSize: 34, lineHeight: 40, color: colors.ink },
  subtitle: { ...typography.caption, color: colors.textMuted },
  section: { gap: spacing.sm },
  sectionTitleRow: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: { ...typography.title, color: colors.ink },
  smallAction: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  actionText: { ...typography.caption, fontFamily: fonts.bold, color: colors.primary },
  firstStepsCard: {
    borderRadius: radius.lg,
    backgroundColor: colors.primarySoft,
    padding: spacing.md,
    gap: spacing.sm,
  },
  firstStepsBody: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  progressRing: {
    width: 60,
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressText: { ...typography.heading, color: colors.ink, position: 'absolute' },
  firstStepsCopy: { flex: 1, gap: spacing.xs },
  bodyText: { ...typography.body, color: colors.text },
  inlineAction: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  quietEmpty: { ...typography.body, color: colors.textMuted, paddingVertical: spacing.sm },
  stackBack: {
    paddingBottom: spacing.sm,
    paddingHorizontal: spacing.xs,
    borderRadius: radius.lg,
    backgroundColor: colors.primarySoft,
  },
  stackCard: {
    gap: spacing.sm,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
  },
  nextTop: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm },
  stepCounter: { ...typography.caption, color: colors.textMuted },
  deadline: { ...typography.caption, fontFamily: fonts.bold, color: colors.primary },
  overdue: { color: colors.dangerText },
  nextActionRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  stepIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextAction: { ...typography.title, color: colors.ink },
  nextCase: { ...typography.body, color: colors.text },
  nextMeta: { ...typography.caption, color: colors.textMuted },
  nextActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
  },
  secondaryAction: { minHeight: 44, paddingHorizontal: spacing.md, justifyContent: 'center' },
  secondaryText: { ...typography.caption, color: colors.textMuted },
  primaryAction: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
  },
  primaryText: { ...typography.caption, fontFamily: fonts.bold, color: colors.white },
  phaseCard: {
    padding: spacing.md,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
  },
  phaseTotal: { ...typography.caption, color: colors.textMuted },
  phaseBar: {
    height: 8,
    borderRadius: radius.pill,
    overflow: 'hidden',
    flexDirection: 'row',
    backgroundColor: colors.track,
  },
  phaseEmpty: { flex: 1, backgroundColor: colors.track },
  phaseLegend: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  phaseItem: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  phaseDot: { width: 8, height: 8, borderRadius: radius.pill },
  phaseLabel: { ...typography.caption, color: colors.text },
  todayRow: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  todayIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primarySoft,
  },
  todayCopy: { flex: 1, gap: spacing.xs },
  todayTitle: { ...typography.caption, fontFamily: fonts.bold, color: colors.text },
  todayComment: { ...typography.caption, color: colors.text },
  todayMeta: { ...typography.caption, color: colors.textMuted },
})
