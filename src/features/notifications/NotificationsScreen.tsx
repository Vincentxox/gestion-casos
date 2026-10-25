import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'

import { ActionSheet } from '@/components/actions/ActionSheet'
import { EmptyState } from '@/components/feedback/EmptyState'
import { RequestState } from '@/components/feedback/RequestState'
import { UndoSnackbar } from '@/components/feedback/UndoSnackbar'
import { useFeedback } from '@/components/feedback/AppFeedback'
import { Icon } from '@/components/ui/Icon'
import { ScreenContainer } from '@/components/ui/ScreenContainer'
import type { MainStackParamList } from '@/navigation/types'
import { colors, fonts, radius, spacing, typography } from '@/theme/tokens'
import {
  filterNotifications,
  groupNotifications,
  type NotificationFilter,
} from './notificationPresentation'
import { NotificationRow } from './NotificationRow'
import {
  useDismissNotifications,
  useMarkNotificationsRead,
  useNotifications,
  useReadNotificationIds,
  useRestoreNotifications,
} from './useNotifications'

type Props = NativeStackScreenProps<MainStackParamList, 'Notifications'>

export function NotificationsScreen({ navigation }: Props) {
  const notifications = useNotifications()
  const readIdsQuery = useReadNotificationIds()
  const { mutate: markRead, isPending: markPending } = useMarkNotificationsRead()
  const dismiss = useDismissNotifications()
  const restore = useRestoreNotifications()
  const feedback = useFeedback()
  const [filter, setFilter] = useState<NotificationFilter>('all')
  const [menuOpen, setMenuOpen] = useState(false)
  const [undoIds, setUndoIds] = useState<number[]>([])
  const undoTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [now] = useState(() => new Date())
  const allItems = notifications.data ?? []
  const unreadCount = allItems.filter((item) => !item.readAt).length
  const readCount = readIdsQuery.data?.length ?? allItems.filter((item) => item.readAt).length
  const visibleItems = filterNotifications(allItems, filter)
  const groups = groupNotifications(visibleItems, now)

  useEffect(
    () => () => {
      if (undoTimer.current) clearTimeout(undoTimer.current)
    },
    [],
  )

  const offerUndo = (ids: number[]) => {
    if (undoTimer.current) clearTimeout(undoTimer.current)
    setUndoIds((previous) => [...new Set([...previous, ...ids])])
    undoTimer.current = setTimeout(() => setUndoIds([]), 5000)
  }

  const deleteOne = async (id: number) => {
    try {
      if ((await dismiss.mutateAsync([id])) > 0) {
        offerUndo([id])
        return true
      }
    } catch {
      /* The hook restores the cache and displays the error. */
    }
    return false
  }

  const deleteRead = async () => {
    const result = await readIdsQuery.refetch()
    const ids = result.data
    if (result.isError || !ids) {
      await feedback.alert({
        title: 'No fue posible consultar los avisos',
        message: 'Comprueba tu conexión e inténtalo de nuevo.',
        tone: 'error',
      })
      return
    }
    if (!ids.length) return
    const confirmed = await feedback.confirm({
      tone: 'danger',
      icon: 'trash-outline',
      title: '¿Borrar los avisos leídos?',
      message: `Se quitan ${ids.length} avisos de esta lista. Las solicitudes y su historial no cambian.`,
      confirmLabel: 'Borrar',
    })
    if (!confirmed) return
    try {
      // Exact IDs keep Undo complete even if a new read notice arrives during confirmation.
      if ((await dismiss.mutateAsync(ids)) > 0) offerUndo(ids)
    } catch {
      /* The hook restores the cache and displays the error. */
    }
  }

  const undo = () => {
    const ids = undoIds
    if (undoTimer.current) clearTimeout(undoTimer.current)
    setUndoIds([])
    restore.mutate(ids)
  }

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () =>
        unreadCount > 0 || readCount > 0 ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Más opciones"
            accessibilityState={{ disabled: markPending || dismiss.isPending }}
            disabled={markPending || dismiss.isPending}
            onPress={() => setMenuOpen(true)}
            style={styles.headerAction}
          >
            <Icon name="ellipsis-vertical" color={colors.primary} />
          </Pressable>
        ) : null,
    })
  }, [navigation, unreadCount, readCount, markPending, dismiss.isPending])

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
              {group.items.map((item, index) => (
                <NotificationRow
                  key={item.id}
                  item={item}
                  now={now}
                  divider={index < group.items.length - 1}
                  onOpen={() => {
                    if (!item.readAt) markRead([item.id])
                    navigation.navigate('CaseDetail', { caseId: item.caseId })
                  }}
                  onMarkRead={() => markRead([item.id])}
                  onDelete={() => deleteOne(item.id)}
                />
              ))}
            </View>
          </View>
        ))}
      </ScrollView>
      <UndoSnackbar count={undoIds.length} onUndo={undo} />
      <ActionSheet
        title="Opciones de avisos"
        actions={[
          ...(unreadCount > 0
            ? [{ id: 'read' as const, label: 'Marcar todo como leído', icon: 'checkmark' as const }]
            : []),
          ...(readCount > 0
            ? [
                {
                  id: 'delete' as const,
                  label: `Borrar avisos leídos (${readCount})`,
                  icon: 'trash-outline' as const,
                  destructive: true,
                },
              ]
            : []),
        ]}
        visible={menuOpen}
        onClose={() => setMenuOpen(false)}
        onSelect={(id) => {
          setMenuOpen(false)
          if (id === 'read') markRead(null)
          else void deleteRead()
        }}
      />
    </ScreenContainer>
  )
}

const styles = StyleSheet.create({
  content: { gap: spacing.lg, paddingHorizontal: spacing.md, paddingVertical: spacing.lg },
  headerAction: { minHeight: 44, minWidth: 44, alignItems: 'center', justifyContent: 'center' },
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
})
