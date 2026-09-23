import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { useState } from 'react'
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

import { PriorityBadge } from '@/components/badges/PriorityBadge'
import { StatusBadge } from '@/components/badges/StatusBadge'
import { hasPermission } from '@/features/auth/permissions'
import { useHomeSummary } from '@/features/home/useHomeSummary'
import type { MainStackParamList } from '@/navigation/types'
import { useAuthStore } from '@/store/authStore'
import { colors, radius, spacing } from '@/theme/tokens'
import { formatRelativeDate } from '@/theme/formatters'

import type { CaseRecord } from '../types'
import { useCases } from '../useCases'
import {
  getScopeOptions,
  matchesCaseScope,
  type ScopeFilter,
  type StatusFilter,
} from '../caseListPresentation'

type Props = NativeStackScreenProps<MainStackParamList, 'Cases'>

const STATUS_LABELS: Record<StatusFilter, string> = {
  todos: 'Todos',
  pendientes: 'Pendientes',
  en_curso: 'En curso',
  cerradas: 'Cerradas',
}

const STATUS_GROUPS: Record<Exclude<StatusFilter, 'todos'>, CaseRecord['status'][]> = {
  pendientes: ['solicitado', 'aceptado'],
  en_curso: ['asignado', 'en_ejecucion', 'en_espera', 'reporte_enviado', 'validado'],
  cerradas: ['rechazado', 'cancelado', 'aprobado'],
}

const SCOPE_LABELS: Record<ScopeFilter, string> = {
  todas: 'Todas',
  mias: 'Mías',
  mis_trabajos: 'Mis trabajos',
  mi_area: 'Mi área',
  bandeja: 'Bandeja',
  por_aceptar: 'Por aceptar',
  sin_asignar: 'Sin asignar',
  en_curso: 'En curso',
}
const SESSION_NOW = Date.now()

function CaseCard({ item, onPress }: { item: CaseRecord; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.caseNumber}>
          {item.caseNumber} · {formatRelativeDate(item.createdAt, SESSION_NOW)}
        </Text>
        <PriorityBadge priority={item.priority} />
      </View>
      <Text numberOfLines={1} style={styles.cardTitle}>
        {item.title}
      </Text>
      <View style={styles.metaRow}>
        <StatusBadge status={item.status} />
        <Text style={styles.meta}>
          {item.requestingAreaName} → {item.targetAreaName}
        </Text>
      </View>
      <Text numberOfLines={1} style={styles.location}>
        {item.location}
      </Text>
      {item.assigneeName ? <Text style={styles.meta}>Asignado a {item.assigneeName}</Text> : null}
    </Pressable>
  )
}

