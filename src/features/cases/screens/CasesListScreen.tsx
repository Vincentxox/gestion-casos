import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { useEffect, useState } from 'react'
import Animated, { FadeInDown, useReducedMotion } from 'react-native-reanimated'
import {
  SectionList,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { EmptyState } from '@/components/feedback/EmptyState'
import { OfflineBanner } from '@/components/feedback/OfflineBanner'
import { Button } from '@/components/ui/Button'
import { Chip } from '@/components/ui/Chip'
import { Icon } from '@/components/ui/Icon'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { SkeletonList } from '@/components/ui/SkeletonList'
import { hasPermission } from '@/features/auth/permissions'
import { useHomeSummary } from '@/features/home/useHomeSummary'
import type { MainStackParamList } from '@/navigation/types'
import { useAuthStore } from '@/store/authStore'
import { statusMeta } from '@/theme/statusMeta'
import { colors, fonts, radius, spacing, typography } from '@/theme/tokens'

import type { CaseRecord } from '../types'
import { groupCasesByDay } from '../caseDateGroups'
import { CaseCard } from '../components/CaseCard'
import { useCaseCounts, useCases } from '../useCases'
import { getScopeOptions, type ScopeFilter, type StatusFilter } from '../caseListPresentation'
import { buildCaseSearchFilters, getCaseSegments } from '../caseSearch'

type Props = NativeStackScreenProps<MainStackParamList, 'Cases'>

const STATUS_LABELS: Record<StatusFilter, string> = {
  todos: 'Todas',
  pendientes: 'Pendientes',
  en_curso: 'En curso',
  cerradas: 'Cerradas',
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
  const home = useHomeSummary(Boolean(profile?.organizationId))
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(timeout)
  }, [search])
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
  const routeFilters = selection?.key === routeKey ? selection : route.params
  const status = routeFilters?.status ?? 'todos'
  const scope = routeFilters?.scope ?? null
  const exactStatus = routeFilters?.exactStatus ?? null
  const priority = routeFilters?.priority ?? null
  const sinceDays = routeFilters?.sinceDays ?? null
  const activeOnly = routeFilters?.activeOnly ?? false
  function changeFilters(patch: Partial<NonNullable<typeof selection>>) {
    setSelection({ key: routeKey, ...routeFilters, ...patch })
  }
  const canCreate = hasPermission(profile?.role, 'cases.create') && Boolean(profile?.areaId)
  const scopes = profile ? getScopeOptions(profile, home.data?.area_kind ?? null) : []
  const specialScope = scope === 'por_aceptar' || scope === 'sin_asignar' ? scope : null
  const effectiveScope = specialScope
    ? 'bandeja'
    : scope && (scopes.includes(scope) || scope === 'mias')
      ? scope
      : (scopes[0] ?? 'todas')
  const filters = buildCaseSearchFilters({
    status,
    scope: specialScope ?? effectiveScope,
    exactStatus,
    priority,
    sinceDays,
    activeOnly,
    searchText: debouncedSearch,
    now: filterNow,
  })
  const {
    data,
    error,
    isLoading,
    isRefetching,
    refetch,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
    isFetchNextPageError,
  } = useCases(filters, Boolean(profile?.organizationId))
  const requestNextPage = () => void fetchNextPage()
  const counts = useCaseCounts(filters, Boolean(profile?.organizationId))
  const filteredCases = data?.pages.flat() ?? []
  const firstEntryOrder = new Map(filteredCases.slice(0, 8).map((item, index) => [item.id, index]))
  useEffect(() => {
    if (!animateInitialList || isLoading || error) return
    const timeout = setTimeout(() => setAnimateInitialList(false), filteredCases.length ? 600 : 0)
    return () => clearTimeout(timeout)
  }, [animateInitialList, isLoading, error, filteredCases.length])
  const segmentCounts = counts.data ? getCaseSegments(counts.data) : null
  const segments = (Object.keys(STATUS_LABELS) as StatusFilter[]).map((value) => ({
    value,
    label: STATUS_LABELS[value],
    count: segmentCounts?.[value],
  }))
  const hasFilters = Boolean(
    search ||
    status !== 'todos' ||
    exactStatus ||
    priority ||
    sinceDays ||
    activeOnly ||
    Boolean(scope),
  )

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <View style={styles.container}>
        <Text accessibilityRole="header" style={styles.heading}>
          Solicitudes
        </Text>
        <OfflineBanner />
        <View style={styles.toolbar}>
          <Icon name="search" size="inline" color={colors.textMuted} />
          <TextInput
            accessibilityLabel="Buscar casos"
            maxLength={100}
            onChangeText={setSearch}
            placeholder="Buscar número, título o ubicación"
            placeholderTextColor={colors.textMuted}
            style={styles.search}
            value={search}
          />
        </View>

        {scopes.length ? (
          <ScrollView
            horizontal
            style={styles.filterScroll}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filters}
          >
            {scopes.map((value) => (
              <Chip
                key={value}
                label={SCOPE_LABELS[value]}
                selected={effectiveScope === value}
                onPress={() => changeFilters({ scope: value, exactStatus: null })}
              />
            ))}
          </ScrollView>
        ) : null}

        <SegmentedControl
          segments={segments}
          selected={status}
          onChange={(value) => changeFilters({ status: value, exactStatus: null })}
        />
        {counts.isError ? (
          <Button label="Reintentar conteos" variant="text" onPress={() => void counts.refetch()} />
        ) : null}
        {exactStatus ? (
          <Chip
            label={`Estado: ${statusMeta[exactStatus].label} ×`}
            accessibilityLabel={`Quitar filtro de estado ${statusMeta[exactStatus].label}`}
            onPress={() => changeFilters({ exactStatus: null })}
          />
        ) : null}
        {specialScope ? (
          <Chip
            label={`${SCOPE_LABELS[specialScope]} ×`}
            accessibilityLabel={`Quitar filtro ${SCOPE_LABELS[specialScope]}`}
            onPress={() => changeFilters({ scope: undefined, exactStatus: null })}
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
          <Chip label="Solo mías ×" onPress={() => changeFilters({ scope: undefined })} />
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
            contentContainerStyle={filteredCases.length ? styles.list : styles.emptyList}
            sections={
              filters.sortPending && filteredCases.length
                ? [{ title: 'Pendientes', data: filteredCases }]
                : groupCasesByDay(filteredCases)
            }
            keyExtractor={(item) => item.id}
            onEndReached={() => {
              if (hasNextPage && !isFetchingNextPage) requestNextPage()
            }}
            onEndReachedThreshold={0.4}
            ListFooterComponent={
              isFetchingNextPage ? (
                <ActivityIndicator
                  accessibilityLabel="Cargando más solicitudes"
                  color={colors.primary}
                />
              ) : isFetchNextPageError ? (
                <Button label="Reintentar carga" onPress={requestNextPage} />
              ) : null
            }
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
                          scope: undefined,
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
                onRefresh={() => {
                  void refetch()
                  void counts.refetch()
                }}
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
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  container: {
    flex: 1,
    paddingHorizontal: spacing.compact,
    paddingTop: spacing.md,
    gap: spacing.base,
  },
  heading: {
    ...typography.display,
    fontSize: 36,
    lineHeight: 42,
    letterSpacing: -1,
    color: colors.ink,
  },
  sectionTitle: {
    ...typography.caption,
    fontFamily: fonts.bold,
    color: colors.textMuted,
    backgroundColor: colors.background,
    paddingTop: spacing.md,
    paddingBottom: spacing.xs,
  },
  toolbar: {
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.xl,
    backgroundColor: colors.surfaceMuted,
  },
  search: { ...typography.body, flex: 1, minHeight: 48, color: colors.text },
  filterScroll: { flexGrow: 0, flexShrink: 0, minHeight: 52 },
  filters: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  list: { gap: spacing.xs, paddingBottom: spacing.lg },
  emptyList: { flexGrow: 1 },
})
