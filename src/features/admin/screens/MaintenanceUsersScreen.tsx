import { Ionicons } from '@expo/vector-icons'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
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

import {
  assignMaintenanceRole,
  getMaintenanceUsers,
  type AssignableRole,
  type MaintenanceUser,
} from '@/features/admin/maintenanceUserService'
import type { AdministrationStackParamList } from '@/navigation/types'
import { useAuthStore } from '@/store/authStore'
import { colors, radius, spacing } from '@/theme/tokens'

const ROLE_OPTIONS: { value: AssignableRole; label: string }[] = [
  { value: 'coordinador', label: 'Coordinador' },
  { value: 'tecnico', label: 'Técnico' },
  { value: 'visualizador', label: 'Visualizador' },
]

const ROLE_LABELS = {
  administrador: 'Administrador',
  coordinador: 'Coordinador',
  tecnico: 'Técnico',
  auditor: 'Auditor',
  visualizador: 'Visualizador',
} as const

type Props = NativeStackScreenProps<AdministrationStackParamList, 'MaintenanceUsers'>

export function MaintenanceUsersScreen({ route }: Props) {
  const queryClient = useQueryClient()
  const ownId = useAuthStore((state) => state.profile?.id)
  const [pendingOnly, setPendingOnly] = useState(route.params?.pendingOnly ?? false)
  const [selectedUser, setSelectedUser] = useState<MaintenanceUser | null>(null)
  const [notice, setNotice] = useState('')

  const usersQuery = useQuery({
    queryKey: ['maintenance-users'],
    queryFn: getMaintenanceUsers,
  })
  const roleMutation = useMutation({
    mutationFn: assignMaintenanceRole,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['maintenance-users'] })
      void queryClient.invalidateQueries({ queryKey: ['maintenance-pending-roles'] })
      setNotice('Rol guardado. Se quitó el aviso de esta cuenta.')
      setSelectedUser(null)
    },
  })

  const users = usersQuery.data ?? []
  const pendingCount = users.filter((user) => user.rol_confirmado_en === null).length
  const visibleUsers = pendingOnly ? users.filter((user) => user.rol_confirmado_en === null) : users

  async function assignRole(role: AssignableRole) {
    if (!selectedUser) return
    try {
      await roleMutation.mutateAsync({ userId: selectedUser.id, role })
    } catch {
      Alert.alert('No se pudo asignar el rol', 'Comprueba la conexión y tus permisos.')
    }
  }

  return (
    <SafeAreaView edges={['bottom']} style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text accessibilityRole="header" style={styles.title}>
            Usuarios
          </Text>
          <Text style={styles.subtitle}>
            Revisa las cuentas nuevas y confirma el rol que corresponde a cada persona.
          </Text>
          <View style={styles.filters}>
            <FilterButton
              label={`Pendientes (${pendingCount})`}
              onPress={() => setPendingOnly(true)}
              selected={pendingOnly}
            />
            <FilterButton
              label="Todos"
              onPress={() => setPendingOnly(false)}
              selected={!pendingOnly}
            />
          </View>
          {notice ? <Text style={styles.notice}>{notice}</Text> : null}
        </View>

        {usersQuery.isPending ? (
          <ActivityIndicator color={colors.primary} size="large" />
        ) : usersQuery.isError ? (
          <View style={styles.center}>
            <Text style={styles.error}>No se pudieron cargar los usuarios.</Text>
            <Pressable accessibilityRole="button" onPress={() => usersQuery.refetch()}>
              <Text style={styles.link}>Reintentar</Text>
            </Pressable>
          </View>
        ) : (
          <FlatList
            contentContainerStyle={styles.list}
            data={visibleUsers}
            keyExtractor={(user) => user.id}
            ListEmptyComponent={
              <Text style={styles.empty}>
                {pendingOnly ? 'No hay usuarios pendientes de asignación.' : 'No hay usuarios.'}
              </Text>
            }
            refreshControl={
              <RefreshControl
                onRefresh={() => usersQuery.refetch()}
                refreshing={usersQuery.isRefetching}
                tintColor={colors.primary}
              />
            }
            renderItem={({ item }) => {
              const canAssign =
                item.id !== ownId && item.rol !== 'administrador' && item.rol !== 'auditor'
              return (
                <View style={styles.card}>
                  <View style={styles.userInfo}>
                    <Text style={styles.userName}>
                      {item.nombre_completo.trim() || `Usuario ${item.id.slice(0, 8)}`}
                    </Text>
                    <Text style={styles.meta}>
                      {ROLE_LABELS[item.rol]}
                      {item.rol_confirmado_en === null ? ' · Pendiente de confirmación' : ''}
                    </Text>
                  </View>
                  {canAssign ? (
                    <Pressable
                      accessibilityLabel={`Asignar rol a ${item.nombre_completo || 'usuario'}`}
                      accessibilityRole="button"
                      onPress={() => setSelectedUser(item)}
                      style={styles.action}
                    >
                      <Text style={styles.actionText}>Asignar rol</Text>
                    </Pressable>
                  ) : (
                    <Text style={styles.meta}>
                      {item.id === ownId ? 'Tu cuenta' : 'Solo lectura'}
                    </Text>
                  )}
                </View>
              )
            }}
          />
        )}
      </View>

      <Modal
        animationType="fade"
        onRequestClose={() => setSelectedUser(null)}
        transparent
        visible={selectedUser !== null}
      >
        <View style={styles.backdrop}>
          <SafeAreaView edges={['bottom']} style={styles.modal}>
            <View style={styles.modalHeading}>
              <View style={styles.userInfo}>
                <Text style={styles.modalTitle}>Asignar rol</Text>
                <Text style={styles.meta}>
                  {selectedUser?.nombre_completo || 'Usuario sin nombre'}
                </Text>
              </View>
              <Pressable
                accessibilityLabel="Cerrar"
                accessibilityRole="button"
                disabled={roleMutation.isPending}
                onPress={() => setSelectedUser(null)}
              >
                <Ionicons color={colors.text} name="close" size={25} />
              </Pressable>
            </View>
            <Text style={styles.explanation}>
              Selecciona el rol definitivo. Visualizador también confirma la cuenta y quita el
              aviso.
            </Text>
            {ROLE_OPTIONS.map((option) => (
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ disabled: roleMutation.isPending }}
                disabled={roleMutation.isPending}
                key={option.value}
                onPress={() => void assignRole(option.value)}
                style={styles.roleOption}
              >
                <Text style={styles.roleText}>{option.label}</Text>
                {selectedUser?.rol === option.value ? (
                  <Ionicons color={colors.primary} name="checkmark-circle" size={22} />
                ) : null}
              </Pressable>
            ))}
            {roleMutation.isPending ? <ActivityIndicator color={colors.primary} /> : null}
          </SafeAreaView>
        </View>
      </Modal>
    </SafeAreaView>
  )
}

