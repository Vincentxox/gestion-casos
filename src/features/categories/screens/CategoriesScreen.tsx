import { Ionicons } from '@expo/vector-icons'
import { useMemo, useState } from 'react'
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
import { Card } from '@/components/ui/Card'
import { Chip } from '@/components/ui/Chip'
import { IconTile } from '@/components/ui/IconTile'
import { ScreenContainer } from '@/components/ui/ScreenContainer'
import { EmptyState } from '@/components/feedback/EmptyState'
import { RequestState } from '@/components/feedback/RequestState'
import { SkeletonList } from '@/components/ui/SkeletonList'
import { useAreas } from '@/features/areas/useAreas'
import { colors, radius, spacing, typography } from '@/theme/tokens'

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
    <ScreenContainer edges={['bottom']} padded={false}>
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={styles.subtitle}>Define los servicios que atiende cada área técnica.</Text>
          </View>
          <Pressable
            accessibilityLabel="Crear tipo de servicio"
            accessibilityRole="button"
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
            <Chip
              label={item.name}
              selected={areaFilter === item.id}
              onPress={() => setAreaFilter(item.id)}
            />
          )}
        />

        {loading ? (
          <SkeletonList />
        ) : loadError ? (
          <RequestState
            kind="error"
            title="No fue posible cargar los tipos de servicio"
            onRetry={() => {
              void categories.refetch()
              void areas.refetch()
            }}
          />
        ) : (
          <FlatList
            contentContainerStyle={styles.list}
            data={filteredCategories}
            keyExtractor={(item) => item.id}
            ListEmptyComponent={
              <EmptyState
                variant="noResults"
                title="Sin tipos de servicio"
                message="No hay tipos de servicio para esta área."
              />
            }
            refreshControl={
              <RefreshControl
                refreshing={categories.isRefetching}
                onRefresh={() => void categories.refetch()}
                tintColor={colors.primary}
              />
            }
            renderItem={({ item }) => (
              <Card contentStyle={styles.card} style={!item.isActive ? styles.inactiveCard : null}>
                <IconTile icon="pricetag-outline" />
                <View style={styles.cardContent}>
                  <View style={styles.nameRow}>
                    <Text style={styles.categoryName}>{item.name}</Text>
                    <Chip
                      label={item.isActive ? 'Activa' : 'Inactiva'}
                      tone={item.isActive ? 'success' : 'neutral'}
                    />
                  </View>
                  <Text style={styles.areaName}>{item.areaName}</Text>
                  <Text style={styles.description}>{item.description || 'Sin descripción'}</Text>
                </View>
                <View style={styles.actions}>
                  <Pressable
                    accessibilityLabel={`Editar ${item.name}`}
                    accessibilityRole="button"
                    onPress={() => openForm(item)}
                    style={styles.iconButton}
                  >
                    <Ionicons color={colors.primary} name="pencil-outline" size={21} />
                  </Pressable>
                  <Pressable
                    accessibilityLabel={`${item.isActive ? 'Desactivar' : 'Activar'} ${item.name}`}
                    accessibilityRole="button"
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
        <View style={styles.modalBackdrop}>
          <SafeAreaView edges={['bottom']} style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editing ? 'Editar tipo de servicio' : 'Nuevo tipo de servicio'}
              </Text>
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
    </ScreenContainer>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, gap: spacing.md, padding: spacing.lg },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  headerText: { flex: 1, gap: spacing.xs },
  subtitle: { ...typography.body, color: colors.textMuted },
  addButton: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.xl,
    backgroundColor: colors.primary,
  },
  filterList: { flexGrow: 0, minHeight: 48 },
  filters: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xs },
  list: { gap: spacing.md, paddingBottom: spacing.xl },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 88,
  },
  inactiveCard: { opacity: 0.7 },
  cardContent: { flex: 1, gap: spacing.xs },
  nameRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: spacing.sm },
  categoryName: { ...typography.heading, color: colors.text },
  areaName: { ...typography.caption, color: colors.primary },
  description: { ...typography.caption, color: colors.textMuted },
  actions: { flexDirection: 'row' },
  iconButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: colors.backdrop },
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
  modalTitle: { ...typography.title, color: colors.text },
  modalContent: { flexGrow: 1, padding: spacing.lg },
})
