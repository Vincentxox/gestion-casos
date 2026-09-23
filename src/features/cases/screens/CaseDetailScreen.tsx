import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { useState, type ReactNode } from 'react'
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { PriorityBadge } from '@/components/badges/PriorityBadge'
import { StatusBadge } from '@/components/badges/StatusBadge'
import { ActionSheet } from '@/components/actions/ActionSheet'
import { Timeline } from '@/components/timeline/Timeline'
import { RequestState } from '@/components/feedback/RequestState'
import { StepIndicator } from '@/components/progress/StepIndicator'
import type { MainStackParamList } from '@/navigation/types'
import { useAuthStore } from '@/store/authStore'
import { colors, radius, spacing } from '@/theme/tokens'

import { useCaseDetail, useCaseHistory } from '../useCases'
import { canEditCase, getAvailableCaseActions } from '../casePermissions'
import type { CaseAction } from '../types'

type Props = NativeStackScreenProps<MainStackParamList, 'CaseDetail'>

function Field({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Text style={styles.fieldValue}>{value}</Text>
    </View>
  )
}

function DetailSection({ title, children }: { title: string; children: ReactNode }) {
  const [open, setOpen] = useState(true)
  return (
    <View style={styles.panel}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen(!open)}
        style={styles.sectionHeader}
      >
        <Text style={styles.panelTitle}>{title}</Text>
        <Text style={styles.actionChevron}>{open ? '⌄' : '›'}</Text>
      </Pressable>
      {open ? children : null}
    </View>
  )
}

export function CaseDetailScreen({ navigation, route }: Props) {
  const { caseId } = route.params
  const profile = useAuthStore((state) => state.profile)
  const detail = useCaseDetail(caseId)
  const history = useCaseHistory(caseId)
  const [actionsVisible, setActionsVisible] = useState(false)

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

  const item = detail.data
  const canUpdate = canEditCase(item, profile)
  const actions = getAvailableCaseActions(item, profile)
  const primaryAction = actions.find((action) => !['rechazar', 'cancelar'].includes(action))
  const otherActions = actions.filter((action) => action !== primaryAction)
  function navigateAction(action: CaseAction) {
    if (action === 'asignar') navigation.navigate('AssignCase', { caseId })
    else navigation.navigate('ChangeCaseStatus', { caseId, action })
  }
  return (
    <SafeAreaView edges={['bottom']} style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.heading}>
          <View style={styles.headingRow}>
            <Text style={styles.caseNumber}>{item.caseNumber}</Text>
            <StatusBadge status={item.status} />
          </View>
          <Text accessibilityRole="header" style={styles.title}>
            {item.title}
          </Text>
          <PriorityBadge priority={item.priority} />
          <StepIndicator status={item.status} />
        </View>

        <DetailSection title="Resumen">
          <Text style={styles.description}>{item.description}</Text>
          <Field label="Tipo de servicio" value={item.category} />
          <Field label="Ubicación" value={item.location} />
          <Field label="Creado" value={new Date(item.createdAt).toLocaleString('es-GT')} />
        </DetailSection>

        <DetailSection title="Personas">
          <Field label="Solicitante" value={item.creatorName} />
          <Field label="Área solicitante" value={item.requestingAreaName} />
          <Field label="Área técnica" value={item.targetAreaName} />
          <Field label="Responsable" value={item.assigneeName || 'Sin asignar'} />
        </DetailSection>

        <DetailSection title="Recursos utilizados">
          <Text style={styles.description}>
            Consulta materiales, equipos y horas de trabajo de esta solicitud.
          </Text>
          <ActionButton
            label="Ver recursos y mano de obra"
            onPress={() => navigation.navigate('CaseResources', { caseId })}
          />
        </DetailSection>

        {canUpdate || otherActions.length > 0 ? (
          <View style={styles.actions}>
            <Text style={styles.panelTitle}>Acciones</Text>
            {canUpdate ? (
              <>
                <ActionButton
                  label="Editar información"
                  onPress={() => navigation.navigate('EditCase', { caseId })}
                />
              </>
            ) : null}
            {otherActions.length > 0 ? (
              <ActionButton
                label="Acciones de la solicitud"
                onPress={() => setActionsVisible(true)}
              />
            ) : null}
          </View>
        ) : null}

        <DetailSection title="Línea de tiempo">
          {history.isLoading ? <ActivityIndicator color={colors.primary} /> : null}
          {history.error ? (
            <Text style={styles.error}>No fue posible cargar el historial.</Text>
          ) : null}
          {history.data ? <Timeline events={history.data} /> : null}
        </DetailSection>
      </ScrollView>
      {primaryAction ? (
        <View style={styles.stickyAction}>
          <ActionButton
            label={
              primaryAction === 'asignar'
                ? 'Asignar personal'
                : primaryAction.charAt(0).toUpperCase() + primaryAction.slice(1)
            }
            onPress={() => navigateAction(primaryAction)}
          />
        </View>
      ) : null}
      <ActionSheet<CaseAction>
        title="Acciones disponibles"
        actions={otherActions.map((action) => ({
          id: action,
          label: action.charAt(0).toUpperCase() + action.slice(1),
          destructive: ['rechazar', 'cancelar'].includes(action),
        }))}
        visible={actionsVisible}
        onClose={() => setActionsVisible(false)}
        onSelect={(action) => {
          setActionsVisible(false)
          navigateAction(action)
        }}
      />
    </SafeAreaView>
  )
}

function ActionButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.actionButton}>
      <Text style={styles.actionButtonText}>{label}</Text>
      <Text style={styles.actionChevron}>›</Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  content: { gap: spacing.md, padding: spacing.lg, paddingBottom: spacing.xl },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.background,
  },
  heading: { gap: spacing.sm },
  headingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  caseNumber: { color: colors.primary, fontSize: 13, fontWeight: '800' },
  status: {
    overflow: 'hidden',
    borderRadius: 999,
    backgroundColor: colors.primarySoft,
    color: colors.primary,
    fontSize: 12,
    fontWeight: '800',
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  title: { color: colors.text, fontSize: 25, fontWeight: '800' },
  description: { color: colors.textMuted, fontSize: 15, lineHeight: 22 },
  panel: {
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    padding: spacing.md,
  },
  panelTitle: { color: colors.text, fontSize: 17, fontWeight: '800' },
  sectionHeader: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stickyAction: {
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
  actions: {
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    padding: spacing.md,
  },
  actionButton: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
    paddingHorizontal: spacing.md,
  },
  actionButtonText: { color: colors.primary, fontWeight: '800' },
  actionChevron: { color: colors.primary, fontSize: 24, fontWeight: '700' },
  field: { gap: spacing.xs },
  fieldLabel: { color: colors.textMuted, fontSize: 12, fontWeight: '700' },
  fieldValue: { color: colors.text, fontSize: 15 },
  historyItem: { flexDirection: 'row', gap: spacing.sm },
  timelineDot: {
    width: 10,
    height: 10,
    marginTop: 5,
    borderRadius: 5,
    backgroundColor: colors.primary,
  },
  historyContent: {
    flex: 1,
    gap: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: spacing.sm,
  },
  historyTitle: { color: colors.text, fontWeight: '800' },
  historyComment: { color: colors.text, lineHeight: 20 },
  muted: { color: colors.textMuted },
  error: { color: colors.error, textAlign: 'center' },
})
