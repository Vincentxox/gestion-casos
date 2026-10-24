import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { ActionSheet, type SheetAction } from '@/components/actions/ActionSheet'
import { RequestState } from '@/components/feedback/RequestState'
import { OfflineBanner } from '@/components/feedback/OfflineBanner'
import { BottomSheet } from '@/components/sheets/BottomSheet'
import { Button } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'
import { SkeletonList } from '@/components/ui/SkeletonList'
import { ReportSummary } from '@/features/reports/components/ReportSummary'
import type { MainStackParamList } from '@/navigation/types'
import { useAuthStore } from '@/store/authStore'
import { priorityMeta, statusMeta } from '@/theme/statusMeta'
import { colors, fonts, phaseColors, radius, spacing, typography } from '@/theme/tokens'
import { getErrorMessage } from '@/utils/errorMessage'

import { CaseMessages } from '../components/CaseMessages'
import { CaseTracking } from '../components/CaseTracking'
import { getCaseTrackingSteps } from '../caseTracking'
import { getCaseActionMeta } from '../caseActionPresentation'
import { getNextWorkflowAction, getWaitingPresentation } from '../caseWorkflow'
import { refreshCaseDetail } from '../refreshCaseDetail'
import { caseMessageSchema } from '../schemas'
import type { CaseAction, CaseActionName, CaseStatus } from '../types'
import { useCaseActions, useCaseDetail, useCaseHistory, useSendCaseMessage } from '../useCases'

type Props = NativeStackScreenProps<MainStackParamList, 'CaseDetail'>

type MenuId = CaseAction | 'editar'

const REPORT_STATUSES: CaseStatus[] = [
  'asignado',
  'en_ejecucion',
  'en_espera',
  'reporte_enviado',
  'validado',
  'aprobado',
]

const REPORT_STEPS = {
  enviar_reporte: { label: 'Completar reporte', next: 'Te toca completar el reporte' },
  validar_reporte: { label: 'Revisar y validar', next: 'Te toca validar el reporte' },
  aprobar_reporte: { label: 'Revisar y aprobar', next: 'Te toca aprobar el reporte' },
} as const

