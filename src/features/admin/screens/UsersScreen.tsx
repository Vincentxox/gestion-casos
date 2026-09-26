import { Ionicons } from '@expo/vector-icons'
import { useState } from 'react'
import {
  Alert,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { Button } from '@/components/ui/Button'
import { Avatar } from '@/components/ui/Avatar'
import { EmptyState } from '@/components/feedback/EmptyState'
import { RequestState } from '@/components/feedback/RequestState'
import { SkeletonList } from '@/components/ui/SkeletonList'
import { Card } from '@/components/ui/Card'
import { Chip } from '@/components/ui/Chip'
import { ScreenContainer } from '@/components/ui/ScreenContainer'
import { useAreas } from '@/features/areas/useAreas'
import { APP_ROLES, ROLE_ICONS, ROLE_LABELS, type AppRole } from '@/features/auth/types'
import { useAuthStore } from '@/store/authStore'
import { colors, radius, spacing, typography } from '@/theme/tokens'

import type { ManagedProfile } from '../types'
import { useManagedProfiles, useSetMemberAccess } from '../useManagedProfiles'

export function UsersScreen() {
  const profiles = useManagedProfiles()
  const areas = useAreas()
  const mutation = useSetMemberAccess()
  const applyOwnAccess = useAuthStore((state) => state.applyOwnAccess)
  const [selectedProfile, setSelectedProfile] = useState<ManagedProfile | null>(null)
  const [role, setRole] = useState<AppRole>('solicitante')
  const [areaId, setAreaId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'todos' | 'sin_area' | AppRole>('todos')

  const refreshing = profiles.isRefetching || areas.isRefetching

  function openProfile(profile: ManagedProfile) {
    setSelectedProfile(profile)
    setRole(profile.role)
    setAreaId(profile.areaId)
  }

  async function saveAccess() {
    if (!selectedProfile) return

    if ((role === 'tecnico' || role === 'jefe_area') && !areaId) {
      Alert.alert('Selecciona un área', 'Este rol necesita un área asignada.')
      return
    }
    if (role === 'tecnico' && areas.data?.find((area) => area.id === areaId)?.kind !== 'tecnica') {
      Alert.alert('Área inválida', 'Un técnico debe pertenecer a un área técnica.')
      return
    }

    try {
      await mutation.mutateAsync({ userId: selectedProfile.id, role, areaId })
      const areaName = areas.data?.find((area) => area.id === areaId)?.name ?? null
      applyOwnAccess(selectedProfile.id, role, areaId, areaName)
      setSelectedProfile(null)
    } catch (error) {
      Alert.alert(
        'No fue posible guardar el acceso',
        error instanceof Error ? error.message : 'Comprueba tus permisos y la conexión.',
      )
    }
  }

  function refresh() {
    void profiles.refetch()
    void areas.refetch()
  }

  const loading = profiles.isLoading || areas.isLoading
  const error = profiles.error || areas.error
  const filteredProfiles = (profiles.data ?? []).filter((item) => {
    const matchesFilter =
      filter === 'todos' || (filter === 'sin_area' ? !item.areaId : item.role === filter)
    return (
      matchesFilter &&
      item.fullName.toLocaleLowerCase('es').includes(search.trim().toLocaleLowerCase('es'))
    )
  })

  return (
    <ScreenContainer edges={['bottom']} padded={false}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.subtitle}>
            Administra el rol y el área de los miembros de tu empresa.
          </Text>
        </View>
        <TextInput
          accessibilityLabel="Buscar usuarios"
          onChangeText={setSearch}
          placeholder="Buscar por nombre"
          style={styles.search}
          value={search}
        />
        <ScrollView
          horizontal
          style={styles.filterScroll}
          contentContainerStyle={styles.filterRow}
          showsHorizontalScrollIndicator={false}
        >
          {(['todos', 'sin_area', ...APP_ROLES] as const).map((value) => (
            <Chip
              key={value}
              label={
                value === 'todos' ? 'Todos' : value === 'sin_area' ? 'Sin área' : ROLE_LABELS[value]
              }
              selected={filter === value}
              onPress={() => setFilter(value)}
            />
          ))}
        </ScrollView>

        {loading ? (
          <SkeletonList />
        ) : error ? (
          <RequestState
            kind="error"
            title="No fue posible cargar los usuarios y las áreas"
            onRetry={refresh}
          />
        ) : (
          <FlatList
            contentContainerStyle={styles.list}
            data={filteredProfiles}
            keyExtractor={(item) => item.id}
            ListEmptyComponent={
              <EmptyState
                title="No hay usuarios registrados"
                message="Prueba con otro filtro o búsqueda."
                variant="noResults"
              />
            }
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={refresh}
                tintColor={colors.primary}
              />
            }
            renderItem={({ item }) => (
              <Card
                accessibilityLabel={`Editar acceso de ${item.fullName}`}
                onPress={() => openProfile(item)}
                contentStyle={styles.card}
              >
                <Avatar name={item.fullName} id={item.id} size={44} />
                <View style={styles.cardContent}>
                  <Text style={styles.name}>{item.fullName}</Text>
                  <Chip icon={ROLE_ICONS[item.role]} label={ROLE_LABELS[item.role]} />
                  <View style={styles.areaRow}>
                    <Ionicons color={colors.textMuted} name="business-outline" size={15} />
                    <Text style={styles.areaName}>{item.areaName || 'Sin área asignada'}</Text>
                  </View>
                </View>
                <Ionicons color={colors.primary} name="chevron-forward" size={23} />
              </Card>
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
                <Text style={styles.modalTitle}>Acceso del usuario</Text>
                <Text style={styles.modalSubtitle}>{selectedProfile?.fullName}</Text>
              </View>
              <Pressable
                accessibilityLabel="Cerrar"
                accessibilityRole="button"
                onPress={() => setSelectedProfile(null)}
                style={styles.closeButton}
              >
                <Ionicons color={colors.text} name="close" size={28} />
              </Pressable>
            </View>
            <FlatList
              contentContainerStyle={styles.areaOptions}
              data={(areas.data ?? []).filter(
                (area) =>
                  (area.isActive || area.id === areaId) &&
                  (role !== 'tecnico' || area.kind === 'tecnica'),
              )}
              keyExtractor={(item) => item.id}
              ListHeaderComponent={
                <View style={styles.areaOptions}>
                  <Text style={styles.sectionLabel}>Rol</Text>
                  {APP_ROLES.map((option) => (
                    <AreaOption
                      key={option}
                      label={ROLE_LABELS[option]}
                      loading={mutation.isPending}
                      onPress={() => setRole(option)}
                      selected={role === option}
                    />
                  ))}
                  <Text style={styles.sectionLabel}>Área</Text>
                  <AreaOption
                    label="Sin área asignada"
                    loading={mutation.isPending}
                    onPress={() => setAreaId(null)}
                    selected={areaId === null}
                  />
                </View>
              }
              renderItem={({ item }) => (
                <AreaOption
                  label={`${item.name} · ${item.kind === 'tecnica' ? 'Técnica' : 'Solicitante'}`}
                  loading={mutation.isPending}
                  onPress={() => setAreaId(item.id)}
                  selected={areaId === item.id}
                />
              )}
              ListFooterComponent={
                <Button
                  label="Guardar acceso"
                  loading={mutation.isPending}
                  onPress={() => void saveAccess()}
                />
              }
            />
          </SafeAreaView>
        </View>
      </Modal>
    </ScreenContainer>
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
  container: { flex: 1, gap: spacing.lg, padding: spacing.lg },
  header: { gap: spacing.xs },
  subtitle: { ...typography.body, color: colors.textMuted },
  search: {
    minHeight: 48,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    color: colors.text,
  },
  filterScroll: { flexGrow: 0, flexShrink: 0, minHeight: 52 },
  filterRow: { flexDirection: 'row', gap: spacing.sm, paddingVertical: spacing.xs },
  closeButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  list: { gap: spacing.md, paddingBottom: spacing.xl },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: 88,
  },
  cardContent: { flex: 1, gap: spacing.xs },
  name: { ...typography.heading, color: colors.text },
  areaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  areaName: { ...typography.caption, color: colors.textMuted },
  modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: colors.backdrop },
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
  modalTitle: { ...typography.title, color: colors.text },
  modalSubtitle: { ...typography.caption, color: colors.textMuted },
  areaOptions: { gap: spacing.sm, padding: spacing.lg, paddingBottom: spacing.xl },
  sectionLabel: { ...typography.heading, color: colors.text },
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
  areaOptionText: { ...typography.body, flex: 1, color: colors.text },
})
