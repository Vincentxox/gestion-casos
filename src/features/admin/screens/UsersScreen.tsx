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

import { useAreas } from '@/features/areas/useAreas'
import { useAuthStore } from '@/store/authStore'
import { colors, radius, spacing } from '@/theme/tokens'

import type { ManagedProfile } from '../types'
import { useManagedProfiles, useSetManagedProfileArea } from '../useManagedProfiles'

const ROLE_LABELS = {
  administrador: 'Administrador',
  auditor: 'Auditor',
  visualizador: 'Visualizador',
} as const

export function UsersScreen() {
  const profiles = useManagedProfiles()
  const areas = useAreas()
  const mutation = useSetManagedProfileArea()
  const applyOwnAreaAssignment = useAuthStore((state) => state.applyOwnAreaAssignment)
  const [selectedProfile, setSelectedProfile] = useState<ManagedProfile | null>(null)

  const refreshing = profiles.isRefetching || areas.isRefetching

  async function assignArea(areaId: string | null) {
    if (!selectedProfile) return

    try {
      await mutation.mutateAsync({ userId: selectedProfile.id, areaId })
      const areaName = areas.data?.find((area) => area.id === areaId)?.name ?? null
      applyOwnAreaAssignment(selectedProfile.id, areaId, areaName)
      setSelectedProfile(null)
    } catch {
      Alert.alert('No fue posible asignar el área', 'Comprueba tus permisos y la conexión.')
    }
  }

  function refresh() {
    void profiles.refetch()
    void areas.refetch()
  }

  const loading = profiles.isLoading || areas.isLoading
  const error = profiles.error || areas.error

  return (
    <SafeAreaView edges={['bottom']} style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.eyebrow}>ADMINISTRACIÓN</Text>
          <Text accessibilityRole="header" style={styles.title}>
            Usuarios
          </Text>
          <Text style={styles.subtitle}>Asigna el área principal de cada usuario registrado.</Text>
        </View>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator color={colors.primary} size="large" />
          </View>
        ) : error ? (
          <View style={styles.center}>
            <Text style={styles.errorText}>No fue posible cargar los usuarios y las áreas.</Text>
            <Pressable onPress={refresh} style={styles.retryButton}>
              <Text style={styles.retryText}>Reintentar</Text>
            </Pressable>
          </View>
        ) : (
          <FlatList
            contentContainerStyle={styles.list}
            data={profiles.data ?? []}
            keyExtractor={(item) => item.id}
            ListEmptyComponent={<Text style={styles.empty}>No hay usuarios registrados.</Text>}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={refresh}
                tintColor={colors.primary}
              />
            }
            renderItem={({ item }) => (
              <Pressable
                accessibilityLabel={`Asignar área a ${item.fullName}`}
                onPress={() => setSelectedProfile(item)}
                style={styles.card}
              >
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{item.fullName.charAt(0).toUpperCase()}</Text>
                </View>
                <View style={styles.cardContent}>
                  <Text style={styles.name}>{item.fullName}</Text>
                  <Text style={styles.role}>{ROLE_LABELS[item.role]}</Text>
                  <View style={styles.areaRow}>
                    <Ionicons color={colors.primary} name="business-outline" size={15} />
                    <Text style={styles.areaName}>{item.areaName || 'Sin área asignada'}</Text>
                  </View>
                </View>
                <Ionicons color={colors.primary} name="chevron-forward" size={23} />
              </Pressable>
            )}
          />
        )}
      </View>

      <Modal
        animationType="fade"
        onRequestClose={() => setSelectedProfile(null)}
        transparent
        visible={selectedProfile !== null}
      >
        <View style={styles.modalBackdrop}>
          <SafeAreaView edges={['bottom']} style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleGroup}>
                <Text style={styles.modalTitle}>Asignar área</Text>
                <Text style={styles.modalSubtitle}>{selectedProfile?.fullName}</Text>
              </View>
              <Pressable accessibilityLabel="Cerrar" onPress={() => setSelectedProfile(null)}>
                <Ionicons color={colors.text} name="close" size={28} />
              </Pressable>
            </View>
            <FlatList
              contentContainerStyle={styles.areaOptions}
              data={(areas.data ?? []).filter((area) => area.isActive)}
              keyExtractor={(item) => item.id}
              ListHeaderComponent={
                <AreaOption
                  label="Sin área asignada"
                  loading={mutation.isPending}
                  onPress={() => void assignArea(null)}
                  selected={selectedProfile?.areaId === null}
                />
              }
              renderItem={({ item }) => (
                <AreaOption
                  label={item.name}
                  loading={mutation.isPending}
                  onPress={() => void assignArea(item.id)}
                  selected={selectedProfile?.areaId === item.id}
                />
              )}
            />
          </SafeAreaView>
        </View>
      </Modal>
    </SafeAreaView>
  )
}

function AreaOption({
  label,
  loading,
  onPress,
  selected,
}: {
  label: string
  loading: boolean
  onPress: () => void
  selected: boolean
}) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: selected, disabled: loading }}
      disabled={loading}
      onPress={onPress}
      style={[styles.areaOption, selected ? styles.areaOptionSelected : null]}
    >
      <Text style={styles.areaOptionText}>{label}</Text>
      {selected ? <Ionicons color={colors.primary} name="checkmark-circle" size={23} /> : null}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  container: { flex: 1, gap: spacing.lg, padding: spacing.lg },
  header: { gap: spacing.xs },
  eyebrow: { color: colors.primary, fontSize: 12, fontWeight: '800', letterSpacing: 1.2 },
  title: { color: colors.text, fontSize: 28, fontWeight: '800' },
  subtitle: { color: colors.textMuted, fontSize: 14, lineHeight: 20 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  errorText: { color: colors.error, fontWeight: '700', textAlign: 'center' },
  retryButton: { borderRadius: radius.md, backgroundColor: colors.primary, padding: spacing.md },
  retryText: { color: colors.white, fontWeight: '700' },
  list: { gap: spacing.md, paddingBottom: spacing.xl },
  empty: { color: colors.textMuted, paddingTop: spacing.xl, textAlign: 'center' },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    padding: spacing.md,
  },
  avatar: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 24,
    backgroundColor: colors.primarySoft,
  },
  avatarText: { color: colors.primary, fontSize: 19, fontWeight: '800' },
  cardContent: { flex: 1, gap: spacing.xs },
  name: { color: colors.text, fontSize: 16, fontWeight: '800' },
  role: { color: colors.textMuted, fontSize: 12 },
  areaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  areaName: { color: colors.primary, fontSize: 13, fontWeight: '700' },
  modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(23, 43, 77, 0.42)' },
  modalCard: {
    maxHeight: '75%',
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    backgroundColor: colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    padding: spacing.lg,
  },
  modalTitleGroup: { flex: 1, gap: spacing.xs },
  modalTitle: { color: colors.text, fontSize: 21, fontWeight: '800' },
  modalSubtitle: { color: colors.textMuted, fontSize: 13 },
  areaOptions: { gap: spacing.sm, padding: spacing.lg, paddingBottom: spacing.xl },
  areaOption: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
  },
  areaOptionSelected: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  areaOptionText: { flex: 1, color: colors.text, fontSize: 15, fontWeight: '700' },
})
