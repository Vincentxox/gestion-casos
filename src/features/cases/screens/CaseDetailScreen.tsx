import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { hasPermission } from '@/features/auth/permissions'
import type { MainStackParamList } from '@/navigation/types'
import { useAuthStore } from '@/store/authStore'
import { colors, radius, spacing } from '@/theme/tokens'

import { useCaseDetail, useCaseHistory } from '../useCases'

type Props = NativeStackScreenProps<MainStackParamList, 'CaseDetail'>

const STATUS_LABELS = {
  abierto: 'Abierto',
  en_progreso: 'En progreso',
  cerrado: 'Cerrado',
} as const

function Field({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Text style={styles.fieldValue}>{value}</Text>
    </View>
  )
}

export function CaseDetailScreen({ navigation, route }: Props) {
  const { caseId } = route.params
  const profile = useAuthStore((state) => state.profile)
  const detail = useCaseDetail(caseId)
  const history = useCaseHistory(caseId)
  const canUpdate = hasPermission(profile?.role, 'cases.update')
  const canAssign = hasPermission(profile?.role, 'cases.assign')

  if (detail.isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} size="large" />
        <Text style={styles.muted}>Cargando detalle...</Text>
      </View>
    )
  }

  if (detail.error || !detail.data) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>No fue posible cargar el caso.</Text>
      </View>
    )
  }

  const item = detail.data
  return (
    <SafeAreaView edges={['bottom']} style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.heading}>
          <View style={styles.headingRow}>
            <Text style={styles.caseNumber}>{item.caseNumber}</Text>
            <Text style={styles.status}>{STATUS_LABELS[item.status]}</Text>
          </View>
          <Text accessibilityRole="header" style={styles.title}>
            {item.title}
          </Text>
          <Text style={styles.description}>{item.description}</Text>
        </View>

        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Información general</Text>
          <Field label="Categoría" value={item.category} />
          <Field label="Ubicación" value={item.location} />
          <Field
            label="Prioridad"
            value={item.priority.charAt(0).toUpperCase() + item.priority.slice(1)}
          />
          <Field label="Asignación" value={item.assignedTo ? 'Personal asignado' : 'Sin asignar'} />
          <Field label="Creado" value={new Date(item.createdAt).toLocaleString('es-GT')} />
        </View>

        {canUpdate || canAssign ? (
          <View style={styles.actions}>
            <Text style={styles.panelTitle}>Acciones</Text>
            {canUpdate ? (
              <>
                <ActionButton
                  label="Editar información"
                  onPress={() => navigation.navigate('EditCase', { caseId })}
                />
                <ActionButton
                  label="Cambiar estado"
                  onPress={() => navigation.navigate('ChangeCaseStatus', { caseId })}
                />
              </>
            ) : null}
            {canAssign ? (
              <ActionButton
                label="Asignar personal"
                onPress={() => navigation.navigate('AssignCase', { caseId })}
              />
            ) : null}
          </View>
        ) : null}

        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Historial de estados</Text>
          {history.isLoading ? <ActivityIndicator color={colors.primary} /> : null}
          {history.error ? (
            <Text style={styles.error}>No fue posible cargar el historial.</Text>
          ) : null}
          {history.data?.map((entry) => (
            <View key={entry.id} style={styles.historyItem}>
              <View style={styles.timelineDot} />
              <View style={styles.historyContent}>
                <Text style={styles.historyTitle}>{STATUS_LABELS[entry.newStatus]}</Text>
                <Text style={styles.muted}>
                  {new Date(entry.createdAt).toLocaleString('es-GT')}
                </Text>
                {entry.comment ? <Text style={styles.historyComment}>{entry.comment}</Text> : null}
              </View>
            </View>
          ))}
          {!history.isLoading && history.data?.length === 0 ? (
            <Text style={styles.muted}>Todavía no hay cambios registrados.</Text>
          ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

function ActionButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.actionButton}>
      <Text style={styles.actionButtonText}>{label}</Text>
      <Text style={styles.actionChevron}>›</Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  content: { gap: spacing.md, padding: spacing.lg, paddingBottom: spacing.xl },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.background,
  },
  heading: { gap: spacing.sm },
  headingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  caseNumber: { color: colors.primary, fontSize: 13, fontWeight: '800' },
  status: {
    overflow: 'hidden',
    borderRadius: 999,
    backgroundColor: colors.primarySoft,
    color: colors.primary,
    fontSize: 12,
    fontWeight: '800',
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  title: { color: colors.text, fontSize: 25, fontWeight: '800' },
  description: { color: colors.textMuted, fontSize: 15, lineHeight: 22 },
  panel: {
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    padding: spacing.md,
  },
  panelTitle: { color: colors.text, fontSize: 17, fontWeight: '800' },
  actions: {
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    padding: spacing.md,
  },
  actionButton: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
    paddingHorizontal: spacing.md,
  },
  actionButtonText: { color: colors.primary, fontWeight: '800' },
  actionChevron: { color: colors.primary, fontSize: 24, fontWeight: '700' },
  field: { gap: spacing.xs },
  fieldLabel: { color: colors.textMuted, fontSize: 12, fontWeight: '700' },
  fieldValue: { color: colors.text, fontSize: 15 },
  historyItem: { flexDirection: 'row', gap: spacing.sm },
  timelineDot: {
    width: 10,
    height: 10,
    marginTop: 5,
    borderRadius: 5,
    backgroundColor: colors.primary,
  },
  historyContent: {
    flex: 1,
    gap: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: spacing.sm,
  },
  historyTitle: { color: colors.text, fontWeight: '800' },
  historyComment: { color: colors.text, lineHeight: 20 },
  muted: { color: colors.textMuted },
  error: { color: colors.error, textAlign: 'center' },
})
