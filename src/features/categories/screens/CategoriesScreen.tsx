import { Ionicons } from '@expo/vector-icons'
import { useMemo, useState } from 'react'
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
import { useAreas } from '@/features/areas/useAreas'
import { colors, radius, spacing } from '@/theme/tokens'

import { CategoryForm } from '../components/CategoryForm'
import type { CategoryInput, CategoryRecord } from '../types'
import {
  useCategories,
  useCreateCategory,
  useSetCategoryActive,
  useUpdateCategory,
} from '../useCategories'

export function CategoriesScreen() {
  const categories = useCategories()
  const areas = useAreas()
  const createMutation = useCreateCategory()
  const updateMutation = useUpdateCategory()
  const activeMutation = useSetCategoryActive()
  const [areaFilter, setAreaFilter] = useState<string | null>(null)
  const [editing, setEditing] = useState<CategoryRecord | null>(null)
  const [formVisible, setFormVisible] = useState(false)

  const filteredCategories = useMemo(
    () =>
      (categories.data ?? []).filter((category) => !areaFilter || category.areaId === areaFilter),
    [areaFilter, categories.data],
  )

  function openForm(category?: CategoryRecord) {
    setEditing(category ?? null)
    setFormVisible(true)
  }

  async function submit(input: CategoryInput) {
    try {
      if (editing) await updateMutation.mutateAsync({ categoryId: editing.id, input })
      else await createMutation.mutateAsync(input)
      setFormVisible(false)
      setEditing(null)
    } catch {
      Alert.alert(
        'No fue posible guardar la categoría',
        'Verifica que el nombre no esté repetido dentro del área.',
      )
    }
  }

  function confirmStatus(category: CategoryRecord) {
    const activate = !category.isActive
    Alert.alert(
      `${activate ? 'Activar' : 'Desactivar'} categoría`,
      `¿Deseas ${activate ? 'activar' : 'desactivar'} ${category.name}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: activate ? 'Activar' : 'Desactivar',
          style: activate ? 'default' : 'destructive',
          onPress: () => {
            void activeMutation
              .mutateAsync({ categoryId: category.id, isActive: activate })
              .catch(() => Alert.alert('No fue posible actualizar la categoría.'))
          },
        },
      ],
    )
  }

  const loading = categories.isLoading || areas.isLoading
  const loadError = categories.error || areas.error

  return (
    <SafeAreaView edges={['bottom']} style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={styles.eyebrow}>ADMINISTRACIÓN</Text>
            <Text accessibilityRole="header" style={styles.title}>
              Tipos de servicio
            </Text>
            <Text style={styles.subtitle}>Define los servicios que atiende cada área técnica.</Text>
          </View>
          <Pressable
            accessibilityLabel="Crear tipo de servicio"
            onPress={() => openForm()}
            style={styles.addButton}
          >
            <Ionicons color={colors.white} name="add" size={25} />
          </Pressable>
        </View>

        <FlatList
          horizontal
          data={[
            { id: null, name: 'Todas' },
            ...(areas.data ?? [])
              .filter((area) => area.kind === 'tecnica')
              .map(({ id, name }) => ({ id, name })),
          ]}
          keyExtractor={(item) => item.id ?? 'all'}
          showsHorizontalScrollIndicator={false}
          style={styles.filterList}
          contentContainerStyle={styles.filters}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => setAreaFilter(item.id)}
              style={[styles.filter, areaFilter === item.id ? styles.filterActive : null]}
            >
              <Text
                style={[styles.filterText, areaFilter === item.id ? styles.filterTextActive : null]}
              >
                {item.name}
              </Text>
            </Pressable>
          )}
        />

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator color={colors.primary} size="large" />
          </View>
        ) : loadError ? (
          <View style={styles.center}>
            <Text style={styles.errorTitle}>No fue posible cargar las categorías</Text>
            <Pressable
              onPress={() => {
                void categories.refetch()
                void areas.refetch()
              }}
              style={styles.retry}
            >
              <Text style={styles.retryText}>Reintentar</Text>
            </Pressable>
          </View>
        ) : (
          <FlatList
            contentContainerStyle={styles.list}
            data={filteredCategories}
            keyExtractor={(item) => item.id}
            ListEmptyComponent={
              <Text style={styles.empty}>No hay tipos de servicio para esta área.</Text>
            }
            refreshControl={
              <RefreshControl
                refreshing={categories.isRefetching}
                onRefresh={() => void categories.refetch()}
                tintColor={colors.primary}
              />
            }
            renderItem={({ item }) => (
              <View style={[styles.card, !item.isActive ? styles.inactiveCard : null]}>
                <View style={styles.cardContent}>
                  <View style={styles.nameRow}>
                    <Text style={styles.categoryName}>{item.name}</Text>
                    <Text
                      style={[
                        styles.badge,
                        item.isActive ? styles.activeBadge : styles.inactiveBadge,
                      ]}
                    >
                      {item.isActive ? 'Activa' : 'Inactiva'}
                    </Text>
                  </View>
                  <Text style={styles.areaName}>{item.areaName}</Text>
                  <Text style={styles.description}>{item.description || 'Sin descripción'}</Text>
                </View>
                <View style={styles.actions}>
                  <Pressable
                    accessibilityLabel={`Editar ${item.name}`}
                    onPress={() => openForm(item)}
                    style={styles.iconButton}
                  >
                    <Ionicons color={colors.primary} name="pencil-outline" size={21} />
                  </Pressable>
                  <Pressable
                    accessibilityLabel={`${item.isActive ? 'Desactivar' : 'Activar'} ${item.name}`}
                    onPress={() => confirmStatus(item)}
                    style={styles.iconButton}
                  >
                    <Ionicons
                      color={item.isActive ? colors.error : colors.success}
                      name={item.isActive ? 'pause-circle-outline' : 'checkmark-circle-outline'}
                      size={23}
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
        <View style={styles.modalBackdrop}>
          <SafeAreaView edges={['bottom']} style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editing ? 'Editar tipo de servicio' : 'Nuevo tipo de servicio'}
              </Text>
              <Pressable
                accessibilityLabel="Cerrar formulario"
                onPress={() => setFormVisible(false)}
                style={styles.iconButton}
              >
                <Ionicons color={colors.text} name="close" size={24} />
              </Pressable>
            </View>
            <KeyboardFormScrollView contentContainerStyle={styles.modalContent}>
              <CategoryForm
                key={editing?.id ?? 'new'}
                areas={areas.data ?? []}
                category={editing ?? undefined}
                loading={createMutation.isPending || updateMutation.isPending}
                onSubmit={(input) => void submit(input)}
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
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  headerText: { flex: 1, gap: spacing.xs },
  eyebrow: { color: colors.primary, fontSize: 12, fontWeight: '800', letterSpacing: 1.2 },
  title: { color: colors.text, fontSize: 28, fontWeight: '800' },
  subtitle: { color: colors.textMuted, fontSize: 14, lineHeight: 20 },
  addButton: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 24,
    backgroundColor: colors.primary,
  },
  filterList: { flexGrow: 0, minHeight: 48 },
  filters: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xs },
  filter: {
    minHeight: 40,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    backgroundColor: colors.surface,
    paddingHorizontal: 13,
    paddingVertical: 8,
  },
  filterActive: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  filterText: { color: colors.textMuted, fontSize: 12, fontWeight: '700', lineHeight: 18 },
  filterTextActive: { color: colors.primary },
  list: { gap: spacing.md, paddingBottom: spacing.xl },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    padding: spacing.md,
  },
  inactiveCard: { opacity: 0.7 },
  cardContent: { flex: 1, gap: spacing.xs },
  nameRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: spacing.sm },
  categoryName: { color: colors.text, fontSize: 16, fontWeight: '800' },
  badge: {
    overflow: 'hidden',
    borderRadius: 999,
    fontSize: 11,
    fontWeight: '800',
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  activeBadge: { color: colors.success, backgroundColor: colors.successSoft },
  inactiveBadge: { color: colors.textMuted, backgroundColor: colors.background },
  areaName: { color: colors.primary, fontSize: 12, fontWeight: '700' },
  description: { color: colors.textMuted, fontSize: 13, lineHeight: 18 },
  actions: { flexDirection: 'row' },
  iconButton: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  errorTitle: { color: colors.error, fontWeight: '700', textAlign: 'center' },
  retry: { borderRadius: radius.md, backgroundColor: colors.primary, padding: spacing.md },
  retryText: { color: colors.white, fontWeight: '700' },
  empty: { color: colors.textMuted, paddingTop: spacing.xl, textAlign: 'center' },
  modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0, 0, 0, 0.38)' },
  modalCard: {
    height: '78%',
    maxHeight: '90%',
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
