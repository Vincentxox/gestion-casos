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

import { AreaForm } from '../components/AreaForm'
import type { AreaInput, AreaRecord } from '../types'
import { useAreas, useCreateArea, useSetAreaActive, useUpdateArea } from '../useAreas'

export function AreasScreen() {
  const { data = [], error, isLoading, isRefetching, refetch } = useAreas()
  const createMutation = useCreateArea()
  const updateMutation = useUpdateArea()
  const activeMutation = useSetAreaActive()
  const [editingArea, setEditingArea] = useState<AreaRecord | null>(null)
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
    const action = area.isActive ? 'desactivar' : 'activar'
    Alert.alert(
      `${action.charAt(0).toUpperCase()}${action.slice(1)} área`,
      `¿Deseas ${action} ${area.name}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: action.charAt(0).toUpperCase() + action.slice(1),
          style: area.isActive ? 'destructive' : 'default',
          onPress: () => {
            void activeMutation
              .mutateAsync({ areaId: area.id, isActive: !area.isActive })
              .catch(() => Alert.alert('No fue posible actualizar el área.'))
          },
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
              Áreas
            </Text>
            <Text style={styles.subtitle}>
              Organiza las áreas solicitantes y técnicas de tu empresa.
            </Text>
          </View>
          <Pressable
            accessibilityLabel="Crear área"
            onPress={() => openForm()}
            style={styles.addButton}
          >
            <Ionicons color={colors.white} name="add" size={25} />
          </Pressable>
        </View>

        {isLoading ? (
          <View style={styles.center}>
            <ActivityIndicator color={colors.primary} size="large" />
          </View>
        ) : error ? (
          <View style={styles.center}>
            <Text style={styles.errorTitle}>No fue posible cargar las áreas</Text>
            <Pressable onPress={() => void refetch()} style={styles.retry}>
              <Text style={styles.retryText}>Reintentar</Text>
            </Pressable>
          </View>
        ) : (
          <FlatList
            contentContainerStyle={styles.list}
            data={data}
            keyExtractor={(item) => item.id}
            ListEmptyComponent={<Text style={styles.empty}>Aún no hay áreas registradas.</Text>}
            refreshControl={
              <RefreshControl
                refreshing={isRefetching}
                onRefresh={() => void refetch()}
                tintColor={colors.primary}
              />
            }
            renderItem={({ item }) => (
              <View style={[styles.card, !item.isActive ? styles.inactiveCard : null]}>
                <View style={styles.cardContent}>
                  <View style={styles.nameRow}>
                    <Text style={styles.areaName}>{item.name}</Text>
                    <Text
                      style={[
                        styles.badge,
                        item.isActive ? styles.activeBadge : styles.inactiveBadge,
                      ]}
                    >
                      {item.isActive ? 'Activa' : 'Inactiva'}
                    </Text>
                  </View>
                  <Text style={styles.description}>{item.description || 'Sin descripción'}</Text>
                  <Text style={styles.kind}>
                    {item.kind === 'tecnica' ? 'Área técnica' : 'Área solicitante'}
                  </Text>
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
              <Text style={styles.modalTitle}>{editingArea ? 'Editar área' : 'Nueva área'}</Text>
              <Pressable
                accessibilityLabel="Cerrar formulario"
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
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  container: { flex: 1, gap: spacing.lg, padding: spacing.lg },
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
  cardContent: { flex: 1, gap: spacing.sm },
  nameRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: spacing.sm },
  areaName: { color: colors.text, fontSize: 17, fontWeight: '800' },
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
  description: { color: colors.textMuted, fontSize: 13, lineHeight: 19 },
  kind: { color: colors.primary, fontSize: 12, fontWeight: '700' },
  actions: { flexDirection: 'row' },
  iconButton: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  errorTitle: { color: colors.error, fontSize: 16, fontWeight: '700', textAlign: 'center' },
  retry: { borderRadius: radius.md, backgroundColor: colors.primary, padding: spacing.md },
  retryText: { color: colors.white, fontWeight: '700' },
  empty: { color: colors.textMuted, paddingTop: spacing.xl, textAlign: 'center' },
  modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0, 0, 0, 0.38)' },
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
  modalTitle: { color: colors.text, fontSize: 21, fontWeight: '800' },
  closeButton: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center' },
  modalContent: { flexGrow: 1, padding: spacing.lg },
})
