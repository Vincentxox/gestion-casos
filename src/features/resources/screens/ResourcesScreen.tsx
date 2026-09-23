import { Ionicons } from '@expo/vector-icons'
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
import { colors, radius, spacing } from '@/theme/tokens'

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
    <SafeAreaView edges={['bottom']} style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={styles.eyebrow}>ADMINISTRACIÓN</Text>
            <Text accessibilityRole="header" style={styles.title}>
              Recursos
            </Text>
            <Text style={styles.subtitle}>Materiales, herramientas y equipos de tu empresa.</Text>
          </View>
          <Pressable
            accessibilityLabel="Crear recurso"
            accessibilityRole="button"
            onPress={() => openForm()}
            style={styles.addButton}
          >
            <Ionicons color={colors.white} name="add" size={25} />
          </Pressable>
        </View>
        {resources.isLoading ? (
          <View style={styles.center}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : resources.error ? (
          <View style={styles.center}>
            <Text style={styles.error}>No fue posible cargar los recursos.</Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => void resources.refetch()}
              style={styles.retry}
            >
              <Text style={styles.retryText}>Reintentar</Text>
            </Pressable>
          </View>
        ) : (
          <FlatList
            data={resources.data ?? []}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
            ListEmptyComponent={
              <Text style={styles.empty}>Todavía no hay recursos. Agrega el primero.</Text>
            }
            refreshControl={
              <RefreshControl
                refreshing={resources.isRefetching}
                onRefresh={() => void resources.refetch()}
                tintColor={colors.primary}
              />
            }
            renderItem={({ item }) => (
              <View style={styles.card}>
                <View style={styles.cardContent}>
                  <Text style={styles.name}>{item.name}</Text>
                  <Text style={styles.meta}>
                    {RESOURCE_KIND_LABELS[item.kind]} · {item.isActive ? 'Activo' : 'Inactivo'}
                    {item.unit ? ` · ${item.unit}` : ''}
                  </Text>
                  {item.unitCost !== null ? (
                    <Text style={styles.meta}>Costo unitario: {item.unitCost.toFixed(2)}</Text>
                  ) : null}
                  {item.description ? (
                    <Text style={styles.description}>{item.description}</Text>
                  ) : null}
                </View>
                <View style={styles.actions}>
                  <Pressable
                    accessibilityLabel={`Editar ${item.name}`}
                    accessibilityRole="button"
                    onPress={() => openForm(item)}
                    style={styles.iconButton}
                  >
                    <Ionicons color={colors.primary} name="pencil-outline" size={22} />
                  </Pressable>
                  <Pressable
                    accessibilityLabel={`${item.isActive ? 'Desactivar' : 'Activar'} ${item.name}`}
                    accessibilityRole="button"
                    onPress={() => toggle(item)}
                    style={styles.iconButton}
                  >
                    <Ionicons
                      color={item.isActive ? colors.error : colors.success}
                      name={item.isActive ? 'pause-circle-outline' : 'checkmark-circle-outline'}
                      size={24}
                    />
                  </Pressable>
                </View>
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
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  container: { flex: 1, gap: spacing.lg, padding: spacing.lg },
  header: { flexDirection: 'row', gap: spacing.md, alignItems: 'center' },
  headerText: { flex: 1, gap: spacing.xs },
  eyebrow: { color: colors.primary, fontSize: 12, fontWeight: '800', letterSpacing: 1.2 },
  title: { color: colors.text, fontSize: 28, fontWeight: '800' },
  subtitle: { color: colors.textMuted, lineHeight: 21 },
  addButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
  },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: spacing.md },
  error: { color: colors.error, textAlign: 'center' },
  retry: { padding: spacing.md, backgroundColor: colors.primary, borderRadius: radius.md },
  retryText: { color: colors.white, fontWeight: '700' },
  list: { gap: spacing.md, paddingBottom: spacing.xl },
  empty: { color: colors.textMuted, textAlign: 'center', paddingTop: spacing.xl },
  card: {
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  cardContent: { flex: 1, gap: spacing.xs },
  name: { color: colors.text, fontSize: 17, fontWeight: '800' },
  meta: { color: colors.primary, fontSize: 13 },
  description: { color: colors.textMuted, fontSize: 13 },
  actions: { justifyContent: 'center', gap: spacing.sm },
  iconButton: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(23, 43, 77, 0.42)' },
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
  modalTitle: { color: colors.text, fontSize: 21, fontWeight: '800' },
  modalContent: { flexGrow: 1, padding: spacing.lg },
})