function FilterButton({
  label,
  onPress,
  selected,
}: {
  label: string
  onPress: () => void
  selected: boolean
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[styles.filter, selected && styles.filterSelected]}
    >
      <Text style={[styles.filterText, selected && styles.filterTextSelected]}>{label}</Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  container: { flex: 1, gap: spacing.md, padding: spacing.lg },
  header: { gap: spacing.sm },
  title: { color: colors.text, fontSize: 28, fontWeight: '800' },
  subtitle: { color: colors.textMuted, fontSize: 14, lineHeight: 20 },
  filters: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  filter: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  filterSelected: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  filterText: { color: colors.text, fontSize: 13, fontWeight: '700' },
  filterTextSelected: { color: colors.primary },
  notice: { color: colors.success, fontSize: 13, fontWeight: '700' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  error: { color: colors.error, fontSize: 14 },
  link: { color: colors.primary, fontWeight: '700' },
  list: { gap: spacing.sm, paddingBottom: spacing.xl },
  empty: { color: colors.textMuted, paddingTop: spacing.xl, textAlign: 'center' },
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
  userInfo: { flex: 1, gap: spacing.xs },
  userName: { color: colors.text, fontSize: 15, fontWeight: '800' },
  meta: { color: colors.textMuted, fontSize: 12, lineHeight: 18 },
  action: {
    borderRadius: radius.sm,
    backgroundColor: colors.primarySoft,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  actionText: { color: colors.primary, fontSize: 12, fontWeight: '700' },
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(23, 43, 77, 0.42)' },
  modal: {
    gap: spacing.md,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    backgroundColor: colors.background,
    padding: spacing.lg,
  },
  modalHeading: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  modalTitle: { color: colors.text, fontSize: 21, fontWeight: '800' },
  explanation: { color: colors.textMuted, fontSize: 13, lineHeight: 19 },
  roleOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    padding: spacing.md,
  },
  roleText: { color: colors.text, fontSize: 15, fontWeight: '700' },
})
