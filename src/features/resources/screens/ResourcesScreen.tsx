import { Ionicons } from '@expo/vector-icons'
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
import { CatalogActionSheet } from '@/components/actions/CatalogActionSheet'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Chip } from '@/components/ui/Chip'
import { IconTile } from '@/components/ui/IconTile'
import { ScreenContainer } from '@/components/ui/ScreenContainer'
import { EmptyState } from '@/components/feedback/EmptyState'
import { RequestState } from '@/components/feedback/RequestState'
import { SkeletonList } from '@/components/ui/SkeletonList'
import { formatQuetzales } from '@/theme/formatters'
import { colors, radius, spacing, typography } from '@/theme/tokens'

import { ResourceForm } from '../components/ResourceForm'
import { RESOURCE_KIND_LABELS, type ResourceInput, type ResourceRecord } from '../types'
import {
  useCreateResource,
  useResources,
  useSetResourceActive,
  useUpdateResource,
} from '../useResources'

export function ResourcesScreen() {
  const resources = useResources()
  const create = useCreateResource()
  const update = useUpdateResource()
  const active = useSetResourceActive()
  const [editing, setEditing] = useState<ResourceRecord | null>(null)
  const [actionResource, setActionResource] = useState<ResourceRecord | null>(null)
  const [formVisible, setFormVisible] = useState(false)

  function openForm(resource?: ResourceRecord) {
    setEditing(resource ?? null)
    setFormVisible(true)
  }

  async function save(input: ResourceInput) {
    try {
      if (editing) await update.mutateAsync({ resourceId: editing.id, input })
      else await create.mutateAsync(input)
      setFormVisible(false)
      setEditing(null)
    } catch (error) {
      Alert.alert(
        'No fue posible guardar el recurso',
        error instanceof Error ? error.message : 'Comprueba la conexión y los datos.',
      )
    }
  }

  function toggle(resource: ResourceRecord) {
    Alert.alert(
      `${resource.isActive ? 'Desactivar' : 'Activar'} recurso`,
      `¿Deseas cambiar la disponibilidad de ${resource.name}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          onPress: () =>
            void active
              .mutateAsync({ resourceId: resource.id, isActive: !resource.isActive })
              .catch((error) =>
                Alert.alert(
                  'No fue posible actualizar el recurso',
                  error instanceof Error ? error.message : 'Comprueba la conexión.',
                ),
              ),
        },
      ],
    )
  }

  return (
    <ScreenContainer edges={['bottom']} padded={false}>
      <View style={styles.container}>
        <Text style={styles.subtitle}>Materiales, herramientas y equipos de tu empresa.</Text>
        {resources.isLoading ? (
          <SkeletonList />
        ) : resources.error ? (
          <RequestState
            kind="error"
            title="No fue posible cargar los recursos"
            onRetry={() => void resources.refetch()}
          />
        ) : (
          <FlatList
            data={resources.data ?? []}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
            ListEmptyComponent={
              <EmptyState
                variant="firstUse"
                title="Todavía no hay recursos"
                message="Agrega el primero para empezar a registrar su uso."
                action="Crear recurso"
                onAction={() => openForm()}
              />
            }
            refreshControl={
              <RefreshControl
                refreshing={resources.isRefetching}
                onRefresh={() => void resources.refetch()}
                tintColor={colors.primary}
              />
            }
            renderItem={({ item }) => (
              <Card contentStyle={styles.card}>
                <IconTile icon="cube-outline" />
                <View style={styles.cardContent}>
                  <View style={styles.nameRow}>
                    <Text numberOfLines={1} style={styles.name}>
                      {item.name}
                    </Text>
                    <Chip
                      label={item.isActive ? 'Activo' : 'Inactivo'}
                      tone={item.isActive ? 'success' : 'neutral'}
                    />
                  </View>
                  <Text style={styles.meta}>
                    {RESOURCE_KIND_LABELS[item.kind]}
                    {item.unit ? ` · Unidad: ${item.unit}` : ''}
                    {item.unitCost !== null ? ` · ${formatQuetzales(item.unitCost)}` : ''}
                  </Text>
                  {item.description ? (
                    <Text style={styles.description}>{item.description}</Text>
                  ) : null}
                </View>
                <Pressable
                  accessibilityLabel={`Opciones de ${item.name}`}
                  accessibilityRole="button"
                  onPress={() => setActionResource(item)}
                  style={styles.iconButton}
                >
                  <Ionicons color={colors.text} name="ellipsis-horizontal" size={23} />
                </Pressable>
              </Card>
            )}
          />
        )}
        <View style={styles.floatingAction}>
          <Button label="Nuevo recurso" icon="add" onPress={() => openForm()} />
        </View>
      </View>
      <CatalogActionSheet
        name={actionResource?.name ?? ''}
        active={actionResource?.isActive ?? false}
        visible={actionResource !== null}
        onClose={() => setActionResource(null)}
        onEdit={() => actionResource && openForm(actionResource)}
        onToggle={() => actionResource && toggle(actionResource)}
      />
      <Modal
        animationType="fade"
        onRequestClose={() => setFormVisible(false)}
        transparent
        visible={formVisible}
      >
        <View style={styles.backdrop}>
          <SafeAreaView edges={['bottom']} style={styles.modal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editing ? 'Editar recurso' : 'Nuevo recurso'}</Text>
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
              <ResourceForm
                key={editing?.id ?? 'new'}
                resource={editing ?? undefined}
                loading={create.isPending || update.isPending}
                onSubmit={(input) => void save(input)}
              />
            </KeyboardFormScrollView>
          </SafeAreaView>
        </View>
      </Modal>
    </ScreenContainer>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, gap: spacing.lg, padding: spacing.lg },
  subtitle: { ...typography.body, color: colors.textMuted },
  floatingAction: { position: 'absolute', right: spacing.lg, bottom: spacing.lg },
  list: { gap: spacing.md, paddingBottom: 96 },
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    minHeight: 88,
  },
  cardContent: { flex: 1, gap: spacing.xs },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  name: { ...typography.heading, color: colors.text, flex: 1 },
  meta: { ...typography.caption, color: colors.textMuted },
  description: { ...typography.caption, color: colors.textMuted },
  iconButton: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: colors.backdrop },
  modal: {
    height: '80%',
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    backgroundColor: colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: { ...typography.title, color: colors.text },
  modalContent: { flexGrow: 1, padding: spacing.lg },
})
