import { AppFeedback } from '@/components/feedback/AppFeedback'
import { useState } from 'react'
import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { BottomSheet } from '@/components/sheets/BottomSheet'

import { SkeletonList } from '@/components/ui/SkeletonList'
import { RequestState } from '@/components/feedback/RequestState'
import { Card } from '@/components/ui/Card'
import { Chip } from '@/components/ui/Chip'
import { ScreenContainer } from '@/components/ui/ScreenContainer'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { EmptyState } from '@/components/feedback/EmptyState'
import { useAreas } from '@/features/areas/useAreas'
import { APP_ROLES, ROLE_ICONS, ROLE_LABELS, type AppRole } from '@/features/auth/types'
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
      AppFeedback.show('Selecciona un área', 'Este rol necesita un área asignada.')
      return
    }
    try {
      await approve.mutateAsync({ id: selected.id, role, areaId })
      setSelected(null)
      AppFeedback.toast('Acceso aprobado')
    } catch (error) {
      AppFeedback.show(
        'No fue posible aprobar',
        error instanceof Error ? error.message : 'Inténtalo de nuevo.',
      )
    }
  }

  async function submitRejection() {
    if (!selected) return
    if (note.trim().length > 0 && (note.trim().length < 3 || note.trim().length > 300)) {
      AppFeedback.show('Motivo inválido', 'El motivo debe tener entre 3 y 300 caracteres.')
      return
    }
    try {
      await reject.mutateAsync({ id: selected.id, note })
      setSelected(null)
      AppFeedback.toast('Solicitud rechazada', { tone: 'info' })
    } catch (error) {
      AppFeedback.show(
        'No fue posible rechazar',
        error instanceof Error ? error.message : 'Inténtalo de nuevo.',
      )
    }
  }

  return (
    <ScreenContainer edges={['bottom']} padded={false}>
      <View style={styles.content}>
        <SegmentedControl
          segments={[
            { value: 'pending', label: 'Pendientes' },
            { value: 'resolved', label: 'Resueltas' },
          ]}
          selected={resolved ? 'resolved' : 'pending'}
          onChange={(value) => setResolved(value === 'resolved')}
        />
        {requests.isError || areas.isError ? (
          <RequestState
            kind="error"
            title="No fue posible cargar las solicitudes"
            onRetry={() => {
              void requests.refetch()
              void areas.refetch()
            }}
          />
        ) : requests.isLoading ? (
          <SkeletonList />
        ) : (
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
              <EmptyState
                variant="allDone"
                title={resolved ? 'Sin solicitudes resueltas' : 'Todo al día'}
                message={
                  resolved
                    ? 'Todavía no hay solicitudes resueltas.'
                    : 'No hay solicitudes pendientes.'
                }
              />
            }
            renderItem={({ item }) => (
              <Card
                accessibilityLabel={`Revisar solicitud de ${item.fullName || item.email}`}
                onPress={
                  resolved
                    ? undefined
                    : () => {
                        setSelected(item)
                        setRole('solicitante')
                        setAreaId(null)
                        setNote('')
                      }
                }
                style={styles.card}
                contentStyle={styles.cardContent}
              >
                <Text style={styles.name}>{item.fullName || item.email}</Text>
                <Text style={styles.subtext}>{item.email}</Text>
                <Text style={styles.subtext}>
                  {formatRelativeDate(item.createdAt)} · {item.status}
                </Text>
                {item.decisionNote ? <Text style={styles.subtext}>{item.decisionNote}</Text> : null}
              </Card>
            )}
          />
        )}
      </View>
      <BottomSheet
        title={selected?.fullName || selected?.email || 'Solicitud de acceso'}
        subtitle={selected?.email}
        visible={Boolean(selected)}
        onClose={() => setSelected(null)}
        form
        footerAction={{
          label: 'Aprobar acceso',
          loading: approve.isPending,
          onPress: () => void submitApproval(),
        }}
      >
        <Text style={styles.name}>Asignar rol</Text>
        <View style={styles.choices}>
          {APP_ROLES.map((option) => (
            <Chip
              key={option}
              icon={ROLE_ICONS[option]}
              label={ROLE_LABELS[option]}
              selected={role === option}
              onPress={() => {
                setRole(option)
                setAreaId(null)
              }}
            />
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
      </BottomSheet>
    </ScreenContainer>
  )
}

const styles = StyleSheet.create({
  content: { flex: 1, padding: spacing.lg, gap: spacing.md },
  card: { marginBottom: spacing.sm },
  cardContent: { gap: spacing.xs, padding: spacing.md },
  name: { color: colors.text, ...typography.heading },
  subtext: { color: colors.textMuted, ...typography.body },
  error: { color: colors.error, ...typography.body },
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
  choiceText: { ...typography.body, color: colors.text },
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
  rejectText: { ...typography.body, color: colors.error },
})