export function CasesListScreen({ navigation, route }: Props) {
  const profile = useAuthStore((state) => state.profile)
  const { data = [], error, isLoading, isRefetching, refetch } = useCases()
  const home = useHomeSummary(Boolean(profile?.organizationId))
  const [search, setSearch] = useState('')
  const routeKey = JSON.stringify(route.params ?? {})
  const [selection, setSelection] = useState<{
    key: string
    status?: StatusFilter
    scope?: ScopeFilter
    exactStatus?: CaseRecord['status'] | null
    priority?: 'alta' | null
    sinceDays?: number | null
    activeOnly?: boolean
  } | null>(null)
  const filters = selection?.key === routeKey ? selection : route.params
  const status = filters?.status ?? 'todos'
  const scope = filters?.scope ?? null
  const exactStatus = filters?.exactStatus ?? null
  const priority = filters?.priority ?? null
  const sinceDays = filters?.sinceDays ?? null
  const activeOnly = filters?.activeOnly ?? false
  function changeFilters(patch: Partial<NonNullable<typeof selection>>) {
    setSelection({ key: routeKey, ...filters, ...patch })
  }
  const canCreate = hasPermission(profile?.role, 'cases.create') && Boolean(profile?.areaId)
  const scopes = profile ? getScopeOptions(profile, home.data?.area_kind ?? null) : []
  const effectiveScope =
    scope && (scopes.includes(scope) || scope === 'mias') ? scope : (scopes[0] ?? 'todas')

  const filteredCases = (() => {
    const term = search.trim().toLocaleLowerCase('es')
    return data
      .filter((item) => {
        const matchesStatus = exactStatus
          ? item.status === exactStatus
          : status === 'todos' || STATUS_GROUPS[status].includes(item.status)
        const matchesScope = profile ? matchesCaseScope(item, effectiveScope, profile) : false
        const matchesPriority = !priority || item.priority === priority
        const matchesActive =
          !activeOnly || !['rechazado', 'cancelado', 'aprobado'].includes(item.status)
        const matchesDate =
          !sinceDays || new Date(item.updatedAt).getTime() >= SESSION_NOW - sinceDays * 86_400_000
        const haystack = [item.caseNumber, item.title, item.category, item.location]
          .join(' ')
          .toLocaleLowerCase('es')
        return (
          matchesStatus &&
          matchesScope &&
          matchesPriority &&
          matchesActive &&
          matchesDate &&
          (!term || haystack.includes(term))
        )
      })
      .sort((a, b) =>
        status === 'pendientes'
          ? { alta: 0, media: 1, baja: 2 }[a.priority] -
              { alta: 0, media: 1, baja: 2 }[b.priority] || b.createdAt.localeCompare(a.createdAt)
          : b.createdAt.localeCompare(a.createdAt),
      )
  })()

  return (
    <SafeAreaView edges={['bottom']} style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.toolbar}>
          <TextInput
            accessibilityLabel="Buscar casos"
            onChangeText={setSearch}
            placeholder="Buscar número, título o ubicación"
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
          {scopes.map((value) => (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: effectiveScope === value }}
              key={value}
              onPress={() => changeFilters({ scope: value })}
              style={[styles.filter, effectiveScope === value && styles.filterActive]}
            >
              <Text
                style={[styles.filterText, effectiveScope === value && styles.filterTextActive]}
              >
                {SCOPE_LABELS[value]}
              </Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.filters}>
          {(Object.keys(STATUS_LABELS) as StatusFilter[]).map((value) => (
            <Pressable
              accessibilityRole="button"
              key={value}
              onPress={() => {
                changeFilters({ status: value, exactStatus: null })
              }}
              style={[styles.filter, status === value ? styles.filterActive : null]}
            >
              <Text style={[styles.filterText, status === value ? styles.filterTextActive : null]}>
                {STATUS_LABELS[value]}
              </Text>
            </Pressable>
          ))}
        </View>
        {exactStatus ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => changeFilters({ exactStatus: null })}
            style={styles.filter}
          >
            <Text style={styles.filterText}>Estado: {exactStatus.replace(/_/g, ' ')} ×</Text>
          </Pressable>
        ) : null}
        {priority ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => changeFilters({ priority: null })}
            style={styles.filter}
          >
            <Text style={styles.filterText}>Prioridad alta ×</Text>
          </Pressable>
        ) : null}
        {sinceDays ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => changeFilters({ sinceDays: null })}
            style={styles.filter}
          >
            <Text style={styles.filterText}>Últimos {sinceDays} días ×</Text>
          </Pressable>
        ) : null}
        {activeOnly ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => changeFilters({ activeOnly: false })}
            style={styles.filter}
          >
            <Text style={styles.filterText}>Solo activas ×</Text>
          </Pressable>
        ) : null}
        {scope === 'mias' && scopes.length === 0 ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => changeFilters({ scope: undefined })}
            style={styles.filter}
          >
            <Text style={styles.filterText}>Solo mías ×</Text>
          </Pressable>
        ) : null}

        {isLoading ? (
          <View style={styles.center}>
            <ActivityIndicator color={colors.primary} size="large" />
            <Text style={styles.muted}>Cargando casos...</Text>
          </View>
        ) : error ? (
          <View style={styles.center}>
            <Text style={styles.errorTitle}>No fue posible cargar los casos</Text>
            <Text style={styles.muted}>Comprueba tu conexión e inténtalo de nuevo.</Text>
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
                  {search || status !== 'todos' || effectiveScope !== 'todas'
                    ? 'Cambia la búsqueda o los filtros.'
                    : 'Las solicitudes visibles para tu rol aparecerán aquí.'}
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
