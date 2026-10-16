import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { useLayoutEffect, useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'

import { EmptyState } from '@/components/feedback/EmptyState'
import { RequestState } from '@/components/feedback/RequestState'
import { Icon } from '@/components/ui/Icon'
import { ScreenContainer } from '@/components/ui/ScreenContainer'
import type { MainStackParamList } from '@/navigation/types'
import { colors, fonts, radius, spacing, typography } from '@/theme/tokens'
import {
  filterNotifications,
  groupNotifications,
  notificationAppearance,
  notificationTimeLabel,
  type NotificationFilter,
} from './notificationPresentation'
import { useMarkNotificationsRead, useNotifications } from './useNotifications'

type Props = NativeStackScreenProps<MainStackParamList, 'Notifications'>

export function NotificationsScreen({ navigation }: Props) {
  const notifications = useNotifications()
  const { mutate: markRead, isPending: markPending } = useMarkNotificationsRead()
  const [filter, setFilter] = useState<NotificationFilter>('all')
  const [now] = useState(() => new Date())
  const allItems = notifications.data ?? []
  const unreadCount = allItems.filter((item) => !item.readAt).length
  const visibleItems = filterNotifications(allItems, filter)
  const groups = groupNotifications(visibleItems, now)

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () =>
        unreadCount > 0 ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Leer todo"
            accessibilityState={{ disabled: markPending }}
            disabled={markPending}
            onPress={() => markRead(null)}
            style={styles.headerAction}
          >
            <Text style={styles.headerActionText}>Leer todo</Text>
          </Pressable>
        ) : null,
    })
  }, [navigation, unreadCount, markPending, markRead])

  return (
    <ScreenContainer padded={false} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View accessibilityRole="tablist" style={styles.filters}>
          <Pressable
            accessibilityRole="tab"
            accessibilityLabel="Todos"
            accessibilityState={{ selected: filter === 'all' }}
            onPress={() => setFilter('all')}
            style={[styles.filter, filter === 'all' && styles.filterSelected]}
          >
            <Text style={[styles.filterText, filter === 'all' && styles.filterTextSelected]}>
              Todos
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="tab"
            accessibilityLabel={`Sin leer, ${unreadCount}`}
            accessibilityState={{ selected: filter === 'unread' }}
            onPress={() => setFilter('unread')}
            style={[styles.filter, filter === 'unread' && styles.filterSelected]}
          >
            <Text style={[styles.filterText, filter === 'unread' && styles.filterTextSelected]}>
              Sin leer ({unreadCount})
            </Text>
          </Pressable>
        </View>
        {notifications.isLoading ? <RequestState kind="loading" title="Cargando avisos…" /> : null}
        {notifications.isError ? (
          <RequestState
            kind="error"
            title="No fue posible cargar los avisos"
            onRetry={() => void notifications.refetch()}
          />
        ) : null}
        {!notifications.isLoading && !notifications.isError && visibleItems.length === 0 ? (
          <EmptyState
            variant="allDone"
            title={filter === 'unread' ? 'Estás al día' : 'No tienes avisos por ahora'}
            message={
              filter === 'unread'
                ? 'Todos tus avisos están leídos.'
                : 'Aquí aparecerán las novedades de tus solicitudes.'
            }
          />
        ) : null}
        {groups.map((group) => (
          <View key={group.title} style={styles.group}>
            <Text accessibilityRole="header" style={styles.groupTitle}>
              {group.title}
            </Text>
            <View style={styles.groupCard}>
              {group.items.map((item, index) => {
                const appearance = notificationAppearance(item.action)
                const unread = !item.readAt
                const caseLabel =
                  item.caseNumber && item.caseTitle
                    ? `${item.caseNumber} · ${item.caseTitle}`
                    : item.body
                return (
                  <Pressable
                    key={item.id}
                    accessibilityRole="button"
                    accessibilityLabel={`${unread ? 'Sin leer. ' : ''}${item.title}. ${caseLabel}${item.actorName ? `. por ${item.actorName}` : ''}`}
                    onPress={() => {
                      if (unread) markRead([item.id])
                      navigation.navigate('CaseDetail', { caseId: item.caseId })
                    }}
                    style={[
                      styles.row,
                      unread && styles.unreadRow,
                      index < group.items.length - 1 && styles.rowDivider,
                    ]}
                  >
                    <View style={[styles.iconBox, { backgroundColor: appearance.background }]}>
                      <Icon name={appearance.icon} size={20} color={appearance.foreground} />
                    </View>
                    <View style={styles.rowBody}>
                      <View style={styles.rowTop}>
                        <Text
                          numberOfLines={2}
                          style={[styles.itemTitle, unread && styles.unreadTitle]}
                        >
                          {item.title}
                        </Text>
                        <Text style={styles.time}>
                          {notificationTimeLabel(item.createdAt, now)}
                        </Text>
                      </View>
                      <Text numberOfLines={2} style={styles.caseLabel}>
                        {caseLabel}
                      </Text>
                      {item.actorName ? (
                        <Text numberOfLines={1} style={styles.actor}>
                          por {item.actorName}
                        </Text>
                      ) : null}
                    </View>
                    {unread ? <View style={styles.unreadDot} /> : null}
                  </Pressable>
                )
              })}
            </View>
          </View>
        ))}
      </ScrollView>
    </ScreenContainer>
  )
}

const styles = StyleSheet.create({
  content: { gap: spacing.lg, paddingHorizontal: spacing.md, paddingVertical: spacing.lg },
  headerAction: { minHeight: 44, justifyContent: 'center', paddingHorizontal: spacing.sm },
  headerActionText: { ...typography.caption, color: colors.primary, fontFamily: fonts.bold },
  filters: {
    flexDirection: 'row',
    backgroundColor: colors.neutralSoft,
    borderRadius: radius.md,
    padding: spacing.xs,
  },
  filter: {
    flex: 1,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.sm,
  },
  filterSelected: { backgroundColor: colors.surface },
  filterText: { ...typography.caption, color: colors.textMuted },
  filterTextSelected: { color: colors.primary, fontFamily: fonts.bold },
  group: { gap: spacing.sm },
  groupTitle: { ...typography.caption, fontFamily: fonts.bold, color: colors.textMuted },
  groupCard: {
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderColor: colors.cardBorder,
    borderWidth: 1,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    gap: spacing.base,
    minHeight: 80,
    padding: spacing.base,
    alignItems: 'flex-start',
  },
  unreadRow: { backgroundColor: colors.primarySoft },
  rowDivider: { borderBottomColor: colors.cardBorder, borderBottomWidth: 1 },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowBody: { flex: 1, gap: spacing.xs },
  rowTop: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  itemTitle: { ...typography.caption, color: colors.text, flex: 1 },
  unreadTitle: { fontFamily: fonts.bold },
  time: { ...typography.caption, color: colors.textMuted, fontSize: 11 },
  caseLabel: { ...typography.caption, color: colors.textMuted },
  actor: { ...typography.caption, color: colors.textMuted, fontSize: 11 },
  unreadDot: {
    width: 7,
    height: 7,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    marginTop: spacing.xs,
  },
})
