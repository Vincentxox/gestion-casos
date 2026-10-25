import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { useFocusEffect } from '@react-navigation/native'
import { useCallback, useEffect, useState } from 'react'
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { NexoLogo } from '@/components/branding/NexoLogo'
import { ROLE_LABELS } from '@/features/auth/types'
import { OfflineBanner } from '@/components/feedback/OfflineBanner'
import { useFeedbackDialogOpen } from '@/components/feedback/AppFeedback'
import { RequestState } from '@/components/feedback/RequestState'
import { Icon } from '@/components/ui/Icon'
import { Avatar } from '@/components/ui/Avatar'
import { OPEN_CASE_STATUSES } from '@/features/cases/caseSearch'
import { useCaseCounts } from '@/features/cases/useCases'
import { getTutorialFor } from '@/features/help/helpContent'
import { TourTarget } from '@/features/help/tour/TourTarget'
import { useGuidedTour } from '@/features/help/tour/useGuidedTour'
import { getTourProgress } from '@/features/help/tour/tourProgress'
import { notificationTimeLabel } from '@/features/notifications/notificationPresentation'
import { useNotifications } from '@/features/notifications/useNotifications'
import type { MainTabParamList, RootStackParamList } from '@/navigation/types'
import { useAuthStore } from '@/store/authStore'
import { colors, fonts, phaseColors, radius, spacing, tone, typography } from '@/theme/tokens'

import {
  getHomeCaseCards,
  getHomeCaseView,
  getTodayNotifications,
  NEXT_STEP_BUTTON_LABELS,
  NEXT_STEP_LABELS,
} from './homePresentation'
import { useHomeSummary } from './useHomeSummary'
import { useNextSteps } from './useNextSteps'

type Props = BottomTabScreenProps<MainTabParamList, 'Home'>

const CARD_TONES = {
  danger: colors.error,
  new: phaseColors.nueva.fg,
  course: phaseColors.curso.fg,
  review: phaseColors.revision.fg,
} as const

