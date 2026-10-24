import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { useFocusEffect } from '@react-navigation/native'
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs'
import DateTimePicker from '@react-native-community/datetimepicker'
import { useCallback, useEffect, useRef, useState } from 'react'
import Animated, { FadeInDown, useReducedMotion } from 'react-native-reanimated'
import {
  SectionList,
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
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
import { TourTarget } from '@/features/help/tour/TourTarget'
import { useGuidedTour } from '@/features/help/tour/useGuidedTour'
import type { MainStackParamList, MainTabParamList } from '@/navigation/types'
import { useAuthStore } from '@/store/authStore'
import { statusMeta } from '@/theme/statusMeta'
import { colors, elevation, fonts, radius, spacing, tone, typography } from '@/theme/tokens'

import { CASE_STATUSES, type CasePriority, type CaseRecord } from '../types'
import { groupCasesByDay } from '../caseDateGroups'
import { CaseCard } from '../components/CaseCard'
import { useCaseCounts, useCases } from '../useCases'
import { useCasePullRefresh } from '../useCasePullRefresh'
import { useCaseListGuide } from '../useCaseListGuide'
import { getPrimaryScopeOptions, type ScopeFilter } from '../caseListPresentation'
import {
  buildCaseSearchFilters,
  CLOSED_CASE_STATUSES,
  getCaseSegments,
  getQuickFilterCounts,
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
  area_atiende: 'Mi área',
  area_envia: 'Enviadas',
  bandeja: 'Bandeja',
  por_aceptar: 'Por aceptar',
  sin_asignar: 'Sin asignar',
  en_curso: 'En curso',
}

const SHORT_MONTHS = [
  'ene',
  'feb',
  'mar',
  'abr',
  'may',
  'jun',
  'jul',
  'ago',
  'sep',
  'oct',
  'nov',
  'dic',
]

function calendarLabel(value: string, includeYear = false) {
  const [year, month, day] = value.split('-')
  return `${Number(day)} ${SHORT_MONTHS[Number(month) - 1]}${includeYear ? ` ${year}` : ''}`
}

function localDateValue(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function pickerDate(value: string) {
  if (!value) return new Date()
  const parsed = new Date(`${value}T12:00:00`)
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed
}

function dateChipLabel(from: string | null, to: string | null) {
  if (from && to) {
    const otherYear = from.slice(0, 4) !== to.slice(0, 4)
    return `Creadas: ${calendarLabel(from, otherYear)} – ${calendarLabel(to, otherYear)}`
  }
  if (from) return `Creadas: desde ${calendarLabel(from, true)}`
  return `Creadas: hasta ${calendarLabel(to ?? '', true)}`
}

export function CasesListScreen({ navigation, route }: Props) {
  const profile = useAuthStore((state) => state.profile)
  const caseGuide = useCaseListGuide(profile?.id)
  const markCaseGuideSeen = caseGuide.markSeen
  const tourActive = useGuidedTour((state) => state.active)
  const tourTarget = useGuidedTour((state) => state.target)
  const { height: windowHeight } = useWindowDimensions()
  const firstRowRef = useRef<View>(null)
  const [firstRowY, setFirstRowY] = useState<number | null>(null)
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
  const [customDate, setCustomDate] = useState(false)
  const [calendarField, setCalendarField] = useState<'from' | 'to' | null>(null)
  const [exactStatusOpen, setExactStatusOpen] = useState(false)
  const reduceMotion = useReducedMotion()
  const [filterNow, setFilterNow] = useState(() => Date.now())
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
    route.params?.statuses ??
    (legacyStatus === 'pendientes'
      ? ['solicitado', 'aceptado']
      : legacyStatus === 'en_curso'
        ? ['asignado', 'en_ejecucion', 'en_espera', 'reporte_enviado', 'validado']
        : null)
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
        : 'abiertas'
  const status = selection?.key === routeKey ? (selection.status ?? initialTab) : initialTab
  const scope = routeFilters?.scope ?? null
  const routeExactStatus = routeFilters?.exactStatus ?? null
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
  const focusedOnce = useRef(false)
  useFocusEffect(
    useCallback(() => {
      if (focusedOnce.current && sinceDays) setFilterNow(Date.now())
      focusedOnce.current = true
    }, [sinceDays]),
  )
  const fromDate = selection?.key === routeKey ? (selection.fromDate ?? null) : null
  const toDate = selection?.key === routeKey ? (selection.toDate ?? null) : null
  const rawOverdueOnly =
    selection?.key === routeKey
      ? (selection.overdueOnly ?? false)
      : (route.params?.overdueOnly ?? false)
  const sort = selection?.key === routeKey ? (selection.sort ?? 'recientes') : 'recientes'
  const routeQuickStatus: QuickStatusFilter | null =
    scope === 'por_aceptar' || (scope === 'bandeja' && routeExactStatus === 'solicitado')
      ? 'por_aceptar'
      : scope === 'sin_asignar' || (scope === 'bandeja' && routeExactStatus === 'aceptado')
        ? 'sin_asignar'
        : null
  const exactStatus =
    routeQuickStatus &&
    ((routeQuickStatus === 'por_aceptar' && routeExactStatus === 'solicitado') ||
      (routeQuickStatus === 'sin_asignar' && routeExactStatus === 'aceptado'))
      ? null
      : routeExactStatus
  const rawQuickStatus =
    selection?.key === routeKey
      ? (selection.quickStatus ?? null)
      : (route.params?.quick ?? routeQuickStatus)
  const quickStatus = status === 'cerradas' ? null : rawQuickStatus
  const overdueOnly = status === 'cerradas' ? false : rawOverdueOnly
  const dateError = customDate
    ? validateCreatedRange(fromDateDraft || null, toDateDraft || null)
    : null
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
  const extraScope = primaryScopes.includes(effectiveScope) ? null : effectiveScope
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
  // Una sola respuesta base permite contar cada chip como alternativa al activo.
  // Conserva alcance, búsqueda, prioridad, fecha y estado exacto.
  const countFilters = buildCaseSearchFilters({
    ...filterInput,
    tab: 'todas',
    quickStatus: null,
    overdueOnly: false,
    ...(filtersOpen && customDate && !dateError
      ? { fromDate: fromDateDraft || null, toDate: toDateDraft || null, sinceDays: null }
      : {}),
  })
  const {
    data,
    error,
    isLoading,
    isPlaceholderData,
    refetch,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
    isFetchNextPageError,
  } = useCases(filters, Boolean(profile?.organizationId))
  const requestNextPage = () => void fetchNextPage()
  const counts = useCaseCounts(countFilters, Boolean(profile?.organizationId))
  const { refreshing: pullRefreshing, refresh: refreshList } = useCasePullRefresh(
    refetch,
    counts.refetch,
    () => {
      if (sinceDays) setFilterNow(Date.now())
    },
  )
  const showingPreviousFilters = isPlaceholderData || counts.isPlaceholderData
  const filteredCases = data?.pages.flat() ?? []
  const firstCase = filteredCases[0]
  const showGuide =
    caseGuide.show &&
    !tourActive &&
    Boolean(firstCase) &&
    firstRowY !== null &&
    !isLoading &&
    !error
  useEffect(() => {
    if (tourActive && tourTarget?.startsWith('cases-')) void markCaseGuideSeen()
  }, [tourActive, tourTarget, markCaseGuideSeen])
  function openCaseGuide() {
    void caseGuide.markSeen()
    navigation.getParent<BottomTabNavigationProp<MainTabParamList>>()?.navigate('Help', {
      section: 'case-card',
    })
  }
  const firstEntryOrder = new Map(filteredCases.slice(0, 8).map((item, index) => [item.id, index]))
  useEffect(() => {
    if (!animateInitialList || isLoading || error || !filteredCases.length) return
    const timeout = setTimeout(() => setAnimateInitialList(false), 600)
    return () => clearTimeout(timeout)
  }, [animateInitialList, isLoading, error, filteredCases.length])
  const segmentCounts = counts.data ? getCaseSegments(counts.data, quickStatus, overdueOnly) : null
  const quickCounts = counts.data ? getQuickFilterCounts(counts.data) : null
  const segments = (Object.keys(STATUS_LABELS) as CaseListTab[]).map((value) => ({
    value,
    label: STATUS_LABELS[value],
    count: segmentCounts?.[value],
  }))
  const quickChips = [
    { key: 'vencidas', label: 'Vencidas', count: quickCounts?.vencidas },
    ...(Object.keys(QUICK_LABELS) as QuickStatusFilter[]).map((key) => ({
      key,
      label: QUICK_LABELS[key],
      count: quickCounts?.[key],
    })),
  ] as const
  const chips = [
    ...(extraScope
      ? [
          {
            key: 'scope',
            label: `Alcance: ${extraScope === 'mi_area' && profile?.role === 'jefe_area' && home.data?.area_kind === 'tecnica' ? 'Mi área y enviadas' : SCOPE_LABELS[extraScope]}`,
          },
        ]
      : []),
    ...(exactStatus ? [{ key: 'exactStatus', label: statusMeta[exactStatus].label }] : []),
    ...(priorities.length
      ? [{ key: 'priorities', label: `Prioridad: ${priorities.join(', ')}` }]
      : []),
    ...(sinceDays ? [{ key: 'sinceDays', label: `Creadas: últimos ${sinceDays} días` }] : []),
    ...(fromDate || toDate ? [{ key: 'dates', label: dateChipLabel(fromDate, toDate) }] : []),
    ...(sort !== 'recientes' ? [{ key: 'sort', label: SORT_LABELS[sort] }] : []),
  ] as const
  const activeFilterCount = chips.length + Number(Boolean(quickStatus)) + Number(overdueOnly)
  const hasFilters = Boolean(search || status !== 'abiertas' || activeFilterCount)
  function clearAllFilters() {
    setSearch('')
    setFromDateDraft('')
    setToDateDraft('')
    setCustomDate(false)
    setCalendarField(null)
    changeFilters({
      status: 'abiertas',
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
    if (key === 'scope') changeFilters({ scope: primaryScopes[0] })
    if (key === 'exactStatus') changeFilters({ exactStatus: null })
    if (key === 'priorities') changeFilters({ priorities: [] })
    if (key === 'sinceDays') changeFilters({ sinceDays: null })
    if (key === 'dates') changeFilters({ fromDate: null, toDate: null })
    if (key === 'sort') changeFilters({ sort: 'recientes' })
  }
  function toggleQuickFilter(value: QuickStatusFilter | 'vencidas') {
    if (value === 'vencidas') {
      changeFilters({
        overdueOnly: !overdueOnly,
        quickStatus: null,
        exactStatus: null,
        legacyStatuses: null,
        scope: effectiveScope,
        status: 'abiertas',
      })
      return
    }
    changeFilters({
      quickStatus: quickStatus === value ? null : value,
      overdueOnly: false,
      exactStatus: null,
      legacyStatuses: null,
      scope: effectiveScope,
      status: 'abiertas',
    })
  }

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.headingRow}>
          <Text accessibilityRole="header" style={styles.heading}>
            Solicitudes
          </Text>
          {canViewIndicators ? (
            <TourTarget id="cases-indicators">
              <Pressable
                accessibilityLabel="Abrir Indicadores"
                accessibilityRole="button"
                onPress={() => navigation.navigate('Indicators')}
                style={styles.indicatorsButton}
              >
                <Text style={styles.indicatorsButtonText}>Indicadores</Text>
              </Pressable>
            </TourTarget>
          ) : null}
        </View>
        <OfflineBanner message="Sin conexión · Mostrando lo último que se cargó." />
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
            accessibilityLabel={`Más filtros, ${activeFilterCount} ${activeFilterCount === 1 ? 'activo' : 'activos'}`}
            accessibilityRole="button"
            onPress={() => {
              setFromDateDraft(fromDate ?? '')
              setToDateDraft(toDate ?? '')
              setCustomDate(Boolean(fromDate || toDate))
              setCalendarField(null)
              setExactStatusOpen(false)
              setFiltersOpen(true)
            }}
            style={styles.filterButton}
          >
            <Icon name="options-outline" size={20} color={colors.text} />
            {activeFilterCount ? (
              <View style={styles.filterBadge}>
                <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
              </View>
            ) : null}
          </Pressable>
        </View>

        {primaryScopes.length > 1 ? (
          <TourTarget id="cases-scope">
            <View accessibilityLabel="Alcance" style={styles.scopeSelector}>
              {primaryScopes.map((value) => (
                <Pressable
                  key={value}
                  accessibilityLabel={SCOPE_LABELS[value]}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: selectedScope === value }}
                  hitSlop={4}
                  onPress={() => changeFilters({ scope: value })}
                  style={[styles.scopeTab, selectedScope === value && styles.scopeTabSelected]}
                >
                  <Text
                    style={[styles.scopeText, selectedScope === value && styles.scopeTextSelected]}
                  >
                    {SCOPE_LABELS[value]}
                  </Text>
                </Pressable>
              ))}
            </View>
          </TourTarget>
        ) : null}

        <View accessibilityLabel="Estado" style={styles.statusTabs}>
          {segments.map((segment) => (
            <Pressable
              key={segment.value}
              accessibilityLabel={`${segment.label}, ${segment.count ?? 'cargando'} solicitudes`}
              accessibilityRole="tab"
              accessibilityState={{ selected: status === segment.value }}
              onPress={() =>
                changeFilters({
                  status: segment.value,
                  legacyStatuses: null,
                  ...(segment.value === 'cerradas'
                    ? { quickStatus: null, overdueOnly: false }
                    : {}),
                })
              }
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
        {status !== 'cerradas' ? (
          <ScrollView
            accessibilityLabel="Filtros rápidos"
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.quickFilterScroll}
            contentContainerStyle={styles.quickFilters}
          >
            {quickChips.map((chip) => {
              const selected = chip.key === 'vencidas' ? overdueOnly : quickStatus === chip.key
              const overdue = chip.key === 'vencidas'
              return (
                <Pressable
                  key={chip.key}
                  accessibilityLabel={`${chip.label}, ${chip.count ?? 'cargando'} ${chip.count === 1 ? 'solicitud' : 'solicitudes'}`}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  hitSlop={4}
                  onPress={() => toggleQuickFilter(chip.key)}
                  style={[
                    styles.quickChip,
                    overdue && styles.quickChipOverdue,
                    selected &&
                      (overdue ? styles.quickChipOverdueSelected : styles.quickChipSelected),
                  ]}
                >
                  <Text
                    style={[
                      styles.quickChipText,
                      overdue && styles.quickChipOverdueText,
                      selected && styles.quickChipSelectedText,
                    ]}
                  >
                    {chip.label}
                  </Text>
                  <Text
                    style={[
                      styles.quickChipCount,
                      overdue && styles.quickChipOverdueText,
                      selected && styles.quickChipSelectedText,
                    ]}
                  >
                    {chip.count ?? '…'}
                  </Text>
                </Pressable>
              )
            })}
          </ScrollView>
        ) : null}
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
                hitSlop={4}
                onPress={() => removeChip(chip.key)}
                style={styles.activeChip}
              >
                <Text style={styles.activeChipText}>{chip.label}</Text>
                <Icon name="close" size={14} color={colors.primaryDark} />
              </Pressable>
            ))}
          </ScrollView>
        ) : null}
        {activeFilterCount ? (
          <View style={styles.filterSummary}>
            <Text style={styles.filterSummaryText}>
              {segmentCounts?.[status] ?? '…'} solicitudes
            </Text>
            <Pressable
              accessibilityLabel="Limpiar todo"
              accessibilityRole="button"
              onPress={clearAllFilters}
              style={styles.clearButton}
            >
              <Text style={styles.clearText}>Limpiar todo</Text>
            </Pressable>
          </View>
        ) : null}

        {showingPreviousFilters ? (
          <View accessibilityRole="progressbar" style={styles.updatingNotice}>
            <ActivityIndicator color={colors.primary} size="small" />
            <Text style={styles.updatingText}>Actualizando solicitudes…</Text>
          </View>
        ) : null}
        {error && data ? (
          <View accessibilityRole="alert" style={styles.refreshError}>
            <Text style={styles.refreshErrorText}>No se pudo actualizar.</Text>
            <Button label="Reintentar" variant="text" onPress={() => void refetch()} />
          </View>
        ) : null}
        {isLoading && !data ? (
          <SkeletonList />
        ) : error && !data ? (
          <EmptyState
            title="No fue posible cargar las solicitudes"
            message="Comprueba tu conexión e inténtalo de nuevo."
            variant="noResults"
            action="Reintentar"
            onAction={() => void refetch()}
          />
        ) : (
          <SectionList
            style={showingPreviousFilters ? styles.updatingList : undefined}
            contentContainerStyle={filteredCases.length ? styles.list : styles.emptyList}
            sections={
              sort === 'recientes' || sort === 'antiguas'
                ? groupCasesByDay(filteredCases)
                : [{ title: '', data: filteredCases }]
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
            renderSectionHeader={({ section }) =>
              section.title ? <Text style={styles.sectionTitle}>{section.title}</Text> : null
            }
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
                onRefresh={() => void refreshList()}
                refreshing={pullRefreshing}
                tintColor={colors.primary}
              />
            }
            renderItem={({ item }) => {
              const order = firstEntryOrder.get(item.id)
              return (
                <Animated.View
                  testID={item.id === firstCase?.id ? 'first-case-row' : undefined}
                  ref={item.id === firstCase?.id ? firstRowRef : undefined}
                  onLayout={
                    item.id === firstCase?.id
                      ? (event) => {
                          setFirstRowY(event.nativeEvent.layout.y + 160)
                          firstRowRef.current?.measureInWindow((_x, y) => setFirstRowY(y))
                        }
                      : undefined
                  }
                  entering={
                    animateInitialList && !reduceMotion && !caseGuide.show && order !== undefined
                      ? FadeInDown.duration(220).delay(order * 40)
                      : undefined
                  }
                >
                  {item.id === firstCase?.id ? (
                    <TourTarget id="cases-first-card">
                      <CaseCard
                        item={item}
                        onPress={() => navigation.navigate('CaseDetail', { caseId: item.id })}
                      />
                    </TourTarget>
                  ) : (
                    <CaseCard
                      item={item}
                      onPress={() => navigation.navigate('CaseDetail', { caseId: item.id })}
                    />
                  )}
                </Animated.View>
              )
            }}
          />
        )}
      </View>
      <Modal
        animationType={reduceMotion ? 'none' : 'fade'}
        onRequestClose={() => void caseGuide.markSeen()}
        transparent
        visible={showGuide}
      >
        <View style={styles.guideOverlay}>
          <View style={styles.guideBackdrop} />
          {firstCase ? (
            <View
              style={[
                styles.guideHighlight,
                {
                  top: Math.max(80, Math.min(firstRowY ?? 180, windowHeight - 390)),
                },
              ]}
              pointerEvents="none"
            >
              <CaseCard item={firstCase} />
            </View>
          ) : null}
          <View style={styles.guideSheet}>
            <Text accessibilityRole="header" style={styles.guideTitle}>
              Así se lee cada solicitud
            </Text>
            <Text style={styles.guideText}>
              La etiqueta dice en qué va. La barra muestra cuántos de los 5 pasos lleva, y a la
              derecha está quién la atiende.
            </Text>
            <Text style={styles.guideText}>«Vencida» aparece en rojo cuando se pasó el plazo.</Text>
            <View style={styles.guideActions}>
              <Pressable
                accessibilityRole="button"
                onPress={openCaseGuide}
                style={styles.guideAction}
              >
                <Text style={styles.guideLink}>Ver guía</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={() => void caseGuide.markSeen()}
                style={[styles.guideAction, styles.guideDone]}
              >
                <Text style={styles.guideDoneText}>Entendido</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
      <BottomSheet
        visible={filtersOpen}
        title="Filtros"
        onClose={() => setFiltersOpen(false)}
        footerAction={{
          label: `Ver ${segmentCounts?.[status] ?? '…'} solicitudes`,
          disabled: Boolean(dateError),
          onPress: () => {
            if (dateError) return
            if (customDate)
              changeFilters({
                fromDate: fromDateDraft || null,
                toDate: toDateDraft || null,
                sinceDays: null,
              })
            setFiltersOpen(false)
          },
        }}
        footerSecondaryAction={{ label: 'Limpiar', onPress: clearAllFilters }}
      >
        <Text style={styles.sheetHeading}>Ordenar por</Text>
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
        <Text style={styles.sheetHeading}>Fecha de creación</Text>
        <View style={styles.sheetChoices}>
          <Chip
            label="Cualquiera"
            selected={!customDate && !sinceDays}
            onPress={() => {
              setCustomDate(false)
              setFromDateDraft('')
              setToDateDraft('')
              changeFilters({ sinceDays: null, fromDate: null, toDate: null })
            }}
          />
          {[7, 30].map((days) => (
            <Chip
              key={days}
              label={`${days} días`}
              selected={!customDate && sinceDays === days}
              onPress={() => {
                setCustomDate(false)
                setFromDateDraft('')
                setToDateDraft('')
                changeFilters({ sinceDays: days, fromDate: null, toDate: null })
              }}
            />
          ))}
          <Chip
            label="Personalizado"
            selected={customDate}
            onPress={() => {
              setCustomDate(true)
              changeFilters({ sinceDays: null, fromDate: null, toDate: null })
            }}
          />
        </View>
        {customDate ? (
          <View style={styles.dateRow}>
            <Pressable
              accessibilityLabel={`Desde, ${fromDateDraft ? calendarLabel(fromDateDraft, true) : 'elegir fecha'}`}
              accessibilityRole="button"
              onPress={() => setCalendarField('from')}
              style={styles.dateButton}
            >
              <Icon name="calendar-outline" size="inline" color={colors.primary} />
              <View>
                <Text style={styles.dateCaption}>Desde</Text>
                <Text style={styles.dateValue}>
                  {fromDateDraft ? calendarLabel(fromDateDraft, true) : 'Elegir fecha'}
                </Text>
              </View>
            </Pressable>
            <Pressable
              accessibilityLabel={`Hasta, ${toDateDraft ? calendarLabel(toDateDraft, true) : 'elegir fecha'}`}
              accessibilityRole="button"
              onPress={() => setCalendarField('to')}
              style={styles.dateButton}
            >
              <Icon name="calendar-outline" size="inline" color={colors.primary} />
              <View>
                <Text style={styles.dateCaption}>Hasta</Text>
                <Text style={styles.dateValue}>
                  {toDateDraft ? calendarLabel(toDateDraft, true) : 'Elegir fecha'}
                </Text>
              </View>
            </Pressable>
          </View>
        ) : null}
        {calendarField ? (
          <DateTimePicker
            testID="calendar-picker"
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            value={pickerDate(calendarField === 'from' ? fromDateDraft : toDateDraft)}
            onChange={(event, date) => {
              if (event.type === 'set' && date) {
                const value = localDateValue(date)
                if (calendarField === 'from') setFromDateDraft(value)
                else setToDateDraft(value)
              }
              if (Platform.OS !== 'ios') setCalendarField(null)
            }}
          />
        ) : null}
        {calendarField && Platform.OS === 'ios' ? (
          <Pressable
            accessibilityLabel="Listo"
            accessibilityRole="button"
            onPress={() => setCalendarField(null)}
            style={styles.calendarDone}
          >
            <Text style={styles.calendarDoneText}>Listo</Text>
          </Pressable>
        ) : null}
        {dateError ? (
          <Text accessibilityRole="alert" style={styles.dateError}>
            {dateError}
          </Text>
        ) : null}
        <Text style={styles.sheetHeading}>Prioridad</Text>
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
        <Pressable
          accessibilityLabel={`Estado exacto, ${exactStatus ? statusMeta[exactStatus].label : 'Todos'}`}
          accessibilityRole="button"
          accessibilityState={{ expanded: exactStatusOpen }}
          onPress={() => setExactStatusOpen((open) => !open)}
          style={styles.exactStatusToggle}
        >
          <Text style={styles.exactStatusTitle}>Estado exacto</Text>
          <Text style={styles.exactStatusValue}>
            {exactStatus ? statusMeta[exactStatus].label : 'Todos'} ›
          </Text>
        </Pressable>
        {exactStatusOpen ? (
          <View style={styles.sheetChoices}>
            <Chip
              label="Todos los estados"
              selected={!exactStatus}
              onPress={() => changeFilters({ exactStatus: null, legacyStatuses: null })}
            />
            {CASE_STATUSES.map((value) => (
              <Chip
                key={value}
                label={statusMeta[value].label}
                selected={exactStatus === value}
                onPress={() =>
                  changeFilters({
                    exactStatus: exactStatus === value ? null : value,
                    quickStatus: null,
                    overdueOnly: false,
                    legacyStatuses: null,
                    status: CLOSED_CASE_STATUSES.includes(value) ? 'cerradas' : 'abiertas',
                  })
                }
              />
            ))}
          </View>
        ) : null}
      </BottomSheet>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.surfaceMuted },
  container: {
    flex: 1,
    backgroundColor: colors.surfaceMuted,
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
    backgroundColor: colors.surfaceMuted,
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
  filterBadgeText: { fontSize: 12, lineHeight: 16, fontFamily: fonts.bold, color: colors.white },
  scopeSelector: {
    minHeight: 40,
    flexDirection: 'row',
    padding: 2,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceMuted,
  },
  scopeTab: {
    flex: 1,
    minHeight: 36,
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
  quickFilterScroll: { flexGrow: 0, flexShrink: 0 },
  quickFilters: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  quickChip: {
    minHeight: 36,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.base,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceMuted,
  },
  quickChipSelected: { backgroundColor: colors.primary },
  quickChipOverdue: { backgroundColor: tone.danger.bg },
  quickChipOverdueSelected: { backgroundColor: colors.error },
  quickChipText: { ...typography.caption, fontFamily: fonts.semibold, color: colors.text },
  quickChipCount: { fontSize: 12, fontFamily: fonts.bold, color: colors.textMuted },
  quickChipOverdueText: { color: tone.danger.text },
  quickChipSelectedText: { color: colors.white },
  filterScroll: { flexGrow: 0, flexShrink: 0 },
  filters: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
  },
  filterSummary: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  filterSummaryText: { ...typography.caption, color: colors.textMuted },
  activeChip: {
    minHeight: 36,
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
  sheetHeading: { ...typography.caption, fontFamily: fonts.bold, color: colors.textMuted },
  sheetChoices: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  dateRow: { flexDirection: 'row', gap: spacing.sm },
  dateButton: {
    flex: 1,
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
  },
  dateCaption: { ...typography.caption, color: colors.textMuted },
  dateValue: { ...typography.body, color: colors.text },
  calendarDone: { minHeight: 44, alignSelf: 'flex-end', justifyContent: 'center' },
  calendarDoneText: { ...typography.body, fontFamily: fonts.semibold, color: colors.primary },
  dateError: { ...typography.caption, color: colors.dangerText },
  exactStatusToggle: {
    minHeight: 48,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderColor: colors.border,
  },
  exactStatusTitle: { ...typography.body, fontFamily: fonts.semibold, color: colors.ink },
  exactStatusValue: { ...typography.caption, color: colors.textMuted },
  list: { gap: spacing.xs, paddingBottom: spacing.xl * 3 + spacing.lg },
  emptyList: { flexGrow: 1 },
  updatingNotice: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  updatingText: { ...typography.caption, color: colors.textMuted },
  updatingList: { opacity: 0.6 },
  refreshError: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: radius.sm,
    backgroundColor: tone.danger.bg,
    paddingHorizontal: spacing.sm,
  },
  refreshErrorText: { ...typography.caption, color: tone.danger.text },
  guideOverlay: { flex: 1, justifyContent: 'flex-end' },
  guideBackdrop: { ...StyleSheet.absoluteFill, backgroundColor: colors.modalBackdrop },
  guideHighlight: {
    position: 'absolute',
    left: spacing.compact,
    right: spacing.compact,
    borderRadius: radius.xl,
    overflow: 'hidden',
  },
  guideSheet: {
    margin: spacing.compact,
    padding: spacing.compact,
    gap: spacing.base,
    borderRadius: radius.xl,
    backgroundColor: colors.surface,
  },
  guideTitle: { ...typography.heading, fontFamily: fonts.bold, color: colors.ink },
  guideText: { ...typography.body, color: colors.textMuted },
  guideActions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  guideAction: {
    minHeight: 44,
    minWidth: 44,
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  guideLink: { ...typography.body, fontFamily: fonts.bold, color: colors.primary },
  guideDone: { borderRadius: radius.pill, backgroundColor: colors.primary },
  guideDoneText: { ...typography.body, fontFamily: fonts.bold, color: colors.white },
})
