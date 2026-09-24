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
import { colors, radius, spacing, typography } from '@/theme/tokens'

import { AreaForm } from '../components/AreaForm'
import type { AreaInput, AreaRecord } from '../types'
import { useAreas, useCreateArea, useSetAreaActive, useUpdateArea } from '../useAreas'

export function AreasScreen() {
  const { data = [], error, isLoading, isRefetching, refetch } = useAreas()
  const createMutation = useCreateArea()
  const updateMutation = useUpdateArea()
  const activeMutation = useSetAreaActive()
  const [editingArea, setEditingArea] = useState<AreaRecord | null>(null)
  const [actionArea, setActionArea] = useState<AreaRecord | null>(null)
  const [formVisible, setFormVisible] = useState(false)

  function openForm(area?: AreaRecord) {
    setEditingArea(area ?? null)
    setFormVisible(true)
  }

  async function submitArea(input: AreaInput) {
    try {
      if (editingArea) await updateMutation.mutateAsync({ areaId: editingArea.id, input })
      else await createMutation.mutateAsync(input)
      setFormVisible(false)
      setEditingArea(null)
    } catch {
      Alert.alert(
        'No fue posible guardar el área',
        'Verifica que el nombre no esté repetido y vuelve a intentarlo.',
      )
    }
  }

  function confirmStatus(area: AreaRecord) {
    const action = area.isActive ? 'Desactivar' : 'Activar'
    Alert.alert(`${action} área`, `¿Deseas ${action.toLocaleLowerCase('es-GT')} ${area.name}?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: action,
        style: area.isActive ? 'destructive' : 'default',
        onPress: () => {
          void activeMutation
            .mutateAsync({ areaId: area.id, isActive: !area.isActive })
            .catch(() => Alert.alert('No fue posible actualizar el área.'))
        },
      },
    ])
  }

  return (
    <ScreenContainer edges={['bottom']} padded={false}>
      <View style={styles.container}>
        <Text style={styles.subtitle}>
          Organiza las áreas solicitantes y técnicas de tu empresa.
        </Text>

        {isLoading ? (
          <SkeletonList />
        ) : error ? (
          <RequestState
            kind="error"
            title="No fue posible cargar las áreas"
            onRetry={() => void refetch()}
          />
        ) : (
          <FlatList
            contentContainerStyle={styles.list}
            data={data}
            keyExtractor={(item) => item.id}
            ListEmptyComponent={
              <EmptyState
                variant="firstUse"
                title="Aún no hay áreas"
                message="Crea la primera área para organizar las solicitudes."
                action="Crear área"
                onAction={() => openForm()}
              />
            }
            refreshControl={
              <RefreshControl
                refreshing={isRefetching}
                onRefresh={() => void refetch()}
                tintColor={colors.primary}
              />
            }
            renderItem={({ item }) => (
              <Card contentStyle={styles.card} style={!item.isActive ? styles.inactiveCard : null}>
                <IconTile icon="business-outline" />
                <View style={styles.cardContent}>
                  <View style={styles.nameRow}>
                    <Text numberOfLines={1} style={styles.areaName}>
                      {item.name}
                    </Text>
                    <Chip
                      label={item.isActive ? 'Activa' : 'Inactiva'}
                      tone={item.isActive ? 'success' : 'neutral'}
                    />
                  </View>
                  <Text style={styles.description}>{item.description || 'Sin descripción'}</Text>
                  <Text style={styles.kind}>
                    {item.kind === 'tecnica' ? 'Área técnica' : 'Área solicitante'}
                  </Text>
                </View>
                <Pressable
                  accessibilityLabel={`Opciones de ${item.name}`}
                  accessibilityRole="button"
                  onPress={() => setActionArea(item)}
                  style={styles.iconButton}
                >
                  <Ionicons color={colors.text} name="ellipsis-horizontal" size={23} />
                </Pressable>
              </Card>
            )}
          />
        )}
        <View style={styles.floatingAction}>
          <Button label="Nueva área" icon="add" onPress={() => openForm()} />
        </View>
      </View>

      <CatalogActionSheet
        name={actionArea?.name ?? ''}
        active={actionArea?.isActive ?? false}
        visible={actionArea !== null}
        onClose={() => setActionArea(null)}
        onEdit={() => actionArea && openForm(actionArea)}
        onToggle={() => actionArea && confirmStatus(actionArea)}
      />

      <Modal
        animationType="fade"
        onRequestClose={() => setFormVisible(false)}
        transparent
        visible={formVisible}
      >
        <View style={styles.modalBackdrop}>
          <SafeAreaView edges={['bottom']} style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editingArea ? 'Editar área' : 'Nueva área'}</Text>
              <Pressable
                accessibilityLabel="Cerrar formulario"
                accessibilityRole="button"
                onPress={() => setFormVisible(false)}
                style={styles.closeButton}
              >
                <Ionicons color={colors.text} name="close" size={24} />
              </Pressable>
            </View>
            <KeyboardFormScrollView contentContainerStyle={styles.modalContent}>
              <AreaForm
                key={editingArea?.id ?? 'new'}
                area={editingArea ?? undefined}
                loading={createMutation.isPending || updateMutation.isPending}
                onSubmit={(input) => void submitArea(input)}
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
  inactiveCard: { opacity: 0.7 },
  cardContent: { flex: 1, gap: spacing.sm },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  areaName: { ...typography.heading, color: colors.text, flex: 1 },
  description: { ...typography.caption, color: colors.textMuted },
  kind: { ...typography.caption, color: colors.textMuted },
  iconButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: colors.backdrop },
  modalCard: {
    height: '72%',
    maxHeight: '86%',
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
  closeButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  modalContent: { flexGrow: 1, padding: spacing.lg },
})
