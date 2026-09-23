import { Ionicons } from '@expo/vector-icons'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { useState } from 'react'
import {
  ActivityIndicator,
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
import { useAssignableProfiles, useCaseDetail } from '@/features/cases/useCases'
import type { MainStackParamList } from '@/navigation/types'
import { useAuthStore } from '@/store/authStore'
import { colors, radius, spacing } from '@/theme/tokens'

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
  return (
    <SafeAreaView edges={['bottom']} style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={styles.eyebrow}>SOLICITUD</Text>
            <Text accessibilityRole="header" style={styles.title}>
              Recursos utilizados
            </Text>
            <Text style={styles.subtitle}>Materiales, equipos, herramientas y mano de obra.</Text>
          </View>
          {canManage ? (
            <Pressable
              accessibilityLabel="Registrar uso"
              accessibilityRole="button"
              onPress={() => openForm()}
              style={styles.addButton}
            >
              <Ionicons color={colors.white} name="add" size={25} />
            </Pressable>
          ) : null}
        </View>
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : error || !detail.data ? (
          <View style={styles.center}>
            <Text style={styles.error}>No fue posible cargar los recursos de esta solicitud.</Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                void detail.refetch()
                void usages.refetch()
                void resources.refetch()
                if (canManage) void technicians.refetch()
              }}
              style={styles.retry}
            >
              <Text style={styles.retryText}>Reintentar</Text>
            </Pressable>
          </View>
        ) : (
          <FlatList
            data={usages.data ?? []}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
            ListHeaderComponent={
              !canManage ? (
                <Text style={styles.hint}>
                  Puedes consultar estos registros. Solo el responsable asignado o el jefe del área
                  técnica pueden modificarlos durante la ejecución o espera.
                </Text>
              ) : null
            }
            ListEmptyComponent={
              <Text style={styles.empty}>
                Aún no se han registrado recursos ni horas de trabajo.
              </Text>
            }
            refreshControl={
              <RefreshControl
                refreshing={usages.isRefetching}
                onRefresh={() => void usages.refetch()}
                tintColor={colors.primary}
              />
            }
            renderItem={({ item }) => (
              <View style={styles.card}>
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
                      Cantidad: {item.quantity}
                      {item.unit ? ` ${item.unit}` : ''}
                    </Text>
                  ) : null}
                  {item.hours != null ? <Text style={styles.meta}>Horas: {item.hours}</Text> : null}
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
              </View>
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
  eyebrow: { color: colors.primary, fontSize: 12, fontWeight: '800', letterSpacing: 1.2 },
  title: { color: colors.text, fontSize: 25, fontWeight: '800' },
  subtitle: { color: colors.textMuted, lineHeight: 20 },
  addButton: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 24,
    backgroundColor: colors.primary,
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  error: { color: colors.error, textAlign: 'center' },
  retry: { padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.primary },
  retryText: { color: colors.white, fontWeight: '700' },
  list: { gap: spacing.md, paddingBottom: spacing.xl },
  hint: { color: colors.textMuted, lineHeight: 20 },
  empty: { color: colors.textMuted, textAlign: 'center', paddingTop: spacing.xl },
  card: {
    flexDirection: 'row',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    padding: spacing.md,
  },
  cardContent: { flex: 1, gap: spacing.xs },
  name: { color: colors.text, fontWeight: '800', fontSize: 16 },
  meta: { color: colors.primary, fontSize: 13 },
  notes: { color: colors.textMuted },
  actions: { justifyContent: 'center', gap: spacing.sm },
  iconButton: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(23, 43, 77, 0.42)' },
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
  modalTitle: { color: colors.text, fontSize: 21, fontWeight: '800' },
  modalContent: { flexGrow: 1, padding: spacing.lg },
})
