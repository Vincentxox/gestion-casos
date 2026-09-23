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
import { useAreas } from '@/features/areas/useAreas'
import { APP_ROLES, ROLE_LABELS, type AppRole } from '@/features/auth/types'
import { colors, radius, spacing, typography } from '@/theme/tokens'
import { formatRelativeDate } from '@/theme/formatters'

import type { AccessRequest } from '../accessRequestService'
import {
  useAccessRequests,
  useApproveAccessRequest,
  useRejectAccessRequest,
} from '../useAccessRequests'

export function AccessRequestsScreen() {
  const requests = useAccessRequests()
  const areas = useAreas()
  const approve = useApproveAccessRequest()
  const reject = useRejectAccessRequest()
  const [resolved, setResolved] = useState(false)
  const [selected, setSelected] = useState<AccessRequest | null>(null)
  const [role, setRole] = useState<AppRole>('solicitante')
  const [areaId, setAreaId] = useState<string | null>(null)
  const [note, setNote] = useState('')
  const visible = (requests.data ?? []).filter((item) =>
    resolved ? item.status !== 'pendiente' : item.status === 'pendiente',
  )
  const areaKind = role === 'tecnico' ? 'tecnica' : null
  const availableAreas = (areas.data ?? []).filter(
    (area) => area.isActive && (!areaKind || area.kind === areaKind),
  )

  async function submitApproval() {
    if (!selected) return
    if ((role === 'tecnico' || role === 'jefe_area') && !areaId) {
      Alert.alert('Selecciona un área', 'Este rol necesita un área asignada.')
      return
    }
    try {
      await approve.mutateAsync({ id: selected.id, role, areaId })
      setSelected(null)
      Alert.alert('Acceso aprobado')
    } catch (error) {
      Alert.alert(
        'No fue posible aprobar',
        error instanceof Error ? error.message : 'Inténtalo de nuevo.',
      )
    }
  }

  async function submitRejection() {
    if (!selected) return
    if (note.trim().length > 0 && (note.trim().length < 3 || note.trim().length > 300)) {
      Alert.alert('Motivo inválido', 'El motivo debe tener entre 3 y 300 caracteres.')
      return
    }
    try {
      await reject.mutateAsync({ id: selected.id, note })
      setSelected(null)
      Alert.alert('Solicitud rechazada')
    } catch (error) {
      Alert.alert(
        'No fue posible rechazar',
        error instanceof Error ? error.message : 'Inténtalo de nuevo.',
      )
    }
  }

  return (
    <SafeAreaView edges={['bottom']} style={styles.safeArea}>
      <View style={styles.content}>
        <Text accessibilityRole="header" style={styles.title}>
          Solicitudes de acceso
        </Text>
        <View style={styles.tabs}>
          {[false, true].map((value) => (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: resolved === value }}
              key={String(value)}
              onPress={() => setResolved(value)}
              style={[styles.tab, resolved === value && styles.tabSelected]}
            >
              <Text style={styles.tabText}>{value ? 'Resueltas' : 'Pendientes'}</Text>
            </Pressable>
          ))}
        </View>
        {requests.isError || areas.isError ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              void requests.refetch()
              void areas.refetch()
            }}
          >
            <Text style={styles.error}>No fue posible cargar las solicitudes. Reintentar</Text>
          </Pressable>
        ) : null}
        <FlatList
          data={visible}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl
              refreshing={requests.isRefetching}
              onRefresh={() => void requests.refetch()}
            />
          }
          ListEmptyComponent={
            <Text style={styles.empty}>
              {requests.isLoading
                ? 'Cargando…'
                : resolved
                  ? 'Todavía no hay solicitudes resueltas.'
                  : 'No hay solicitudes pendientes. ¡Todo al día!'}
            </Text>
          }
          renderItem={({ item }) => (
            <Pressable
              accessibilityRole="button"
              disabled={resolved}
              onPress={() => {
                setSelected(item)
                setRole('solicitante')
                setAreaId(null)
                setNote('')
              }}
              style={styles.card}
            >
              <Text style={styles.name}>{item.fullName || item.email}</Text>
              <Text style={styles.subtext}>{item.email}</Text>
              <Text style={styles.subtext}>
                {formatRelativeDate(item.createdAt)} · {item.status}
              </Text>
              {item.decisionNote ? <Text style={styles.subtext}>{item.decisionNote}</Text> : null}
            </Pressable>
          )}
        />
      </View>
      <Modal
        animationType="slide"
        onRequestClose={() => setSelected(null)}
        transparent
        visible={Boolean(selected)}
      >
        <View style={styles.backdrop}>
          <SafeAreaView edges={['bottom']} style={styles.sheet}>
            <ScrollView contentContainerStyle={styles.sheetContent}>
              <View style={styles.sheetHeader}>
                <Text style={styles.name}>{selected?.fullName || selected?.email}</Text>
                <Pressable
                  accessibilityLabel="Cerrar"
                  accessibilityRole="button"
                  onPress={() => setSelected(null)}
                >
                  <Text style={styles.close}>×</Text>
                </Pressable>
              </View>
              <Text style={styles.subtext}>{selected?.email}</Text>
              <Text style={styles.name}>Asignar rol</Text>
              <View style={styles.choices}>
                {APP_ROLES.map((option) => (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ selected: role === option }}
                    key={option}
                    onPress={() => {
                      setRole(option)
                      setAreaId(null)
                    }}
                    style={[styles.choice, role === option && styles.choiceSelected]}
                  >
                    <Text style={styles.choiceText}>{ROLE_LABELS[option]}</Text>
                  </Pressable>
                ))}
              </View>
              <Text style={styles.name}>Asignar área</Text>
              {role !== 'tecnico' && role !== 'jefe_area' ? (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setAreaId(null)}
                  style={styles.choice}
                >
                  <Text>Sin área</Text>
                </Pressable>
              ) : null}
              <View style={styles.choices}>
                {availableAreas.map((area) => (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ selected: areaId === area.id }}
                    key={area.id}
                    onPress={() => setAreaId(area.id)}
                    style={[styles.choice, areaId === area.id && styles.choiceSelected]}
                  >
                    <Text style={styles.choiceText}>
                      {area.name} · {area.kind === 'tecnica' ? 'Técnica' : 'Solicitante'}
                    </Text>
                  </Pressable>
                ))}
              </View>
              <Button
                label="Aprobar acceso"
                loading={approve.isPending}
                onPress={() => void submitApproval()}
              />
              <Text style={styles.name}>O rechazar solicitud</Text>
              <TextInput
                accessibilityLabel="Motivo del rechazo"
                maxLength={300}
                multiline
                onChangeText={setNote}
                placeholder="Motivo opcional"
                style={styles.input}
                value={note}
              />
              <Pressable
                accessibilityRole="button"
                disabled={reject.isPending}
                onPress={() => void submitRejection()}
                style={styles.reject}
              >
                <Text style={styles.rejectText}>Rechazar acceso</Text>
              </Pressable>
            </ScrollView>
          </SafeAreaView>
        </View>
      </Modal>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  content: { flex: 1, padding: spacing.lg, gap: spacing.md },
  title: { color: colors.text, ...typography.display },
  tabs: { flexDirection: 'row', gap: spacing.sm },
  tab: {
    minHeight: 44,
    justifyContent: 'center',
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tabSelected: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  tabText: { color: colors.text, fontWeight: '700' },
  card: {
    gap: spacing.xs,
    padding: spacing.md,
    marginBottom: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  name: { color: colors.text, ...typography.heading },
  subtext: { color: colors.textMuted, ...typography.body },
  empty: { color: colors.textMuted, ...typography.body },
  error: { color: colors.error, ...typography.body },
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: colors.backdrop },
  sheet: {
    maxHeight: '85%',
    backgroundColor: colors.background,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
  },
  sheetContent: { gap: spacing.md, padding: spacing.lg },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  close: { color: colors.text, fontSize: 30 },
  choices: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  choice: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  choiceSelected: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  choiceText: { color: colors.text },
  input: {
    minHeight: 64,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    padding: spacing.md,
    color: colors.text,
  },
  reject: { minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  rejectText: { color: colors.error, fontWeight: '700' },
})