export function HomeScreen({ navigation }: Props) {
  const profile = useAuthStore((state) => state.profile)
  const feedbackDialogOpen = useFeedbackDialogOpen()
  const [focused, setFocused] = useState(false)
  useFocusEffect(
    useCallback(() => {
      setFocused(true)
      return () => setFocused(false)
    }, []),
  )
  const tourReady = useGuidedTour((state) => state.ready)
  const tourAutoShown = useGuidedTour((state) => state.autoShown)
  const tourSeen = useGuidedTour((state) => state.seen)
  const tourSkipped = useGuidedTour((state) => state.skipped)
  const startTour = useGuidedTour((state) => state.start)
  const enabled = Boolean(profile?.organizationId)
  const summary = useHomeSummary(enabled)
  const nextSteps = useNextSteps(enabled)
  const notifications = useNotifications()
  const homeCaseView = profile
    ? getHomeCaseView(profile.role, summary.data?.area_kind ?? null)
    : null
  const countScope = homeCaseView?.scope
  const counts = useCaseCounts(
    {
      scope: countScope ?? 'todas',
      statuses: OPEN_CASE_STATUSES,
      priorities: null,
      createdFrom: null,
      createdTo: null,
      overdueOnly: false,
      unassignedOnly: false,
      searchText: null,
      sort: 'recientes',
    },
    enabled && Boolean(countScope),
  )
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
        if (countScope) void refetchCounts()
        void refetchNotifications()
      }
    }, [enabled, countScope, refetchSummary, refetchNext, refetchCounts, refetchNotifications]),
  )
  const openNotifications = () =>
    navigation
      .getParent<NativeStackNavigationProp<RootStackParamList>>()
      ?.navigate('NotificationsFlow')
  const items = nextSteps.data?.items ?? []
  const currentStep = items[0]
  const caseCards = getHomeCaseCards(counts.data ?? [])
  const overdueCount = caseCards.find((card) => card.key === 'vencidas')?.count ?? 0
  const inProgressCount = caseCards.find((card) => card.key === 'en_curso')?.count ?? 0
  const attentionLoading = homeCaseView
    ? counts.isLoading || nextSteps.isLoading
    : summary.isLoading
  const attentionError = counts.isError || nextSteps.isError || (!homeCaseView && summary.isError)
  const attentionReady = Boolean(homeCaseView) && !attentionLoading && !attentionError
  useEffect(() => {
    if (!focused || !profile || !tourReady || tourAutoShown || feedbackDialogOpen) return
    const steps = getTutorialFor(profile.role, '', Boolean(profile.areaId))
    const launch = () =>
      void startTour(
        steps,
        Math.max(
          0,
          steps.findIndex((step) => !tourSeen.includes(step.id)),
        ),
        false,
        true,
      )
    if (!attentionLoading || attentionError) {
      launch()
      return
    }
    const timer = setTimeout(launch, 2000)
    return () => clearTimeout(timer)
  }, [
    focused,
    profile,
    tourReady,
    tourAutoShown,
    tourSeen,
    startTour,
    attentionLoading,
    attentionError,
    feedbackDialogOpen,
  ])
  if (!profile) return null
  const overdueMessage =
    profile.role === 'solicitante'
      ? overdueCount === 1
        ? 'Pasó su plazo; el área técnica ya fue avisada'
        : 'Pasaron su plazo; el área técnica ya fue avisada'
      : overdueCount === 1
        ? 'Pasó su plazo; atiéndela primero'
        : 'Pasaron su plazo; atiéndelas primero'
  const today = getTodayNotifications(notifications.data ?? [], now)
  const areaName = profile.areaName || 'Administración'
  const tutorialSteps = getTutorialFor(profile.role, '', Boolean(profile.areaId))
  const tourProgress = getTourProgress(tutorialSteps, tourSeen)

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
              if (countScope) void counts.refetch()
              void notifications.refetch()
            }}
          />
        }
      >
        <View style={styles.brandRow}>
          <View style={styles.brand}>
            <NexoLogo size={30} />
            <View>
              <Text accessibilityRole="header" style={styles.areaName}>
                {areaName}
              </Text>
              <Text style={styles.roleName}>{ROLE_LABELS[profile.role]}</Text>
            </View>
          </View>
          <View style={styles.headerActions}>
            <TourTarget id="home-bell">
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
            </TourTarget>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Abrir perfil"
              onPress={() => navigation.navigate('Profile')}
              style={styles.profileAction}
            >
              <Avatar
                name={profile.fullName}
                id={profile.id}
                avatarPath={profile.avatarUrl}
                size={36}
              />
            </Pressable>
          </View>
        </View>

        <OfflineBanner />
        <TourTarget id="home-attention">
          {attentionLoading && !attentionError ? (
            <View
              accessibilityLabel="Cargando atención de Inicio"
              style={styles.attentionLoading}
            />
          ) : null}
          {attentionReady && overdueCount > 0 ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${overdueCount} ${overdueCount === 1 ? 'solicitud vencida' : 'solicitudes vencidas'}. ${overdueMessage}`}
              onPress={() =>
                navigation.navigate('CasesTab', {
                  screen: 'Cases',
                  params: { scope: homeCaseView!.scope, status: 'abiertas', overdueOnly: true },
                })
              }
              style={({ pressed }) => [
                styles.attentionCard,
                styles.attentionDanger,
                pressed && styles.pressedRow,
              ]}
            >
              <View style={[styles.attentionIcon, styles.attentionDangerIcon]}>
                <Icon name="warning-outline" color={colors.dangerText} size={22} />
              </View>
              <View style={styles.attentionCopy}>
                <Text style={[styles.attentionTitle, styles.attentionDangerText]}>
                  {overdueCount} {overdueCount === 1 ? 'solicitud vencida' : 'solicitudes vencidas'}
                </Text>
                <Text style={styles.attentionDescription}>{overdueMessage}</Text>
              </View>
              <Icon name="chevron-forward" color={colors.dangerText} size="inline" />
            </Pressable>
          ) : null}
          {attentionReady && overdueCount === 0 && currentStep ? (
            <View style={styles.attentionGroup}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${NEXT_STEP_LABELS[currentStep.action]}. ${currentStep.title}. ${NEXT_STEP_BUTTON_LABELS[currentStep.action]}, abre el detalle`}
                onPress={() =>
                  navigation.navigate('CasesTab', {
                    screen: 'CaseDetail',
                    params: { caseId: currentStep.id },
                    initial: false,
                  })
                }
                style={[styles.attentionCard, styles.attentionInfo]}
              >
                <View style={[styles.attentionIcon, styles.attentionInfoIcon]}>
                  <Icon name="arrow-forward-circle-outline" color={colors.primary} size={22} />
                </View>
                <View style={styles.attentionCopy}>
                  <Text style={[styles.attentionTitle, styles.attentionInfoText]}>
                    {NEXT_STEP_LABELS[currentStep.action]}
                  </Text>
                  <Text style={styles.attentionDescription} numberOfLines={2}>
                    {currentStep.title}
                  </Text>
                </View>
              </Pressable>
              {(nextSteps.data?.total ?? items.length) > 1 ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Ver ${(nextSteps.data?.total ?? items.length) - 1} ${(nextSteps.data?.total ?? items.length) === 2 ? 'paso' : 'pasos'} más en Solicitudes`}
                  onPress={() =>
                    navigation.navigate('CasesTab', {
                      screen: 'Cases',
                      params: { scope: homeCaseView!.scope, status: 'abiertas' },
                    })
                  }
                  style={styles.moreSteps}
                >
                  <Text style={styles.actionText}>
                    y {(nextSteps.data?.total ?? items.length) - 1} más ›
                  </Text>
                </Pressable>
              ) : null}
            </View>
          ) : null}
          {attentionReady && overdueCount === 0 && !currentStep ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Todo a tiempo. ${inProgressCount === 0 ? 'Nada en curso' : `${inProgressCount} ${inProgressCount === 1 ? 'trabajo en curso' : 'trabajos en curso'}, ninguno vencido`}. Ver`}
              onPress={() =>
                navigation.navigate('CasesTab', {
                  screen: 'Cases',
                  params: { scope: homeCaseView!.scope, status: 'abiertas' },
                })
              }
              style={({ pressed }) => [
                styles.attentionCard,
                styles.attentionSuccess,
                pressed && styles.pressedRow,
              ]}
            >
              <View style={[styles.attentionIcon, styles.attentionSuccessIcon]}>
                <Icon name="checkmark" color={colors.success} size={22} />
              </View>
              <View style={styles.attentionCopy}>
                <Text style={[styles.attentionTitle, styles.attentionSuccessText]}>
                  Todo a tiempo
                </Text>
                <Text style={styles.attentionDescription}>
                  {inProgressCount === 0
                    ? 'Nada en curso'
                    : `${inProgressCount} ${inProgressCount === 1 ? 'trabajo en curso' : 'trabajos en curso'}, ninguno vencido`}
                </Text>
              </View>
            </Pressable>
          ) : null}
        </TourTarget>
        <View style={styles.section}>
          <View style={styles.sectionTitleRow}>
            <Text accessibilityRole="header" style={styles.sectionTitle}>
              {homeCaseView?.title ?? 'Solicitudes'}
            </Text>
            {homeCaseView ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Ver todas las solicitudes abiertas"
                onPress={() =>
                  navigation.navigate('CasesTab', {
                    screen: 'Cases',
                    params: { scope: homeCaseView.scope, status: 'abiertas' },
                  })
                }
                style={styles.smallAction}
              >
                <Text style={styles.actionText}>Ver todas</Text>
              </Pressable>
            ) : null}
          </View>
          {!homeCaseView && summary.isError ? (
            <RequestState
              kind="error"
              title="No pudimos cargar tus solicitudes"
              onRetry={() => void summary.refetch()}
            />
          ) : !homeCaseView || counts.isLoading ? (
            <RequestState kind="loading" title="Cargando tus solicitudes…" />
          ) : null}
          {counts.isError ? (
            <RequestState
              kind="error"
              title="No pudimos cargar tus solicitudes"
              onRetry={() => void counts.refetch()}
            />
          ) : null}
          {homeCaseView && !counts.isLoading && !counts.isError ? (
            <TourTarget id="home-area-grid" style={styles.caseGrid}>
              {caseCards
                .filter((card) => card.key !== 'vencidas')
                .map((card) => (
                  <Pressable
                    key={card.key}
                    accessibilityRole="button"
                    accessibilityLabel={`${card.label}, ${card.count} ${card.count === 1 ? 'solicitud' : 'solicitudes'}`}
                    onPress={() =>
                      navigation.navigate('CasesTab', {
                        screen: 'Cases',
                        params: {
                          scope: homeCaseView.scope,
                          status: 'abiertas',
                          ...card.filter,
                        },
                      })
                    }
                    style={({ pressed }) => [styles.caseTile, pressed && styles.pressedRow]}
                  >
                    <Text maxFontSizeMultiplier={1.3} style={styles.caseCount}>
                      {card.count}
                    </Text>
                    <View style={styles.caseTileLabel}>
                      <View style={[styles.caseDot, { backgroundColor: CARD_TONES[card.tone] }]} />
                      <Text numberOfLines={2} maxFontSizeMultiplier={1.3} style={styles.caseLabel}>
                        {card.label}
                      </Text>
                    </View>
                  </Pressable>
                ))}
            </TourTarget>
          ) : null}
        </View>

        {tourReady && !tourSkipped && !tourProgress.complete && tourProgress.nextStep ? (
          <View style={styles.firstStepsCard}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Aprende Nexo en ${tutorialSteps.length} pasos, ${tourProgress.seenCount} de ${tutorialSteps.length}. Sigue: ${tourProgress.nextStep.title}`}
              onPress={() => void startTour(tutorialSteps, tourProgress.nextIndex)}
              style={({ pressed }) => [
                styles.firstStepsAction,
                pressed && styles.firstStepsPressed,
              ]}
            >
              <View style={styles.firstStepsCopy}>
                <View style={styles.firstStepsHeading}>
                  <Text style={styles.firstStepsTitle}>
                    Aprende Nexo en {tutorialSteps.length} pasos
                  </Text>
                  <Text style={styles.firstStepsCount}>
                    {tourProgress.seenCount} de {tutorialSteps.length}
                  </Text>
                </View>
                <View style={styles.firstStepsTrack}>
                  <View
                    style={[
                      styles.firstStepsFill,
                      { width: `${(tourProgress.seenCount / tutorialSteps.length) * 100}%` },
                    ]}
                  />
                </View>
                <Text numberOfLines={1} style={styles.firstStepsNext}>
                  Sigue: {tourProgress.nextStep.title}
                </Text>
              </View>
              <Icon name="chevron-forward" color={colors.ink} />
            </Pressable>
          </View>
        ) : null}

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
              style={({ pressed }) => [styles.todayRow, pressed && styles.pressedRow]}
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
  brand: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  areaName: { ...typography.heading, color: colors.ink },
  roleName: { ...typography.caption, color: colors.textMuted },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  profileAction: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
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
    fontSize: 12,
    lineHeight: 18,
  },
  attentionLoading: {
    minHeight: 100,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceMuted,
  },
  attentionGroup: { gap: spacing.xs },
  attentionCard: {
    minHeight: 100,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderWidth: 1,
    borderRadius: radius.lg,
  },
  attentionDanger: { backgroundColor: tone.danger.bg, borderColor: tone.danger.border },
  attentionInfo: { backgroundColor: tone.info.bg, borderColor: tone.info.border },
  attentionSuccess: { backgroundColor: tone.success.bg, borderColor: tone.success.border },
  attentionIcon: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
  },
  attentionDangerIcon: { backgroundColor: colors.surface },
  attentionInfoIcon: { backgroundColor: colors.surface },
  attentionSuccessIcon: { backgroundColor: colors.surface },
  attentionCopy: { flex: 1, gap: spacing.xs },
  attentionTitle: { ...typography.heading },
  attentionDangerText: { color: tone.danger.text },
  attentionInfoText: { color: tone.info.text },
  attentionSuccessText: { color: tone.success.text },
  attentionDescription: { ...typography.caption, color: colors.textMuted },
  moreSteps: { minHeight: 44, alignSelf: 'flex-end', justifyContent: 'center' },
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
    backgroundColor: tone.info.bg,
    flexDirection: 'row',
    alignItems: 'center',
  },
  firstStepsAction: {
    flex: 1,
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
  },
  firstStepsPressed: { backgroundColor: colors.surfaceMuted },
  pressedRow: { backgroundColor: colors.surfaceMuted },
  firstStepsCopy: { flex: 1, gap: spacing.xs },
  firstStepsHeading: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm },
  firstStepsTitle: { ...typography.heading, color: colors.ink, flexShrink: 1 },
  firstStepsTrack: {
    height: 5,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  firstStepsFill: { height: '100%', backgroundColor: colors.primary },
  firstStepsCount: { ...typography.caption, fontFamily: fonts.semibold, color: colors.primary },
  firstStepsNext: { ...typography.caption, color: colors.textMuted },
  quietEmpty: { ...typography.body, color: colors.textMuted, paddingVertical: spacing.sm },
  caseGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  caseTile: {
    flexBasis: '30%',
    flexGrow: 1,
    height: 128,
    justifyContent: 'space-between',
    padding: spacing.md,
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  caseCount: { ...typography.display, color: colors.ink },
  caseTileLabel: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.xs },
  caseDot: { width: 8, height: 8, borderRadius: radius.pill, marginTop: 4 },
  caseLabel: { ...typography.caption, color: colors.textMuted, flexShrink: 1 },
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
