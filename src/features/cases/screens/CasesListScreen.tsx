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

import type { CasePriority, CaseRecord } from '../types'
import { groupCasesByDay } from '../caseDateGroups'
import { CaseCard } from '../components/CaseCard'
import { useCaseCounts, useCases } from '../useCases'
import { getPrimaryScopeOptions, type ScopeFilter } from '../caseListPresentation'
import {
  buildCaseSearchFilters,
  CLOSED_CASE_STATUSES,
  getCaseSegments,
  validateCreatedRange,
  type CaseListTab,
  type CaseSort,
  type QuickStatusFilter,
} from '../caseSearch'

type Props = NativeStackScreenProps<MainStackParamList, 'Cases'>

const STATUS_LABELS: Record<CaseListTab, string> = {
  abiertas: 'Abiertas',
  cerradas: 'Cerradas',
  todas: 'Todas',
}

const QUICK_LABELS: Record<QuickStatusFilter, string> = {
  por_aceptar: 'Por aceptar',
  sin_asignar: 'Sin asignar',
  en_ejecucion: 'En ejecución',
  en_espera: 'En espera',
  en_revision: 'En revisión',
}
const SORT_LABELS: Record<CaseSort, string> = {
  recientes: 'Más recientes',
  antiguas: 'Más antiguas',
  vencen_antes: 'Vencen antes',
  prioridad: 'Prioridad',
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
  const [fromDateDraft, setFromDateDraft] = useState('')
  const [toDateDraft, setToDateDraft] = useState('')
  const reduceMotion = useReducedMotion()
  const [filterNow, setFilterNow] = useState(() => Date.now())
  useEffect(() => {
    const interval = setInterval(() => setFilterNow(Date.now()), 60_000)
    return () => clearInterval(interval)
  }, [])
  const routeKey = JSON.stringify(route.params ?? {})
  const [selection, setSelection] = useState<{
    key: string
    status?: CaseListTab
    scope?: ScopeFilter
    quickStatus?: QuickStatusFilter | null
    exactStatus?: CaseRecord['status'] | null
    legacyStatuses?: CaseRecord['status'][] | null
    priorities?: CasePriority[]
    sinceDays?: number | null
    fromDate?: string | null
    toDate?: string | null
    overdueOnly?: boolean
    sort?: CaseSort
  } | null>(null)
  const routeFilters = selection?.key === routeKey ? selection : route.params
  const legacyStatus = route.params?.status
  const routeLegacyStatuses: CaseRecord['status'][] | null =
    legacyStatus === 'pendientes'
      ? ['solicitado', 'aceptado']
      : legacyStatus === 'en_curso'
        ? ['asignado', 'en_ejecucion', 'en_espera', 'reporte_enviado', 'validado']
        : null
  const initialTab: CaseListTab =
    legacyStatus === 'cerradas' ||
    (route.params?.exactStatus && CLOSED_CASE_STATUSES.includes(route.params.exactStatus))
      ? 'cerradas'
      : legacyStatus === 'pendientes' ||
          legacyStatus === 'en_curso' ||
          legacyStatus === 'abiertas' ||
          route.params?.activeOnly ||
          route.params?.scope === 'bandeja' ||
          route.params?.scope === 'por_aceptar' ||
          route.params?.scope === 'sin_asignar' ||
          Boolean(route.params?.exactStatus)
        ? 'abiertas'
        : 'todas'
  const status = selection?.key === routeKey ? (selection.status ?? initialTab) : initialTab
  const scope = routeFilters?.scope ?? null
  const exactStatus = routeFilters?.exactStatus ?? null
  const legacyStatuses =
    selection?.key === routeKey ? (selection.legacyStatuses ?? null) : routeLegacyStatuses
  const priority = route.params?.priority ?? null
  const priorities =
    selection?.key === routeKey
      ? (selection.priorities ?? (priority ? [priority] : []))
      : priority
        ? [priority]
        : []
  const sinceDays = routeFilters?.sinceDays ?? null
  const fromDate = selection?.key === routeKey ? (selection.fromDate ?? null) : null
  const toDate = selection?.key === routeKey ? (selection.toDate ?? null) : null
  const overdueOnly = selection?.key === routeKey ? (selection.overdueOnly ?? false) : false
  const sort = selection?.key === routeKey ? (selection.sort ?? 'recientes') : 'recientes'
  const routeQuickStatus: QuickStatusFilter | null =
    scope === 'por_aceptar' || (scope === 'bandeja' && exactStatus === 'solicitado')
      ? 'por_aceptar'
      : scope === 'sin_asignar' || (scope === 'bandeja' && exactStatus === 'aceptado')
        ? 'sin_asignar'
        : null
  const quickStatus =
    selection?.key === routeKey ? (selection.quickStatus ?? null) : routeQuickStatus
  const dateError = validateCreatedRange(fromDateDraft.trim() || null, toDateDraft.trim() || null)
  function changeFilters(patch: Partial<NonNullable<typeof selection>>) {
    setSelection({
      key: routeKey,
      status,
      scope: scope ?? undefined,
      quickStatus,
      exactStatus,
      legacyStatuses,
      priorities,
      sinceDays,
      fromDate,
      toDate,
      overdueOnly,
      sort,
      ...patch,
    })
  }
  const canCreate = hasPermission(profile?.role, 'cases.create') && Boolean(profile?.areaId)
  const canViewIndicators =
    profile?.role === 'administrador' ||
    profile?.role === 'jefe_area' ||
    profile?.role === 'auditor'
  const primaryScopes = profile
    ? getPrimaryScopeOptions(profile, home.data?.area_kind ?? null)
    : (['todas'] as const)
  const effectiveScope =
    scope === 'bandeja' || scope === 'por_aceptar' || scope === 'sin_asignar'
      ? primaryScopes[0]
      : (scope ?? primaryScopes[0])
  const selectedScope = effectiveScope
  const filterInput = {
    tab: status,
    scope: effectiveScope,
    quickStatus,
    exactStatus: quickStatus ? null : exactStatus,
    legacyStatuses,
    priorities,
    sinceDays,
    fromDate,
    toDate,
    overdueOnly,
    searchText: debouncedSearch,
    sort,
    now: filterNow,
  }
  const filters = buildCaseSearchFilters(filterInput)
  const countFilters = buildCaseSearchFilters({ ...filterInput, tab: 'todas' })
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
  const counts = useCaseCounts(countFilters, Boolean(profile?.organizationId))
  const filteredCases = data?.pages.flat() ?? []
  const firstEntryOrder = new Map(filteredCases.slice(0, 8).map((item, index) => [item.id, index]))
  useEffect(() => {
    if (!animateInitialList || isLoading || error || !filteredCases.length) return
    const timeout = setTimeout(() => setAnimateInitialList(false), 600)
    return () => clearTimeout(timeout)
  }, [animateInitialList, isLoading, error, filteredCases.length])
  const segmentCounts = counts.data ? getCaseSegments(counts.data) : null
  const segments = (Object.keys(STATUS_LABELS) as CaseListTab[]).map((value) => ({
    value,
    label: STATUS_LABELS[value],
    count: segmentCounts?.[value],
  }))
  const extraScope = scope && !primaryScopes.includes(scope) && !routeQuickStatus ? scope : null
  const chips = [
    ...(quickStatus ? [{ key: 'quickStatus', label: QUICK_LABELS[quickStatus] }] : []),
    ...(exactStatus && !quickStatus
      ? [{ key: 'exactStatus', label: statusMeta[exactStatus].label }]
      : []),
    ...(extraScope ? [{ key: 'scope', label: SCOPE_LABELS[extraScope] }] : []),
    ...(priorities.length
      ? [{ key: 'priorities', label: `Prioridad: ${priorities.join(', ')}` }]
      : []),
    ...(sinceDays ? [{ key: 'sinceDays', label: `Últimos ${sinceDays} días` }] : []),
    ...(fromDate || toDate
      ? [{ key: 'dates', label: `Creación: ${fromDate ?? '…'} a ${toDate ?? '…'}` }]
      : []),
    ...(overdueOnly ? [{ key: 'overdueOnly', label: 'Vencidas' }] : []),
    ...(sort !== 'recientes' ? [{ key: 'sort', label: SORT_LABELS[sort] }] : []),
  ] as const
  const hasFilters = Boolean(search || status !== 'todas' || chips.length || scope)
  function clearChips() {
    changeFilters({
      quickStatus: null,
      exactStatus: null,
      legacyStatuses: null,
      scope: extraScope ? primaryScopes[0] : effectiveScope,
      priorities: [],
      sinceDays: null,
      fromDate: null,
      toDate: null,
      overdueOnly: false,
      sort: 'recientes',
    })
  }
  function removeChip(key: (typeof chips)[number]['key']) {
    if (key === 'quickStatus')
      changeFilters({ quickStatus: null, scope: effectiveScope, exactStatus: null })
    if (key === 'exactStatus') changeFilters({ exactStatus: null })
    if (key === 'scope') changeFilters({ scope: primaryScopes[0] })
    if (key === 'priorities') changeFilters({ priorities: [] })
    if (key === 'sinceDays') changeFilters({ sinceDays: null })
    if (key === 'dates') changeFilters({ fromDate: null, toDate: null })
    if (key === 'overdueOnly') changeFilters({ overdueOnly: false })
    if (key === 'sort') changeFilters({ sort: 'recientes' })
  }

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.headingRow}>
          <Text accessibilityRole="header" style={styles.heading}>
            Solicitudes
          </Text>
          {canViewIndicators ? (
            <Pressable
              accessibilityLabel="Abrir Indicadores"
              accessibilityRole="button"
              onPress={() => navigation.navigate('Indicators')}
              style={styles.indicatorsButton}
            >
              <Text style={styles.indicatorsButtonText}>Indicadores</Text>
            </Pressable>
          ) : null}
        </View>
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
            onPress={() => {
              setFromDateDraft(fromDate ?? '')
              setToDateDraft(toDate ?? '')
              setFiltersOpen(true)
            }}
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
              onPress={() => changeFilters({ scope: value })}
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
              onPress={() => changeFilters({ status: segment.value, legacyStatuses: null })}
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
            sections={groupCasesByDay(filteredCases)}
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
                          status: 'todas',
                          scope: primaryScopes[0],
                          quickStatus: null,
                          exactStatus: null,
                          legacyStatuses: null,
                          priorities: [],
                          sinceDays: null,
                          fromDate: null,
                          toDate: null,
                          overdueOnly: false,
                          sort: 'recientes',
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
        title="Filtros"
        onClose={() => setFiltersOpen(false)}
        footerAction={{
          label: 'Ver solicitudes',
          onPress: () => {
            if (dateError) return
            changeFilters({
              fromDate: fromDateDraft.trim() || null,
              toDate: toDateDraft.trim() || null,
              sinceDays: fromDateDraft.trim() || toDateDraft.trim() ? null : sinceDays,
            })
            setFiltersOpen(false)
          },
        }}
      >
        <Text style={styles.sheetHeading}>Accesos rápidos</Text>
        <View style={styles.sheetChoices}>
          <Chip
            label="Vencidas"
            selected={overdueOnly}
            onPress={() => changeFilters({ overdueOnly: !overdueOnly, status: 'abiertas' })}
          />
          {(Object.keys(QUICK_LABELS) as QuickStatusFilter[]).map((value) => (
            <Chip
              key={value}
              label={QUICK_LABELS[value]}
              selected={quickStatus === value}
              onPress={() =>
                changeFilters({
                  quickStatus: quickStatus === value ? null : value,
                  exactStatus: null,
                  legacyStatuses: null,
                  scope: effectiveScope,
                  status: 'abiertas',
                })
              }
            />
          ))}
        </View>
        <Text style={styles.sheetHeading}>Prioridades</Text>
        <View style={styles.sheetChoices}>
          {(['alta', 'media', 'baja'] as CasePriority[]).map((value) => (
            <Chip
              key={value}
              label={value.charAt(0).toUpperCase() + value.slice(1)}
              selected={priorities.includes(value)}
              onPress={() =>
                changeFilters({
                  priorities: priorities.includes(value)
                    ? priorities.filter((priorityValue) => priorityValue !== value)
                    : [...priorities, value],
                })
              }
            />
          ))}
        </View>
        <Text style={styles.sheetHeading}>Fecha de creación</Text>
        <View style={styles.sheetChoices}>
          {[7, 30].map((days) => (
            <Chip
              key={days}
              label={`Últimos ${days} días`}
              selected={sinceDays === days}
              onPress={() => {
                setFromDateDraft('')
                setToDateDraft('')
                changeFilters({
                  sinceDays: sinceDays === days ? null : days,
                  fromDate: null,
                  toDate: null,
                })
              }}
            />
          ))}
        </View>
        <View style={styles.dateRow}>
          <TextInput
            accessibilityLabel="Fecha inicial de creación"
            keyboardType="numbers-and-punctuation"
            placeholder="Desde AAAA-MM-DD"
            placeholderTextColor={colors.textMuted}
            value={fromDateDraft}
            onChangeText={setFromDateDraft}
            style={styles.dateInput}
          />
          <TextInput
            accessibilityLabel="Fecha final de creación"
            keyboardType="numbers-and-punctuation"
            placeholder="Hasta AAAA-MM-DD"
            placeholderTextColor={colors.textMuted}
            value={toDateDraft}
            onChangeText={setToDateDraft}
            style={styles.dateInput}
          />
        </View>
        {dateError ? (
          <Text accessibilityRole="alert" style={styles.dateError}>
            {dateError}
          </Text>
        ) : null}
        <Text style={styles.sheetHeading}>Orden</Text>
        <View style={styles.sheetChoices}>
          {(Object.keys(SORT_LABELS) as CaseSort[]).map((value) => (
            <Chip
              key={value}
              label={SORT_LABELS[value]}
              selected={sort === value}
              onPress={() => changeFilters({ sort: value })}
            />
          ))}
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
  headingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  indicatorsButton: {
    minHeight: 44,
    minWidth: 44,
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  indicatorsButtonText: {
    ...typography.caption,
    fontFamily: fonts.bold,
    color: colors.primary,
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
  dateRow: { flexDirection: 'row', gap: spacing.sm },
  dateInput: {
    ...typography.body,
    color: colors.text,
    flex: 1,
    minHeight: 44,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
  },
  dateError: { ...typography.caption, color: colors.dangerText },
  list: { gap: spacing.xs, paddingBottom: spacing.xl * 3 + spacing.lg },
  emptyList: { flexGrow: 1 },
})
