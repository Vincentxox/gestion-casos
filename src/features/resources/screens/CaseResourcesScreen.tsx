import { getErrorMessage } from '@/utils/errorMessage'
import { AppFeedback } from '@/components/feedback/AppFeedback'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { useLayoutEffect, useRef, useState } from 'react'
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { BottomSheet } from '@/components/sheets/BottomSheet'
import { ActionSheet } from '@/components/actions/ActionSheet'
import { EmptyState } from '@/components/feedback/EmptyState'
import { RequestState } from '@/components/feedback/RequestState'
import { SkeletonList } from '@/components/ui/SkeletonList'
import { Card } from '@/components/ui/Card'
import { IconTile } from '@/components/ui/IconTile'
import { Icon } from '@/components/ui/Icon'
import { formatNumber, formatQuetzales, plural } from '@/theme/formatters'
import { useAssignableProfiles, useCaseActions, useCaseDetail } from '@/features/cases/useCases'
import type { MainStackParamList } from '@/navigation/types'
import { colors, spacing, typography } from '@/theme/tokens'

import { UsageForm } from '../components/UsageForm'
import { RESOURCE_KIND_LABELS, type CaseUsageRecord, type UsageInput } from '../types'
import {
  useAddCaseUsage,
  useCaseUsages,
  useDeleteCaseUsage,
  useResources,
  useUpdateCaseUsage,
} from '../useResources'

type Props = NativeStackScreenProps<MainStackParamList, 'CaseResources'>

