import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { useState, type ReactNode } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import Animated, { LinearTransition, useReducedMotion } from 'react-native-reanimated'

import { PriorityBadge } from '@/components/badges/PriorityBadge'
import { StatusBadge } from '@/components/badges/StatusBadge'
import { ActionSheet } from '@/components/actions/ActionSheet'
import { Timeline } from '@/components/timeline/Timeline'
import { RequestState } from '@/components/feedback/RequestState'
import { ProgressTracker } from '@/components/progress/ProgressTracker'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { SkeletonList } from '@/components/ui/SkeletonList'
import { Icon, type IconName } from '@/components/ui/Icon'
import { IconTile } from '@/components/ui/IconTile'
import type { MainStackParamList } from '@/navigation/types'
import { useAuthStore } from '@/store/authStore'
import { colors, spacing, typography } from '@/theme/tokens'
import { actionMeta } from '@/theme/statusMeta'

import { useCaseDetail, useCaseHistory } from '../useCases'
import { canEditCase, getAvailableCaseActions } from '../casePermissions'
import type { CaseAction } from '../types'

type Props = NativeStackScreenProps<MainStackParamList, 'CaseDetail'>

function Field({ label, value, icon }: { label: string; value: string; icon: IconName }) {
  return (
    <View style={styles.field}>
      <IconTile icon={icon} size={36} />
      <View style={styles.fieldContent}>
        <Text style={styles.fieldLabel}>{label}</Text>
        <Text style={styles.fieldValue}>{value}</Text>
      </View>
    </View>
  )
}

function DetailSection({ title, children }: { title: string; children: ReactNode }) {
  const [open, setOpen] = useState(true)
  return (
    <Card style={styles.panel}>
      <Pressable
        accessibilityLabel={`${open ? 'Contraer' : 'Expandir'} ${title}`}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen(!open)}
        style={styles.sectionHeader}
      >
        <Text style={styles.panelTitle}>{title}</Text>
        <Icon name={open ? 'chevron-down' : 'chevron-forward'} color={colors.textMuted} />
      </Pressable>
      {open ? children : null}
    </Card>
  )
}

export function CaseDetailScreen({ navigation, route }: Props) {
  const { caseId } = route.params
  const profile = useAuthStore((state) => state.profile)
  const detail = useCaseDetail(caseId)
  const history = useCaseHistory(caseId)
  const [actionsVisible, setActionsVisible] = useState(false)
  const reduceMotion = useReducedMotion()

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
  const secondaryAction = otherActions[0]
  const showSecondaryAction =
    otherActions.length === 1 &&
    Number(Boolean(primaryAction)) + Number(canUpdate) + otherActions.length <= 2
  function navigateAction(action: CaseAction) {
    if (action === 'asignar') navigation.navigate('AssignCase', { caseId })
    else navigation.navigate('ChangeCaseStatus', { caseId, action })
  }
  return (
    <SafeAreaView edges={['bottom']} style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <Animated.View
          layout={reduceMotion ? undefined : LinearTransition.duration(250)}
          style={styles.heading}
        >
          <Text style={styles.caseNumber}>{item.caseNumber}</Text>
          <View style={styles.headingRow}>
            <StatusBadge status={item.status} />
            <PriorityBadge priority={item.priority} />
          </View>
          <Text accessibilityRole="header" style={styles.title}>
            {item.title}
          </Text>
          <Text style={styles.subtitle}>
            Solicitada por {item.creatorName} · {item.requestingAreaName} ·{' '}
            {new Date(item.createdAt).toLocaleDateString('es-GT')}
          </Text>
        </Animated.View>

        <Card style={styles.panel}>
          <ProgressTracker
            status={item.status}
            reason={
              history.data?.find((event) => ['rechazar', 'cancelar'].includes(event.action))
                ?.comment
            }
          />
        </Card>

        <DetailSection title="Datos de la solicitud">
          <Field icon="business-outline" label="Área solicitante" value={item.requestingAreaName} />
          <Field icon="pricetag-outline" label="Tipo de servicio" value={item.category} />
          <Field icon="location-outline" label="Ubicación" value={item.location} />
          <Field
            icon="person-outline"
            label="Técnico asignado"
            value={item.assigneeName || 'Sin asignar'}
          />
        </DetailSection>

        <DetailSection title="Descripción">
          <Text style={styles.description}>{item.description}</Text>
        </DetailSection>

        <DetailSection title="Recursos utilizados">
          <Text style={styles.description}>
            Consulta materiales, equipos y horas de trabajo de esta solicitud.
          </Text>
          <Button
            label="Ver recursos y mano de obra"
            icon="cube-outline"
            variant="secondary"
            onPress={() => navigation.navigate('CaseResources', { caseId })}
          />
        </DetailSection>

        <DetailSection title="Línea de tiempo">
          {history.isLoading ? <SkeletonList count={3} /> : null}
          {history.error ? (
            <Text style={styles.error}>No fue posible cargar el historial.</Text>
          ) : null}
          {history.data ? <Timeline events={history.data} /> : null}
        </DetailSection>
      </ScrollView>
      {primaryAction || canUpdate || otherActions.length > 0 ? (
        <View style={styles.stickyAction}>
          {primaryAction ? (
            <Button
              label={actionMeta[primaryAction].label}
              icon={actionMeta[primaryAction].icon}
              onPress={() => navigateAction(primaryAction)}
            />
          ) : null}
          {canUpdate ? (
            <Button
              label="Editar"
              variant="secondary"
              onPress={() => navigation.navigate('EditCase', { caseId })}
            />
          ) : null}
          {showSecondaryAction && secondaryAction ? (
            <Button
              label={actionMeta[secondaryAction].label}
              icon={actionMeta[secondaryAction].icon}
              variant={['rechazar', 'cancelar'].includes(secondaryAction) ? 'danger' : 'secondary'}
              onPress={() => navigateAction(secondaryAction)}
            />
          ) : null}
          {otherActions.length > 0 && !showSecondaryAction ? (
            <Button
              label="Más acciones"
              icon="ellipsis-horizontal"
              variant="secondary"
              onPress={() => setActionsVisible(true)}
            />
          ) : null}
        </View>
      ) : null}
      <ActionSheet<CaseAction>
        title="Acciones disponibles"
        actions={otherActions.map((action) => ({
          id: action,
          label: actionMeta[action].label,
          icon: actionMeta[action].icon,
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
  headingRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  subtitle: { ...typography.caption, color: colors.textMuted },
  caseNumber: { ...typography.caption, color: colors.primary },
  title: { ...typography.heading, color: colors.text },
  description: { ...typography.body, color: colors.textMuted },
  panel: { gap: spacing.md },
  panelTitle: { ...typography.heading, color: colors.text },
  sectionHeader: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stickyAction: {
    gap: spacing.sm,
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
  field: { flexDirection: 'row', alignItems: 'center', gap: spacing.base },
  fieldContent: { flex: 1, gap: spacing.xs },
  fieldLabel: { ...typography.caption, color: colors.textMuted },
  fieldValue: { ...typography.body, color: colors.text },
  error: { ...typography.body, color: colors.error, textAlign: 'center' },
})
