import { useState } from 'react'
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'

import { Icon } from '@/components/ui/Icon'
import { ScreenContainer } from '@/components/ui/ScreenContainer'
import type { PlatformOrganizationRequest } from '@/features/auth/organizationRequestService'
import {
  useOrganizationCreationRequests,
  useReviewedOrganizationCreationRequests,
} from '@/features/auth/useOrganizationRequest'
import type { ProfileStackParamList } from '@/navigation/types'
import { colors, fonts, radius, spacing, typography } from '@/theme/tokens'
import {
  formatOrganizationRequestDate,
  organizationRequestStatusLabel,
  teamSizeLabel,
} from './organizationRequestPresentation'

type Props = NativeStackScreenProps<ProfileStackParamList, 'OrganizationRequests'>

export function OrganizationRequestsScreen({ navigation }: Props) {
  const [tab, setTab] = useState<'pending' | 'reviewed'>('pending')
  const pending = useOrganizationCreationRequests('pendiente')
  const reviewed = useReviewedOrganizationCreationRequests(tab === 'reviewed')
  const active = tab === 'pending' ? pending : reviewed
  const rows = active.data ?? []

  return (
    <ScreenContainer padded={false}>
      <View style={styles.tabs}>
        <Pressable
          accessibilityRole="tab"
          accessibilityState={{ selected: tab === 'pending' }}
          onPress={() => setTab('pending')}
          style={[styles.tab, tab === 'pending' && styles.tabSelected]}
        >
          <Text style={[styles.tabText, tab === 'pending' && styles.tabTextSelected]}>
            Pendientes ({pending.data?.length ?? 0})
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="tab"
          accessibilityState={{ selected: tab === 'reviewed' }}
          onPress={() => setTab('reviewed')}
          style={[styles.tab, tab === 'reviewed' && styles.tabSelected]}
        >
          <Text style={[styles.tabText, tab === 'reviewed' && styles.tabTextSelected]}>
            Revisadas
          </Text>
        </Pressable>
      </View>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={active.isRefetching}
            onRefresh={() =>
              void (tab === 'pending'
                ? pending.refetch()
                : Promise.all([pending.refetch(), reviewed.refetch()]))
            }
          />
        }
      >
        {active.isError ? (
          <Pressable accessibilityRole="button" onPress={() => void active.refetch()}>
            <Text style={styles.error}>No fue posible cargar las solicitudes. Reintentar</Text>
          </Pressable>
        ) : null}
        {!active.isLoading && !active.isError && rows.length === 0 ? (
          <View style={styles.empty}>
            <Icon name="business-outline" size={38} color={colors.textMuted} />
            <Text style={styles.emptyText}>
              {tab === 'pending'
                ? 'No hay solicitudes por revisar'
                : 'Aún no hay solicitudes revisadas'}
            </Text>
          </View>
        ) : null}
        {rows.map((row) => (
          <RequestRow
            key={row.id}
            request={row}
            onPress={() => navigation.navigate('OrganizationRequestDetail', { request: row })}
          />
        ))}
      </ScrollView>
    </ScreenContainer>
  )
}

function RequestRow({
  request,
  onPress,
}: {
  request: PlatformOrganizationRequest
  onPress: () => void
}) {
  const pending = request.status === 'pendiente'
  const tint =
    request.status === 'aprobada'
      ? colors.success
      : request.status === 'rechazada'
        ? colors.error
        : pending
          ? colors.primary
          : colors.textMuted
  const soft =
    request.status === 'aprobada'
      ? colors.successSoft
      : request.status === 'rechazada'
        ? colors.dangerSoft
        : pending
          ? colors.primarySoft
          : colors.surfaceMuted
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${request.organizationName}, ${request.requesterName}`}
      onPress={onPress}
      style={styles.row}
    >
      <View style={styles.icon}>
        <Icon name="business-outline" color={colors.primary} size={23} />
      </View>
      <View style={styles.rowBody}>
        <View style={styles.rowTitleLine}>
          <Text style={styles.rowTitle} numberOfLines={1}>
            {request.organizationName}
          </Text>
          <Text style={styles.date}>
            {formatOrganizationRequestDate(request.reviewedAt ?? request.createdAt, true)}
          </Text>
        </View>
        <Text style={styles.person} numberOfLines={1}>
          {request.requesterName} · {request.email}
        </Text>
        <View style={[styles.chip, { backgroundColor: soft }]}>
          <Text style={[styles.chipText, { color: tint }]}>
            {pending
              ? teamSizeLabel(request.teamSize)
              : organizationRequestStatusLabel(request.status)}
          </Text>
        </View>
      </View>
      <Icon name="chevron-forward" color={colors.textMuted} size={18} />
    </Pressable>
  )
}

const styles = StyleSheet.create({
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
    borderColor: colors.border,
  },
  tab: { flex: 1, minHeight: 52, alignItems: 'center', justifyContent: 'center' },
  tabSelected: { borderBottomWidth: 2, borderColor: colors.primary },
  tabText: { ...typography.body, color: colors.textMuted, fontFamily: fonts.semibold },
  tabTextSelected: { color: colors.primaryDark },
  content: { padding: spacing.lg, gap: spacing.md, flexGrow: 1 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: 94,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderColor: colors.border,
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowBody: { flex: 1, gap: spacing.xs },
  rowTitleLine: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  rowTitle: { ...typography.heading, color: colors.text, flex: 1 },
  date: { ...typography.caption, color: colors.textMuted },
  person: { ...typography.caption, color: colors.textMuted },
  chip: {
    alignSelf: 'flex-start',
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  chipText: { ...typography.caption, fontFamily: fonts.semibold },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  emptyText: { ...typography.body, color: colors.textMuted, textAlign: 'center' },
  error: { ...typography.body, color: colors.error },
})