export function CaseResourcesScreen({ navigation, route }: Props) {
  const { caseId } = route.params
  const detail = useCaseDetail(caseId)
  const actions = useCaseActions(caseId)
  const usages = useCaseUsages(caseId)
  const resources = useResources()
  const canManage = actions.data?.recursos?.allowed === true
  const technicians = useAssignableProfiles(detail.data?.targetAreaId, canManage)
  const add = useAddCaseUsage(caseId)
  const update = useUpdateCaseUsage(caseId)
  const remove = useDeleteCaseUsage(caseId)
  const [editing, setEditing] = useState<CaseUsageRecord | null>(null)
  const [actionUsage, setActionUsage] = useState<CaseUsageRecord | null>(null)
  const [formVisible, setFormVisible] = useState(false)
  const formSubmit = useRef<(() => void) | null>(null)

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: canManage
        ? () => (
            <Pressable
              accessibilityLabel="Registrar uso"
              accessibilityRole="button"
              onPress={() => {
                setEditing(null)
                setFormVisible(true)
              }}
              style={styles.headerAction}
            >
              <Text style={styles.headerActionText}>Registrar</Text>
            </Pressable>
          )
        : undefined,
    })
  }, [canManage, navigation])

  function openForm(usage?: CaseUsageRecord) {
    if (!canManage) return
    setEditing(usage ?? null)
    setFormVisible(true)
  }

  async function save(input: UsageInput) {
    if (!canManage) return
    try {
      if (editing)
        await update.mutateAsync({
          usageId: editing.id,
          input: { quantity: input.quantity, hours: input.hours, notes: input.notes },
        })
      else await add.mutateAsync(input)
      setFormVisible(false)
      setEditing(null)
    } catch (error) {
      AppFeedback.show(
        'No fue posible guardar el registro',
        getErrorMessage(error, 'Comprueba la conexión y el estado de la solicitud.'),
        { tone: 'error' },
      )
    }
  }

  function confirmDelete(usage: CaseUsageRecord) {
    if (!canManage) return
    AppFeedback.show(
      'Eliminar registro',
      '¿Deseas quitar este uso de la solicitud?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () =>
            void remove
              .mutateAsync(usage.id)
              .catch((error) =>
                AppFeedback.show(
                  'No fue posible eliminar',
                  getErrorMessage(error, 'Comprueba la conexión.'),
                  { tone: 'error' },
                ),
              ),
        },
      ],
      { tone: 'danger', icon: 'trash-outline' },
    )
  }

  const loading = detail.isLoading || actions.isPending || usages.isLoading || resources.isLoading
  const error =
    detail.error || actions.error || usages.error || resources.error || technicians.error
  const totalHours = (usages.data ?? []).reduce((sum, item) => sum + (item.hours ?? 0), 0)
  const recordCount = usages.data?.length ?? 0
  return (
    <SafeAreaView edges={['bottom']} style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={styles.subtitle}>Materiales, equipos, herramientas y mano de obra.</Text>
          </View>
        </View>
        {loading ? (
          <SkeletonList />
        ) : error || !detail.data ? (
          <RequestState
            kind="error"
            title="No fue posible cargar los recursos de esta solicitud"
            onRetry={() => {
              void detail.refetch()
              void actions.refetch()
              void usages.refetch()
              void resources.refetch()
              if (canManage) void technicians.refetch()
            }}
          />
        ) : (
          <FlatList
            data={usages.data ?? []}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
            ListHeaderComponent={
              <View style={styles.summary}>
                <Text style={styles.summaryText}>
                  {formatNumber(recordCount)} {plural(recordCount, 'registro', 'registros')} ·{' '}
                  {formatNumber(totalHours)} {plural(totalHours, 'hora', 'horas')}
                </Text>
                {!canManage ? (
                  <Text style={styles.hint}>
                    Puedes consultar estos registros. Las modificaciones dependen de las acciones
                    disponibles para tu usuario.
                  </Text>
                ) : null}
              </View>
            }
            ListEmptyComponent={
              <EmptyState
                title="Sin recursos utilizados"
                message="Aún no se han registrado recursos ni horas de trabajo."
                variant="firstUse"
                action={canManage ? 'Registrar uso' : undefined}
                onAction={canManage ? () => openForm() : undefined}
              />
            }
            refreshControl={
              <RefreshControl
                refreshing={usages.isRefetching}
                onRefresh={() => void usages.refetch()}
                tintColor={colors.primary}
              />
            }
            renderItem={({ item }) => (
              <Card contentStyle={styles.card}>
                <IconTile
                  icon={item.kind === 'mano_de_obra' ? 'construct-outline' : 'cube-outline'}
                />
                <View style={styles.cardContent}>
                  <Text style={styles.name}>
                    {item.kind === 'mano_de_obra'
                      ? `Mano de obra · ${item.technicianName || 'Técnico'}`
                      : item.resourceName || 'Recurso'}
                  </Text>
                  <Text style={styles.meta}>
                    {item.kind === 'recurso' && item.resourceKind
                      ? RESOURCE_KIND_LABELS[item.resourceKind]
                      : 'Trabajo registrado'}
                  </Text>
                  {item.quantity != null ? (
                    <Text style={styles.meta}>
                      Cantidad: {formatNumber(item.quantity)}
                      {item.unit ? ` ${item.unit}` : ''}
                    </Text>
                  ) : null}
                  {item.hours != null ? (
                    <Text style={styles.meta}>Horas: {formatNumber(item.hours)}</Text>
                  ) : null}
                  {item.unitCost != null ? (
                    <Text style={styles.meta}>
                      Costo unitario: {formatQuetzales(item.unitCost)}
                    </Text>
                  ) : null}
                  {item.notes ? <Text style={styles.notes}>{item.notes}</Text> : null}
                </View>
                {canManage ? (
                  <Pressable
                    accessibilityLabel={`Opciones de ${item.resourceName || item.technicianName || 'registro'}`}
                    accessibilityRole="button"
                    onPress={() => setActionUsage(item)}
                    style={styles.iconButton}
                  >
                    <Icon name="ellipsis-horizontal" color={colors.ink} size={22} />
                  </Pressable>
                ) : null}
              </Card>
            )}
          />
        )}
      </View>
      <ActionSheet<'edit' | 'remove'>
        title="Opciones del registro"
        actions={[
          { id: 'edit', label: 'Editar', icon: 'create-outline' },
          { id: 'remove', label: 'Quitar', icon: 'trash-outline', destructive: true },
        ]}
        visible={actionUsage !== null}
        onClose={() => setActionUsage(null)}
        onSelect={(action) => {
          const usage = actionUsage
          setActionUsage(null)
          if (!usage) return
          if (action === 'edit') openForm(usage)
          else confirmDelete(usage)
        }}
      />
      <BottomSheet
        title={editing ? 'Corregir uso' : 'Registrar uso'}
        visible={formVisible && canManage}
        onClose={() => setFormVisible(false)}
        form
        height="82%"
        footerAction={{
          label: editing ? 'Guardar corrección' : 'Registrar uso',
          loading: add.isPending || update.isPending,
          onPress: () => formSubmit.current?.(),
        }}
      >
        <UsageForm
          key={editing?.id ?? 'new'}
          usage={editing ?? undefined}
          resources={resources.data ?? []}
          technicians={technicians.data ?? []}
          loading={add.isPending || update.isPending}
          onSubmit={(input) => void save(input)}
          submitRef={formSubmit}
        />
      </BottomSheet>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  container: { flex: 1, gap: spacing.md, padding: spacing.lg },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  headerText: { flex: 1, gap: spacing.xs },
  headerAction: { minWidth: 44, minHeight: 44, justifyContent: 'center', alignItems: 'center' },
  headerActionText: { ...typography.label, color: colors.primary },
  subtitle: { ...typography.body, color: colors.textMuted },
  list: { gap: spacing.md, paddingBottom: spacing.xl },
  hint: { color: colors.textMuted, lineHeight: 20 },
  summary: { gap: spacing.sm },
  summaryText: { ...typography.heading, color: colors.text },
  card: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  cardContent: { flex: 1, gap: spacing.xs },
  name: { ...typography.heading, color: colors.text },
  meta: { ...typography.caption, color: colors.textMuted },
  notes: { color: colors.textMuted },
  iconButton: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
})
