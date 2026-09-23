import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { useEffect, useState } from 'react'
import Animated, { FadeInDown, useReducedMotion } from 'react-native-reanimated'
import {
  SectionList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { EmptyState } from '@/components/feedback/EmptyState'
import { Button } from '@/components/ui/Button'
import { Chip } from '@/components/ui/Chip'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { SkeletonList } from '@/components/ui/SkeletonList'
import { hasPermission } from '@/features/auth/permissions'
import { useHomeSummary } from '@/features/home/useHomeSummary'
import type { MainStackParamList } from '@/navigation/types'
import { useAuthStore } from '@/store/authStore'
import { statusMeta } from '@/theme/statusMeta'
import { colors, radius, spacing, typography } from '@/theme/tokens'

import type { CaseRecord } from '../types'
import { groupCasesByDay } from '../caseDateGroups'
import { CaseCard } from '../components/CaseCard'
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
export function CasesListScreen({ navigation, route }: Props) {
  const profile = useAuthStore((state) => state.profile)
  const { data = [], error, isLoading, isRefetching, refetch } = useCases()
  const home = useHomeSummary(Boolean(profile?.organizationId))
  const [search, setSearch] = useState('')
  const [animateInitialList, setAnimateInitialList] = useState(true)
  const reduceMotion = useReducedMotion()
  const [filterNow, setFilterNow] = useState(() => Date.now())
  useEffect(() => {
    const interval = setInterval(() => setFilterNow(Date.now()), 60_000)
    return () => clearInterval(interval)
  }, [])
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
          !sinceDays || new Date(item.updatedAt).getTime() >= filterNow - sinceDays * 86_400_000
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
  const firstEntryOrder = new Map(filteredCases.slice(0, 8).map((item, index) => [item.id, index]))
  useEffect(() => {
    if (!animateInitialList || isLoading || error) return
    const timeout = setTimeout(() => setAnimateInitialList(false), filteredCases.length ? 600 : 0)
    return () => clearTimeout(timeout)
  }, [animateInitialList, isLoading, error, filteredCases.length])
  const scopedCases = profile
    ? data.filter((item) => matchesCaseScope(item, effectiveScope, profile))
    : []
  const segments = (Object.keys(STATUS_LABELS) as StatusFilter[]).map((value) => ({
    value,
    label: STATUS_LABELS[value],
    count:
      value === 'todos'
        ? scopedCases.length
        : scopedCases.filter((item) => STATUS_GROUPS[value].includes(item.status)).length,
  }))
  const hasFilters = Boolean(
    search ||
    status !== 'todos' ||
    exactStatus ||
    priority ||
    sinceDays ||
    activeOnly ||
    effectiveScope !== 'todas',
  )

  return (
    <SafeAreaView edges={['bottom']} style={styles.safeArea}>
      <View style={styles.container}>
        <Text accessibilityRole="header" style={styles.heading}>
          Solicitudes
        </Text>
        <View style={styles.toolbar}>
          <TextInput
            accessibilityLabel="Buscar casos"
            onChangeText={setSearch}
            placeholder="Buscar número, título o ubicación"
            placeholderTextColor={colors.textMuted}
            style={styles.search}
            value={search}
          />
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filters}
        >
          {scopes.map((value) => (
            <Chip
              key={value}
              label={SCOPE_LABELS[value]}
              selected={effectiveScope === value}
              onPress={() => changeFilters({ scope: value })}
            />
          ))}
        </ScrollView>

        <SegmentedControl
          segments={segments}
          selected={status}
          onChange={(value) => changeFilters({ status: value, exactStatus: null })}
        />
        {exactStatus ? (
          <Chip
            label={`Estado: ${statusMeta[exactStatus].label} ×`}
            accessibilityLabel={`Quitar filtro de estado ${statusMeta[exactStatus].label}`}
            onPress={() => changeFilters({ exactStatus: null })}
          />
        ) : null}
        {priority ? (
          <Chip
            label="Prioridad alta ×"
            accessibilityLabel="Quitar filtro de prioridad alta"
            onPress={() => changeFilters({ priority: null })}
          />
        ) : null}
        {sinceDays ? (
          <Chip
            label={`Últimos ${sinceDays} días ×`}
            accessibilityLabel={`Quitar filtro de los últimos ${sinceDays} días`}
            onPress={() => changeFilters({ sinceDays: null })}
          />
        ) : null}
        {activeOnly ? (
          <Chip
            label="Solo activas ×"
            accessibilityLabel="Quitar filtro de solicitudes activas"
            onPress={() => changeFilters({ activeOnly: false })}
          />
        ) : null}
        {scope === 'mias' && scopes.length === 0 ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => changeFilters({ scope: undefined })}
            style={styles.legacyScopeFilter}
          >
            <Text style={styles.legacyScopeText}>Solo mías ×</Text>
          </Pressable>
        ) : null}

        {isLoading ? (
          <SkeletonList />
        ) : error ? (
          <EmptyState
            title="No fue posible cargar las solicitudes"
            message="Comprueba tu conexión e inténtalo de nuevo."
            variant="noResults"
            action="Reintentar"
            onAction={() => void refetch()}
          />
        ) : (
          <SectionList
            contentContainerStyle={
              filteredCases.length
                ? [styles.list, canCreate && styles.listWithAction]
                : styles.emptyList
            }
            sections={groupCasesByDay(filteredCases)}
            keyExtractor={(item) => item.id}
            renderSectionHeader={({ section }) => (
              <Text style={styles.sectionTitle}>{section.title}</Text>
            )}
            ListEmptyComponent={
              <EmptyState
                title={hasFilters ? 'Sin resultados' : 'Todo al día'}
                message={
                  hasFilters
                    ? 'Prueba con otra búsqueda o quita los filtros.'
                    : 'Las solicitudes visibles para tu rol aparecerán aquí.'
                }
                variant={hasFilters ? 'noResults' : canCreate ? 'firstUse' : 'allDone'}
                action={hasFilters ? 'Quitar filtros' : canCreate ? 'Nueva solicitud' : undefined}
                onAction={
                  hasFilters
                    ? () => {
                        setSearch('')
                        changeFilters({
                          status: 'todos',
                          exactStatus: null,
                          priority: null,
                          sinceDays: null,
                          activeOnly: false,
                        })
                      }
                    : canCreate
                      ? () => navigation.navigate('CreateCase')
                      : undefined
                }
              />
            }
            refreshControl={
              <RefreshControl
                onRefresh={() => void refetch()}
                refreshing={isRefetching}
                tintColor={colors.primary}
              />
            }
            renderItem={({ item }) => {
              const order = firstEntryOrder.get(item.id)
              return (
                <Animated.View
                  entering={
                    animateInitialList && !reduceMotion && order !== undefined
                      ? FadeInDown.duration(220).delay(order * 40)
                      : undefined
                  }
                >
                  <CaseCard
                    item={item}
                    onPress={() => navigation.navigate('CaseDetail', { caseId: item.id })}
                  />
                </Animated.View>
              )
            }}
          />
        )}
        {canCreate ? (
          <View style={styles.floatingAction}>
            <Button
              label="Nueva solicitud"
              icon="add"
              onPress={() => navigation.navigate('CreateCase')}
            />
          </View>
        ) : null}
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  container: { flex: 1, padding: spacing.md, gap: spacing.md },
  heading: { ...typography.display, color: colors.text },
  sectionTitle: {
    ...typography.overline,
    color: colors.textMuted,
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  floatingAction: { position: 'absolute', right: spacing.md, bottom: spacing.md },
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
  filters: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },
  legacyScopeFilter: {
    minHeight: 44,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.base,
  },
  legacyScopeText: { ...typography.caption, color: colors.textMuted },
  list: { gap: spacing.md, paddingBottom: spacing.lg },
  listWithAction: { paddingBottom: 96 },
  emptyList: { flexGrow: 1 },
})
