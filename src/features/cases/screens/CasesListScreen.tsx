import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { useEffect, useState } from 'react'
import Animated, { FadeInDown, useReducedMotion } from 'react-native-reanimated'
import {
  SectionList,
  ActivityIndicator,
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
import { OfflineBanner } from '@/components/feedback/OfflineBanner'
import { BottomSheet } from '@/components/sheets/BottomSheet'
import { Button } from '@/components/ui/Button'
import { Chip } from '@/components/ui/Chip'
import { Icon } from '@/components/ui/Icon'
import { SkeletonList } from '@/components/ui/SkeletonList'
import { hasPermission } from '@/features/auth/permissions'
import { useHomeSummary } from '@/features/home/useHomeSummary'
import type { MainStackParamList } from '@/navigation/types'
import { useAuthStore } from '@/store/authStore'
import { statusMeta } from '@/theme/statusMeta'
import { colors, elevation, fonts, radius, spacing, typography } from '@/theme/tokens'

import { CASE_STATUSES, type CaseRecord } from '../types'
import { groupCasesByDay } from '../caseDateGroups'
import { CaseCard } from '../components/CaseCard'
import { useCaseCounts, useCases } from '../useCases'
import {
  getPrimaryScopeOptions,
  getScopeOptions,
  type ScopeFilter,
  type StatusFilter,
} from '../caseListPresentation'
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
  const [filtersOpen, setFiltersOpen] = useState(false)
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
  const primaryScopes = profile
    ? getPrimaryScopeOptions(profile, home.data?.area_kind ?? null)
    : (['todas', 'mias'] as const)
  const specialScope = scope === 'por_aceptar' || scope === 'sin_asignar' ? scope : null
  const effectiveScope = scope ?? primaryScopes[0]
  const selectedScope = specialScope ? 'bandeja' : effectiveScope
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
    if (!animateInitialList || isLoading || error || !filteredCases.length) return
    const timeout = setTimeout(() => setAnimateInitialList(false), 600)
    return () => clearTimeout(timeout)
  }, [animateInitialList, isLoading, error, filteredCases.length])
  const segmentCounts = counts.data ? getCaseSegments(counts.data) : null
  const segments = (Object.keys(STATUS_LABELS) as StatusFilter[]).map((value) => ({
    value,
    label: STATUS_LABELS[value],
    count: segmentCounts?.[value],
  }))
  const extraScope = scope && !primaryScopes.includes(scope) ? scope : null
  const chips = [
    ...(exactStatus ? [{ key: 'exactStatus', label: statusMeta[exactStatus].label }] : []),
    ...(extraScope ? [{ key: 'scope', label: SCOPE_LABELS[extraScope] }] : []),
    ...(priority ? [{ key: 'priority', label: 'Prioridad alta' }] : []),
    ...(sinceDays ? [{ key: 'sinceDays', label: `Últimos ${sinceDays} días` }] : []),
    ...(activeOnly ? [{ key: 'activeOnly', label: 'Solo activas' }] : []),
  ] as const
  const hasFilters = Boolean(search || status !== 'todos' || chips.length || scope)
  function clearChips() {
    changeFilters({
      exactStatus: null,
      scope: extraScope ? (specialScope ? 'bandeja' : undefined) : (scope ?? undefined),
      priority: null,
      sinceDays: null,
      activeOnly: false,
    })
  }
  function removeChip(key: (typeof chips)[number]['key']) {
    if (key === 'exactStatus') changeFilters({ exactStatus: null })
    if (key === 'scope') changeFilters({ scope: specialScope ? 'bandeja' : undefined })
    if (key === 'priority') changeFilters({ priority: null })
    if (key === 'sinceDays') changeFilters({ sinceDays: null })
    if (key === 'activeOnly') changeFilters({ activeOnly: false })
  }

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <View style={styles.container}>
        <Text accessibilityRole="header" style={styles.heading}>
          Solicitudes
        </Text>
        <OfflineBanner />
        <View style={styles.searchRow}>
          <View style={styles.toolbar}>
            <Icon name="search" size="inline" color={colors.textMuted} />
            <TextInput
              accessibilityLabel="Buscar solicitudes"
              maxLength={100}
              onChangeText={setSearch}
              placeholder="Buscar número, título o lugar"
              placeholderTextColor={colors.textMuted}
              style={styles.search}
              value={search}
            />
          </View>
          <Pressable
            accessibilityLabel={`Más filtros, ${chips.length} ${chips.length === 1 ? 'activo' : 'activos'}`}
            accessibilityRole="button"
            onPress={() => setFiltersOpen(true)}
            style={styles.filterButton}
          >
            <Icon name="options-outline" size={20} color={colors.text} />
            {chips.length ? (
              <View style={styles.filterBadge}>
                <Text style={styles.filterBadgeText}>{chips.length}</Text>
              </View>
            ) : null}
          </Pressable>
        </View>

        <View accessibilityLabel="Alcance" style={styles.scopeSelector}>
          {primaryScopes.map((value) => (
            <Pressable
              key={value}
              accessibilityLabel={SCOPE_LABELS[value]}
              accessibilityRole="tab"
              accessibilityState={{ selected: selectedScope === value }}
              onPress={() => changeFilters({ scope: value, exactStatus: null })}
              style={[styles.scopeTab, selectedScope === value && styles.scopeTabSelected]}
            >
              <Text style={[styles.scopeText, selectedScope === value && styles.scopeTextSelected]}>
                {SCOPE_LABELS[value]}
              </Text>
            </Pressable>
          ))}
        </View>

        <View accessibilityLabel="Estado" style={styles.statusTabs}>
          {segments.map((segment) => (
            <Pressable
              key={segment.value}
              accessibilityLabel={`${segment.label}, ${segment.count ?? 'cargando'} solicitudes`}
              accessibilityRole="tab"
              accessibilityState={{ selected: status === segment.value }}
              onPress={() => changeFilters({ status: segment.value, exactStatus: null })}
              style={[styles.statusTab, status === segment.value && styles.statusTabSelected]}
            >
              <Text
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.8}
                style={[styles.statusText, status === segment.value && styles.statusTextSelected]}
              >
                {segment.label}
              </Text>
              <Text
                style={[styles.statusCount, status === segment.value && styles.statusCountSelected]}
              >
                {segment.count ?? '…'}
              </Text>
            </Pressable>
          ))}
        </View>
        {counts.isError ? (
          <Button label="Reintentar conteos" variant="text" onPress={() => void counts.refetch()} />
        ) : null}
        {chips.length ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.filterScroll}
            contentContainerStyle={styles.filters}
          >
            {chips.map((chip) => (
              <Pressable
                key={chip.key}
                accessibilityLabel={`Quitar filtro ${chip.label}`}
                accessibilityRole="button"
                accessibilityState={{ selected: true }}
                onPress={() => removeChip(chip.key)}
                style={styles.activeChip}
              >
                <Text style={styles.activeChipText}>{chip.label}</Text>
                <Icon name="close" size={14} color={colors.primaryDark} />
              </Pressable>
            ))}
            <Pressable
              accessibilityLabel="Limpiar filtros activos"
              accessibilityRole="button"
              onPress={clearChips}
              style={styles.clearButton}
            >
              <Text style={styles.clearText}>Limpiar</Text>
            </Pressable>
          </ScrollView>
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
      <BottomSheet
        visible={filtersOpen}
        title="Más filtros"
        onClose={() => setFiltersOpen(false)}
        footerAction={{ label: 'Ver solicitudes', onPress: () => setFiltersOpen(false) }}
      >
        <Text style={styles.sheetHeading}>Estado exacto</Text>
        <View style={styles.sheetChoices}>
          {CASE_STATUSES.map((value) => (
            <Chip
              key={value}
              label={statusMeta[value].label}
              selected={exactStatus === value}
              onPress={() =>
                changeFilters({
                  exactStatus: exactStatus === value ? null : value,
                  status: 'todos',
                })
              }
            />
          ))}
        </View>
        {scopes.some((value) => !primaryScopes.includes(value)) ? (
          <>
            <Text style={styles.sheetHeading}>Otros alcances</Text>
            <View style={styles.sheetChoices}>
              {scopes
                .filter((value) => !primaryScopes.includes(value))
                .map((value) => (
                  <Chip
                    key={value}
                    label={SCOPE_LABELS[value]}
                    selected={scope === value}
                    onPress={() => changeFilters({ scope: scope === value ? undefined : value })}
                  />
                ))}
            </View>
          </>
        ) : null}
        <Text style={styles.sheetHeading}>Prioridad</Text>
        <View style={styles.sheetChoices}>
          <Chip
            label="Alta"
            selected={priority === 'alta'}
            onPress={() => changeFilters({ priority: priority === 'alta' ? null : 'alta' })}
          />
        </View>
        <Text style={styles.sheetHeading}>Actualizadas</Text>
        <View style={styles.sheetChoices}>
          {[7, 30].map((days) => (
            <Chip
              key={days}
              label={`Últimos ${days} días`}
              selected={sinceDays === days}
              onPress={() => changeFilters({ sinceDays: sinceDays === days ? null : days })}
            />
          ))}
        </View>
        <Text style={styles.sheetHeading}>Actividad</Text>
        <View style={styles.sheetChoices}>
          <Chip
            label="Solo activas"
            selected={activeOnly}
            onPress={() => changeFilters({ activeOnly: !activeOnly })}
          />
        </View>
      </BottomSheet>
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
    fontSize: 26,
    lineHeight: 32,
    letterSpacing: -0.6,
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
  searchRow: { flexDirection: 'row', gap: spacing.sm },
  toolbar: {
    flex: 1,
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceMuted,
  },
  search: { ...typography.body, flex: 1, minHeight: 44, color: colors.text },
  filterButton: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceMuted,
  },
  filterBadge: {
    position: 'absolute',
    right: 0,
    top: 0,
    minWidth: 18,
    height: 18,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterBadgeText: { fontSize: 11, fontFamily: fonts.bold, color: colors.white },
  scopeSelector: {
    minHeight: 50,
    flexDirection: 'row',
    padding: spacing.xs,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceMuted,
  },
  scopeTab: {
    flex: 1,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.sm,
  },
  scopeTabSelected: { backgroundColor: colors.surface, ...elevation.sm },
  scopeText: { ...typography.body, fontFamily: fonts.semibold, color: colors.textMuted },
  scopeTextSelected: { fontFamily: fonts.bold, color: colors.ink },
  statusTabs: {
    minHeight: 44,
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderColor: colors.border,
  },
  statusTab: {
    flex: 1,
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    borderBottomWidth: 2,
    borderColor: 'transparent',
  },
  statusTabSelected: { borderColor: colors.primary },
  statusText: { ...typography.caption, fontFamily: fonts.semibold, color: colors.textMuted },
  statusTextSelected: { fontFamily: fonts.bold, color: colors.ink },
  statusCount: { fontSize: 12, fontFamily: fonts.bold, color: colors.textMuted },
  statusCountSelected: { color: colors.primary },
  filterScroll: { flexGrow: 0, flexShrink: 0 },
  filters: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
  },
  activeChip: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.base,
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.primarySoft,
  },
  activeChipText: { ...typography.caption, fontFamily: fonts.semibold, color: colors.primaryDark },
  clearButton: { minHeight: 44, justifyContent: 'center', paddingHorizontal: spacing.sm },
  clearText: { ...typography.caption, fontFamily: fonts.bold, color: colors.primary },
  sheetHeading: { ...typography.heading, color: colors.ink },
  sheetChoices: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  list: { gap: spacing.xs, paddingBottom: spacing.xl * 3 + spacing.lg },
  emptyList: { flexGrow: 1 },
})
