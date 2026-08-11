import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { useMemo, useState } from 'react'
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { hasPermission } from '@/features/auth/permissions'
import type { MainStackParamList } from '@/navigation/types'
import { useAuthStore } from '@/store/authStore'
import { colors, radius, spacing } from '@/theme/tokens'

import type { CaseRecord, CaseStatus } from '../types'
import { useCases } from '../useCases'

type Props = NativeStackScreenProps<MainStackParamList, 'Cases'>
type StatusFilter = 'todos' | CaseStatus

const STATUS_LABELS: Record<StatusFilter, string> = {
  todos: 'Todos',
  abierto: 'Abiertos',
  en_progreso: 'En progreso',
  cerrado: 'Cerrados',
}

const PRIORITY_COLORS = { alta: '#C4320A', media: '#B54708', baja: '#16803B' } as const

function CaseCard({ item, onPress }: { item: CaseRecord; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.caseNumber}>{item.caseNumber}</Text>
        <Text style={[styles.priority, { color: PRIORITY_COLORS[item.priority] }]}>
          {item.priority.toUpperCase()}
        </Text>
      </View>
      <Text style={styles.cardTitle}>{item.title}</Text>
      <Text numberOfLines={2} style={styles.cardDescription}>
        {item.description}
      </Text>
      <View style={styles.metaRow}>
        <Text style={styles.status}>{STATUS_LABELS[item.status]}</Text>
        <Text style={styles.meta}>{item.category}</Text>
      </View>
      <Text numberOfLines={1} style={styles.location}>
        {item.location}
      </Text>
    </Pressable>
  )
}

export function CasesListScreen({ navigation }: Props) {
  const profile = useAuthStore((state) => state.profile)
  const { data = [], error, isLoading, isRefetching, refetch } = useCases()
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<StatusFilter>('todos')
  const canCreate = hasPermission(profile?.role, 'cases.create')

  const filteredCases = useMemo(() => {
    const term = search.trim().toLocaleLowerCase('es')
    return data.filter((item) => {
      const matchesStatus = status === 'todos' || item.status === status
      const haystack = [item.caseNumber, item.title, item.category, item.location]
        .join(' ')
        .toLocaleLowerCase('es')
      return matchesStatus && (!term || haystack.includes(term))
    })
  }, [data, search, status])

  return (
    <SafeAreaView edges={['bottom']} style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.toolbar}>
          <TextInput
            accessibilityLabel="Buscar casos"
            onChangeText={setSearch}
            placeholder="Buscar por ID, título o ubicación"
            placeholderTextColor={colors.textMuted}
            style={styles.search}
            value={search}
          />
          {canCreate ? (
            <Pressable
              accessibilityLabel="Crear caso"
              accessibilityRole="button"
              onPress={() => navigation.navigate('CreateCase')}
              style={styles.createButton}
            >
              <Text style={styles.createButtonText}>+ Crear</Text>
            </Pressable>
          ) : null}
        </View>

        <View style={styles.filters}>
          {(Object.keys(STATUS_LABELS) as StatusFilter[]).map((value) => (
            <Pressable
              accessibilityRole="button"
              key={value}
              onPress={() => setStatus(value)}
              style={[styles.filter, status === value ? styles.filterActive : null]}
            >
              <Text style={[styles.filterText, status === value ? styles.filterTextActive : null]}>
                {STATUS_LABELS[value]}
              </Text>
            </Pressable>
          ))}
        </View>

        {isLoading ? (
          <View style={styles.center}>
            <ActivityIndicator color={colors.primary} size="large" />
            <Text style={styles.muted}>Cargando casos...</Text>
          </View>
        ) : error ? (
          <View style={styles.center}>
            <Text style={styles.errorTitle}>No fue posible cargar los casos</Text>
            <Text style={styles.muted}>Verifica que la migración de la etapa 3 esté aplicada.</Text>
            <Pressable onPress={() => void refetch()} style={styles.retry}>
              <Text style={styles.retryText}>Reintentar</Text>
            </Pressable>
          </View>
        ) : (
          <FlatList
            contentContainerStyle={filteredCases.length ? styles.list : styles.emptyList}
            data={filteredCases}
            keyExtractor={(item) => item.id}
            ListEmptyComponent={
              <View style={styles.center}>
                <Text style={styles.emptyTitle}>No hay casos para mostrar</Text>
                <Text style={styles.muted}>
                  {search || status !== 'todos'
                    ? 'Cambia la búsqueda o los filtros.'
                    : 'Crea el primer caso para iniciar el seguimiento.'}
                </Text>
              </View>
            }
            refreshControl={
              <RefreshControl
                onRefresh={() => void refetch()}
                refreshing={isRefetching}
                tintColor={colors.primary}
              />
            }
            renderItem={({ item }) => (
              <CaseCard
                item={item}
                onPress={() => navigation.navigate('CaseDetail', { caseId: item.id })}
              />
            )}
          />
        )}
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  container: { flex: 1, padding: spacing.md, gap: spacing.md },
  toolbar: { flexDirection: 'row', gap: spacing.sm },
  search: {
    flex: 1,
    minHeight: 48,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    color: colors.text,
    paddingHorizontal: spacing.md,
  },
  createButton: {
    minHeight: 48,
    justifyContent: 'center',
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
  },
  createButtonText: { color: colors.white, fontWeight: '800' },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  filter: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    backgroundColor: colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  filterActive: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  filterText: { color: colors.textMuted, fontSize: 12, fontWeight: '700' },
  filterTextActive: { color: colors.primary },
  list: { gap: spacing.md, paddingBottom: spacing.lg },
  emptyList: { flexGrow: 1 },
  card: {
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    padding: spacing.md,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  caseNumber: { color: colors.primary, fontSize: 12, fontWeight: '800' },
  priority: { fontSize: 11, fontWeight: '800' },
  cardTitle: { color: colors.text, fontSize: 17, fontWeight: '800' },
  cardDescription: { color: colors.textMuted, lineHeight: 20 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  status: {
    overflow: 'hidden',
    borderRadius: 999,
    backgroundColor: colors.primarySoft,
    color: colors.primary,
    fontSize: 12,
    fontWeight: '700',
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  meta: { color: colors.textMuted, fontSize: 12 },
  location: { color: colors.textMuted, fontSize: 12 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  emptyTitle: { color: colors.text, fontSize: 18, fontWeight: '800' },
  errorTitle: { color: colors.error, fontSize: 17, fontWeight: '800', textAlign: 'center' },
  muted: { color: colors.textMuted, textAlign: 'center' },
  retry: { borderRadius: radius.md, backgroundColor: colors.primary, padding: spacing.md },
  retryText: { color: colors.white, fontWeight: '700' },
})
