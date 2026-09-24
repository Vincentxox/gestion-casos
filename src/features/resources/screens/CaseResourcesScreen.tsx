import { Ionicons } from '@expo/vector-icons'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { useState } from 'react'
import {
  Alert,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { KeyboardFormScrollView } from '@/components/layout/KeyboardFormScrollView'
import { EmptyState } from '@/components/feedback/EmptyState'
import { RequestState } from '@/components/feedback/RequestState'
import { SkeletonList } from '@/components/ui/SkeletonList'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { IconTile } from '@/components/ui/IconTile'
import { formatNumber, plural } from '@/theme/formatters'
import { useAssignableProfiles, useCaseDetail } from '@/features/cases/useCases'
import type { MainStackParamList } from '@/navigation/types'
import { useAuthStore } from '@/store/authStore'
import { colors, radius, spacing, typography } from '@/theme/tokens'

import { UsageForm } from '../components/UsageForm'
import { canManageCaseUsage } from '../resourcePermissions'
import { RESOURCE_KIND_LABELS, type CaseUsageRecord, type UsageInput } from '../types'
import {
  useAddCaseUsage,
  useCaseUsages,
  useDeleteCaseUsage,
  useResources,
  useUpdateCaseUsage,
} from '../useResources'

type Props = NativeStackScreenProps<MainStackParamList, 'CaseResources'>

export function CaseResourcesScreen({ route }: Props) {
  const { caseId } = route.params
  const profile = useAuthStore((state) => state.profile)
  const detail = useCaseDetail(caseId)
  const usages = useCaseUsages(caseId)
  const resources = useResources()
  const canManage = detail.data ? canManageCaseUsage(detail.data, profile) : false
  const technicians = useAssignableProfiles(detail.data?.targetAreaId, canManage)
  const add = useAddCaseUsage(caseId)
  const update = useUpdateCaseUsage(caseId)
  const remove = useDeleteCaseUsage(caseId)
  const [editing, setEditing] = useState<CaseUsageRecord | null>(null)
  const [formVisible, setFormVisible] = useState(false)

  function openForm(usage?: CaseUsageRecord) {
    setEditing(usage ?? null)
    setFormVisible(true)
  }

  async function save(input: UsageInput) {
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
      Alert.alert(
        'No fue posible guardar el registro',
        error instanceof Error
          ? error.message
          : 'Comprueba la conexión y el estado de la solicitud.',
      )
    }
  }

  function confirmDelete(usage: CaseUsageRecord) {
    Alert.alert('Eliminar registro', '¿Deseas quitar este uso de la solicitud?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: () =>
          void remove
            .mutateAsync(usage.id)
            .catch((error) =>
              Alert.alert(
                'No fue posible eliminar',
                error instanceof Error ? error.message : 'Comprueba la conexión.',
              ),
            ),
      },
    ])
  }

  const loading = detail.isLoading || usages.isLoading || resources.isLoading
  const error = detail.error || usages.error || resources.error || technicians.error
  const totalHours = (usages.data ?? []).reduce((sum, item) => sum + (item.hours ?? 0), 0)
  const recordCount = usages.data?.length ?? 0
  return (
    <SafeAreaView edges={['bottom']} style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={styles.subtitle}>Materiales, equipos, herramientas y mano de obra.</Text>
          </View>
          {canManage ? (
            <Button label="Registrar uso" icon="add" onPress={() => openForm()} />
          ) : null}
        </View>
        {loading ? (
          <SkeletonList />
        ) : error || !detail.data ? (
          <RequestState
            kind="error"
            title="No fue posible cargar los recursos de esta solicitud"
            onRetry={() => {
              void detail.refetch()
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
                    Puedes consultar estos registros. Solo el responsable asignado o el jefe del
                    área técnica pueden modificarlos durante la ejecución o espera.
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
                  {item.notes ? <Text style={styles.notes}>{item.notes}</Text> : null}
                </View>
                {canManage ? (
                  <View style={styles.actions}>
                    <Pressable
                      accessibilityLabel="Corregir registro"
                      accessibilityRole="button"
                      onPress={() => openForm(item)}
                      style={styles.iconButton}
                    >
                      <Ionicons color={colors.primary} name="pencil-outline" size={22} />
                    </Pressable>
                    <Pressable
                      accessibilityLabel="Eliminar registro"
                      accessibilityRole="button"
                      onPress={() => confirmDelete(item)}
                      style={styles.iconButton}
                    >
                      <Ionicons color={colors.error} name="trash-outline" size={22} />
                    </Pressable>
                  </View>
                ) : null}
              </Card>
            )}
          />
        )}
      </View>
      <Modal
        animationType="fade"
        onRequestClose={() => setFormVisible(false)}
        transparent
        visible={formVisible}
      >
        <View style={styles.backdrop}>
          <SafeAreaView edges={['bottom']} style={styles.modal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editing ? 'Corregir uso' : 'Registrar uso'}</Text>
              <Pressable
                accessibilityLabel="Cerrar formulario"
                accessibilityRole="button"
                onPress={() => setFormVisible(false)}
                style={styles.iconButton}
              >
                <Ionicons color={colors.text} name="close" size={24} />
              </Pressable>
            </View>
            <KeyboardFormScrollView contentContainerStyle={styles.modalContent}>
              <UsageForm
                key={editing?.id ?? 'new'}
                usage={editing ?? undefined}
                resources={resources.data ?? []}
                technicians={technicians.data ?? []}
                loading={add.isPending || update.isPending}
                onSubmit={(input) => void save(input)}
              />
            </KeyboardFormScrollView>
          </SafeAreaView>
        </View>
      </Modal>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  container: { flex: 1, gap: spacing.md, padding: spacing.lg },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  headerText: { flex: 1, gap: spacing.xs },
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
  meta: { ...typography.caption, color: colors.primary },
  notes: { color: colors.textMuted },
  actions: { justifyContent: 'center', gap: spacing.sm },
  iconButton: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: colors.backdrop },
  modal: {
    height: '82%',
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    backgroundColor: colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    padding: spacing.lg,
  },
  modalTitle: { ...typography.title, color: colors.text },
  modalContent: { flexGrow: 1, padding: spacing.lg },
})