export function CaseDetailScreen({ navigation, route }: Props) {
  const { caseId } = route.params
  const queryClient = useQueryClient()
  const profile = useAuthStore((state) => state.profile)
  const detail = useCaseDetail(caseId)
  const caseActions = useCaseActions(caseId)
  const history = useCaseHistory(caseId)
  const sendMessage = useSendCaseMessage(caseId)
  const [menuVisible, setMenuVisible] = useState(false)
  const [dataVisible, setDataVisible] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [messageDraft, setMessageDraft] = useState('')
  const [messageError, setMessageError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'tracking' | 'messages'>('tracking')
  const scrollRef = useRef<ScrollView>(null)
  const messageCount = (history.data ?? []).filter((event) => event.action === 'mensaje').length

  useEffect(() => {
    if (activeTab === 'messages') scrollRef.current?.scrollToEnd({ animated: false })
  }, [activeTab, messageCount])

  async function submitMessage() {
    if (sendMessage.isPending) return
    const parsed = caseMessageSchema.safeParse(messageDraft)
    if (!parsed.success) {
      setMessageError(parsed.error.issues[0]?.message ?? 'Revisa el mensaje.')
      return
    }
    setMessageError(null)
    try {
      await sendMessage.mutateAsync(parsed.data)
      setMessageDraft('')
      scrollRef.current?.scrollToEnd({ animated: true })
    } catch (error) {
      setMessageError(
        getErrorMessage(error, 'No fue posible enviar el mensaje. Inténtalo de nuevo.'),
      )
    }
  }

  async function refreshDetail() {
    setRefreshing(true)
    try {
      await refreshCaseDetail(queryClient, caseId)
    } finally {
      setRefreshing(false)
    }
  }

  if (detail.isLoading) {
    return <RequestState kind="loading" title="Cargando solicitud…" />
  }

  if (detail.error || !detail.data) {
    return (
      <RequestState
        kind="error"
        title="No fue posible cargar la solicitud"
        onRetry={() => void detail.refetch()}
      />
    )
  }

  if (caseActions.error) {
    return (
      <RequestState
        kind="error"
        title="No fue posible cargar las acciones de esta solicitud"
        onRetry={() => void caseActions.refetch()}
      />
    )
  }

  const item = detail.data
  const allowed = (action: CaseActionName) => caseActions.data?.[action]?.allowed === true
  const caseActionsAllowed = (
    ['aceptar', 'rechazar', 'cancelar', 'asignar', 'iniciar', 'pausar', 'reanudar'] as CaseAction[]
  ).filter((action) => allowed(action))
  const workflowAction = getNextWorkflowAction(item.status)
  const reportKey = (['enviar_reporte', 'validar_reporte', 'aprobar_reporte'] as const).find(
    (action) => action === workflowAction && allowed(action),
  )
  const reportStep = reportKey ? REPORT_STEPS[reportKey] : null
  const primaryAction = caseActionsAllowed.find((action) => action === workflowAction)
  const metaFor = (action: CaseAction) => getCaseActionMeta(action, item.assignedTo)

  const menu: SheetAction<MenuId>[] = caseActionsAllowed
    .filter((action) => action !== primaryAction)
    .map((action) => ({
      id: action,
      label: metaFor(action).label,
      description: metaFor(action).description,
      icon: metaFor(action).icon,
      destructive: ['rechazar', 'cancelar'].includes(action),
    }))
  if (allowed('editar_datos'))
    menu.push({
      id: 'editar',
      label: 'Editar solicitud',
      description: 'Corrige el título, la descripción o la ubicación',
      icon: 'create-outline',
    })

  function runMenu(id: MenuId) {
    if (id === 'editar') navigation.navigate('EditCase', { caseId })
    else if (id === 'asignar') navigation.navigate('AssignCase', { caseId })
    else navigation.navigate('ChangeCaseStatus', { caseId, action: id })
  }

  function runPrimary() {
    if (reportKey)
      navigation.navigate(reportKey === 'enviar_reporte' ? 'CaseReport' : 'ReportReview', {
        caseId,
      })
    else if (primaryAction) runMenu(primaryAction)
  }

  const primaryLabel = reportStep?.label ?? (primaryAction ? metaFor(primaryAction).label : null)
  const waiting = getWaitingPresentation(item)
  const trackingSteps = getCaseTrackingSteps(
    item,
    history.data ?? [],
    primaryLabel ? 'Pendiente · te toca a ti' : (waiting?.tracking ?? ''),
  )
  const overdue =
    item.overdueStage === 'aceptacion'
      ? 'Vencida · aceptación'
      : item.overdueStage === 'resolucion'
        ? 'Vencida · resolución'
        : null
  const showOverdueReassign = Boolean(
    item.overdueStage && allowed('asignar') && workflowAction !== 'asignar',
  )
  const deadlineText =
    item.overdueStage === 'aceptacion'
      ? 'Se pasó el plazo de aceptación'
      : 'Se pasó el plazo de resolución'
  const dataRows = [
    { label: 'Solicita', value: item.requestingAreaName },
    { label: 'Atiende', value: item.targetAreaName },
    { label: 'Servicio', value: item.category },
    { label: 'Descripción', value: item.description, long: true },
    { label: 'Ubicación', value: item.location, long: true },
    {
      label: 'Prioridad',
      value: overdue
        ? `${priorityMeta[item.priority].label} · ${overdue.toLowerCase()}`
        : priorityMeta[item.priority].label,
    },
    { label: 'Técnico', value: item.assigneeName || 'Sin asignar' },
    { label: 'Creada', value: new Date(item.createdAt).toLocaleDateString('es-GT') },
  ]

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardArea}
      >
        <ScrollView
          ref={scrollRef}
          testID="case-detail-scroll"
          contentContainerStyle={[
            styles.content,
            (primaryLabel || showOverdueReassign) && styles.contentWithFooter,
          ]}
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={() => {
            if (activeTab === 'messages') scrollRef.current?.scrollToEnd({ animated: false })
          }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => void refreshDetail()} />
          }
        >
          <View style={styles.heading}>
            <View style={styles.toolbar}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Volver"
                onPress={() => navigation.goBack()}
                style={({ pressed }) => [styles.round, pressed && styles.pressed]}
              >
                <Icon name="arrow-back" size={24} color={colors.primary} />
              </Pressable>
              <Text style={styles.caseNumber}>{item.caseNumber}</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Datos del caso"
                onPress={() => setDataVisible(true)}
                style={({ pressed }) => [styles.round, pressed && styles.pressed]}
              >
                <Icon name="information-circle-outline" size={22} color={colors.ink} />
              </Pressable>
              {menu.length > 0 ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Más acciones"
                  onPress={() => setMenuVisible(true)}
                  style={({ pressed }) => [styles.round, pressed && styles.pressed]}
                >
                  <Icon name="ellipsis-vertical" size={20} color={colors.text} />
                </Pressable>
              ) : null}
            </View>
            <Text accessibilityRole="header" style={styles.title}>
              {item.title}
            </Text>
            <View style={styles.metaRow}>
              <View
                style={[
                  styles.statusChip,
                  { backgroundColor: phaseColors[statusMeta[item.status].phase].bg },
                ]}
              >
                <Text
                  style={[
                    styles.statusChipText,
                    { color: phaseColors[statusMeta[item.status].phase].fg },
                  ]}
                >
                  {statusMeta[item.status].label}
                </Text>
              </View>
              <Text style={styles.meta}>
                {item.requestingAreaName} · {item.category}
              </Text>
            </View>
            {overdue ? <Text style={styles.overdue}>{overdue}</Text> : null}
            {!primaryLabel && waiting ? (
              <View style={[styles.turnBanner, styles.waitingBanner]}>
                <Icon name="time-outline" size={22} color={colors.textMuted} />
                <Text style={styles.waitingText}>{waiting.banner}</Text>
              </View>
            ) : null}
          </View>

          <OfflineBanner />

          <View style={styles.tabs}>
            <Pressable
              accessibilityRole="tab"
              accessibilityLabel="Seguimiento"
              accessibilityState={{ selected: activeTab === 'tracking' }}
              onPress={() => setActiveTab('tracking')}
              style={[styles.tab, activeTab === 'tracking' && styles.tabSelected]}
            >
              <Text style={[styles.tabText, activeTab === 'tracking' && styles.tabTextSelected]}>
                Seguimiento
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="tab"
              accessibilityLabel={`Mensajes${messageCount ? `, ${messageCount}` : ''}`}
              accessibilityState={{ selected: activeTab === 'messages' }}
              onPress={() => setActiveTab('messages')}
              style={[styles.tab, activeTab === 'messages' && styles.tabSelected]}
            >
              <Text style={[styles.tabText, activeTab === 'messages' && styles.tabTextSelected]}>
                Mensajes
              </Text>
              {messageCount ? <Text style={styles.messageBadge}>{messageCount}</Text> : null}
            </Pressable>
          </View>
          {history.isLoading ? (
            <SkeletonList count={2} />
          ) : history.error ? (
            <View>
              <Text style={styles.error}>No fue posible cargar el historial.</Text>
              <Button
                label="Reintentar historial"
                onPress={() => void history.refetch()}
                variant="secondary"
              />
            </View>
          ) : activeTab === 'tracking' ? (
            <CaseTracking
              steps={trackingSteps}
              events={history.data ?? []}
              description={item.description}
              location={item.location}
              report={
                REPORT_STATUSES.includes(item.status) ? (
                  <ReportSummary
                    item={item}
                    beforeEditable={allowed('fotos_antes')}
                    afterEditable={allowed('fotos_despues')}
                    userId={profile?.id}
                    onOpen={() => navigation.navigate('CaseReport', { caseId })}
                    onReview={() => navigation.navigate('ReportReview', { caseId })}
                  />
                ) : undefined
              }
            />
          ) : (
            <CaseMessages events={history.data ?? []} currentUserId={profile?.id} />
          )}
        </ScrollView>

        {activeTab === 'messages' && allowed('mensaje') ? (
          <View style={styles.composer}>
            <TextInput
              accessibilityLabel="Escribir mensaje"
              placeholder="Escribe un mensaje…"
              placeholderTextColor={colors.textMuted}
              multiline
              maxLength={500}
              value={messageDraft}
              onChangeText={(value) => {
                setMessageDraft(value)
                if (messageError) setMessageError(null)
              }}
              style={styles.messageInput}
            />
            <Button
              label="Enviar"
              onPress={() => void submitMessage()}
              loading={sendMessage.isPending}
              disabled={sendMessage.isPending}
              containerStyle={styles.sendButton}
            />
            {messageError ? (
              <Text accessibilityRole="alert" style={styles.messageError}>
                {messageError}
              </Text>
            ) : null}
          </View>
        ) : null}

        {activeTab === 'tracking' && (primaryLabel || showOverdueReassign) ? (
          <View accessibilityRole="toolbar" style={styles.actionBar}>
            {showOverdueReassign ? (
              <View style={styles.overdueReassign}>
                <Text style={styles.deadlineText}>{deadlineText}</Text>
                <Button
                  label="Reasignar personal"
                  icon="person"
                  variant="secondary"
                  style={styles.secondaryButton}
                  onPress={() => runMenu('asignar')}
                />
              </View>
            ) : null}
            {primaryLabel ? (
              <>
                <Text style={styles.yourTurn}>Te toca a ti</Text>
                <Button label={primaryLabel} onPress={runPrimary} />
              </>
            ) : null}
          </View>
        ) : null}
      </KeyboardAvoidingView>

      <ActionSheet<MenuId>
        title="Más acciones"
        subtitle={`${item.caseNumber} · ${statusMeta[item.status].label}`}
        actions={menu}
        visible={menuVisible && menu.length > 0}
        onClose={() => setMenuVisible(false)}
        onSelect={(id) => {
          setMenuVisible(false)
          runMenu(id)
        }}
      />

      <BottomSheet
        title="Datos del caso"
        subtitle={item.caseNumber}
        visible={dataVisible}
        onClose={() => setDataVisible(false)}
        fitContent
      >
        {dataRows.map((row) => (
          <View key={row.label} style={[styles.dataRow, row.long && styles.dataRowLong]}>
            <Text style={styles.dataLabel}>{row.label}</Text>
            <Text style={[styles.dataValue, row.long && styles.dataValueLong]}>{row.value}</Text>
          </View>
        ))}
        <Button
          label="Ver recursos y mano de obra"
          icon="cube-outline"
          variant="secondary"
          onPress={() => {
            setDataVisible(false)
            navigation.navigate('CaseResources', { caseId })
          }}
        />
      </BottomSheet>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  keyboardArea: { flex: 1 },
  content: { gap: spacing.lg, padding: spacing.md, paddingBottom: spacing.xl },
  contentWithFooter: { paddingBottom: 96 },
  heading: { gap: spacing.base },
  toolbar: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  caseNumber: { ...typography.heading, color: colors.textMuted, flex: 1 },
  pill: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceMuted,
  },
  pillText: { ...typography.caption, fontFamily: fonts.semibold, color: colors.text },
  round: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceMuted,
  },
  pressed: { opacity: 0.7 },
  title: {
    fontFamily: fonts.extrabold,
    fontSize: 24,
    lineHeight: 28,
    letterSpacing: -0.6,
    color: colors.ink,
  },
  meta: { ...typography.caption, color: colors.textMuted },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  statusChip: {
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    overflow: 'hidden',
  },
  statusChipText: { ...typography.caption },
  turnBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.base,
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.primarySoft,
  },
  waitingBanner: { backgroundColor: colors.surfaceMuted },
  waitingText: { ...typography.body, color: colors.textMuted, flex: 1 },
  tabs: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: colors.border },
  tab: {
    flex: 1,
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  tabSelected: { borderBottomColor: colors.primary },
  tabText: { ...typography.heading, color: colors.textMuted },
  tabTextSelected: { color: colors.ink },
  messageBadge: {
    ...typography.caption,
    color: colors.white,
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
  },
  overdue: { fontFamily: fonts.semibold, color: colors.error },
  reportRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.base },
  reportIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.sky,
  },
  reportBody: { flex: 1 },
  composer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-end',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
  messageInput: {
    ...typography.body,
    flex: 1,
    minHeight: 44,
    maxHeight: 110,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    color: colors.text,
    backgroundColor: colors.surfaceMuted,
  },
  sendButton: { minWidth: 82 },
  messageError: { ...typography.caption, color: colors.error, width: '100%' },
  actionBar: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
  yourTurn: {
    ...typography.label,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  overdueReassign: { gap: spacing.sm },
  deadlineText: { ...typography.caption, textAlign: 'center', color: colors.textMuted },
  secondaryButton: { borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  dataRow: {
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  dataRowLong: { alignItems: 'flex-start', flexDirection: 'column', paddingVertical: spacing.sm },
  dataLabel: { ...typography.body, color: colors.textMuted },
  dataValue: {
    ...typography.body,
    fontFamily: fonts.semibold,
    color: colors.text,
    flexShrink: 1,
    textAlign: 'right',
  },
  dataValueLong: { textAlign: 'left', alignSelf: 'stretch' },
  error: { ...typography.body, color: colors.error },
})
