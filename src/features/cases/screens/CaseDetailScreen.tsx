import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native'
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
import { colors, fonts, radius, spacing, typography } from '@/theme/tokens'

import { CaseConversation } from '../components/CaseConversation'
import { CaseProgressDots } from '../components/CaseProgressDots'
import { getCaseActionMeta } from '../caseActionPresentation'
import { refreshCaseDetail } from '../refreshCaseDetail'
import type { CaseAction, CaseActionName, CaseStatus } from '../types'
import { useCaseActions, useCaseDetail, useCaseHistory } from '../useCases'

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

const WAITING: Record<CaseStatus, string> = {
  solicitado: 'Esperando que el área técnica la acepte',
  aceptado: 'Esperando que se asigne un técnico',
  asignado: 'Esperando que el técnico inicie el trabajo',
  en_ejecucion: 'Trabajo en curso',
  en_espera: 'Trabajo en pausa',
  reporte_enviado: 'Esperando la validación del reporte',
  validado: 'Esperando la aprobación del reporte',
  aprobado: 'Caso cerrado',
  rechazado: 'Solicitud rechazada',
  cancelado: 'Solicitud cancelada',
}

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
  const [menuVisible, setMenuVisible] = useState(false)
  const [dataVisible, setDataVisible] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

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
  const reportKey = (['enviar_reporte', 'validar_reporte', 'aprobar_reporte'] as const).find(
    (action) => allowed(action),
  )
  const reportStep = reportKey ? REPORT_STEPS[reportKey] : null
  const primaryAction = caseActionsAllowed.find(
    (action) => !['rechazar', 'cancelar'].includes(action),
  )
  const metaFor = (action: CaseAction) => getCaseActionMeta(action, item.assignedTo)

  const menu: SheetAction<MenuId>[] = [
    ...(reportStep && primaryAction ? [primaryAction] : []),
    ...caseActionsAllowed.filter((action) => action !== primaryAction),
  ].map((action) => ({
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

  const quick = menu[0]
  const nextStep = reportStep
    ? reportStep.next
    : primaryAction
      ? `Te toca: ${metaFor(primaryAction).label}`
      : WAITING[item.status]

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
  const overdue =
    item.overdueStage === 'aceptacion'
      ? 'Vencida · aceptación'
      : item.overdueStage === 'resolucion'
        ? 'Vencida · resolución'
        : null
  const dataRows = [
    { label: 'Solicita', value: item.requestingAreaName },
    { label: 'Atiende', value: item.targetAreaName },
    { label: 'Servicio', value: item.category },
    { label: 'Ubicación', value: item.location },
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
    <SafeAreaView edges={['bottom']} style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => void refreshDetail()} />
        }
      >
        <View style={styles.heading}>
          <View style={styles.toolbar}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Datos del caso"
              onPress={() => setDataVisible(true)}
              style={({ pressed }) => [styles.pill, pressed && styles.pressed]}
            >
              <Icon name="information-circle-outline" size={18} color={colors.text} />
              <Text style={styles.pillText}>Datos del caso</Text>
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
          {item.status === 'rechazado' || item.status === 'cancelado' ? null : (
            <CaseProgressDots status={item.status} />
          )}
          <Text style={styles.meta}>
            {item.caseNumber} · {statusMeta[item.status].label}
            {item.priority === 'alta' ? ' · Prioridad alta' : ''}
            {overdue ? <Text style={styles.overdue}> · {overdue}</Text> : null}
          </Text>
        </View>

        <OfflineBanner />

        <CaseConversation item={item} events={history.data ?? []} nextStep={nextStep}>
          {history.isLoading ? <SkeletonList count={2} /> : null}
          {history.error ? (
            <Text style={styles.error}>No fue posible cargar el historial.</Text>
          ) : null}
          {REPORT_STATUSES.includes(item.status) ? (
            <View style={styles.reportRow}>
              <View style={styles.reportIcon}>
                <Icon name="document-text-outline" size={16} color={colors.white} />
              </View>
              <View style={styles.reportBody}>
                <ReportSummary
                  item={item}
                  beforeEditable={allowed('fotos_antes')}
                  afterEditable={allowed('fotos_despues')}
                  userId={profile?.id}
                  onOpen={() => navigation.navigate('CaseReport', { caseId })}
                  onReview={() => navigation.navigate('ReportReview', { caseId })}
                />
              </View>
            </View>
          ) : null}
        </CaseConversation>
      </ScrollView>

      {primaryLabel || quick ? (
        <View accessibilityRole="toolbar" style={styles.actionBar}>
          {primaryLabel ? (
            <View style={styles.primarySlot}>
              <Button label={primaryLabel} onPress={runPrimary} />
            </View>
          ) : null}
          {quick ? (
            <View style={styles.secondarySlot}>
              <Button
                label={menu.length > 1 ? 'Más' : quick.label}
                variant={menu.length === 1 && quick.destructive ? 'danger' : 'secondary'}
                onPress={() => (menu.length > 1 ? setMenuVisible(true) : runMenu(quick.id))}
              />
            </View>
          ) : null}
        </View>
      ) : null}

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
          <View key={row.label} style={styles.dataRow}>
            <Text style={styles.dataLabel}>{row.label}</Text>
            <Text style={styles.dataValue}>{row.value}</Text>
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
  content: { gap: spacing.lg, padding: spacing.md, paddingBottom: spacing.xl },
  heading: { gap: spacing.base },
  toolbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
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
  actionBar: {
    flexDirection: 'row',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
  primarySlot: { flex: 2 },
  secondarySlot: { flex: 1 },
  dataRow: {
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  dataLabel: { ...typography.body, color: colors.textMuted },
  dataValue: {
    ...typography.body,
    fontFamily: fonts.semibold,
    color: colors.text,
    flexShrink: 1,
    textAlign: 'right',
  },
  error: { ...typography.body, color: colors.error },
})
