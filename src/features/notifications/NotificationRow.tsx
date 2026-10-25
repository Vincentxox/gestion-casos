import { useRef, useState } from 'react'
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native'
import ReanimatedSwipeable from 'react-native-gesture-handler/ReanimatedSwipeable'
import type { SwipeableMethods } from 'react-native-gesture-handler/ReanimatedSwipeable'
import {
  runOnJS,
  useAnimatedReaction,
  useReducedMotion,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated'

import { Icon } from '@/components/ui/Icon'
import { feedback } from '@/services/feedback'
import { colors, fonts, radius, spacing, typography } from '@/theme/tokens'
import type { AppNotification } from './notificationService'
import { notificationAppearance, notificationTimeLabel } from './notificationPresentation'

function RightAction({
  unread,
  width,
  translation,
}: {
  unread: boolean
  width: number
  translation: SharedValue<number>
}) {
  const crossed = useSharedValue(false)
  useAnimatedReaction(
    () => width > 0 && translation.value <= -width / 2,
    (beyond) => {
      if (beyond && !crossed.value) {
        crossed.value = true
        runOnJS(feedback.selection)()
      }
      if (translation.value === 0) crossed.value = false
    },
    [width],
  )
  return (
    <View
      style={[styles.action, { width, backgroundColor: unread ? colors.primary : colors.error }]}
    >
      <Icon name={unread ? 'checkmark' : 'trash-outline'} color={colors.white} />
      <Text style={styles.actionText}>{unread ? 'Leído' : 'Borrar'}</Text>
    </View>
  )
}

export function NotificationRow({
  item,
  now,
  divider,
  onOpen,
  onMarkRead,
  onDelete,
}: {
  item: AppNotification
  now: Date
  divider: boolean
  onOpen: () => void
  onMarkRead: () => void
  onDelete: () => Promise<boolean>
}) {
  const unread = !item.readAt
  const appearance = notificationAppearance(item.action)
  const caseLabel =
    item.caseNumber && item.caseTitle ? `${item.caseNumber} · ${item.caseTitle}` : item.body
  const swipe = useRef<SwipeableMethods>(null)
  const [width, setWidth] = useState(0)
  const [rowHeight, setRowHeight] = useState(80)
  const [removing, setRemoving] = useState(false)
  const [collapse] = useState(() => new Animated.Value(1))
  const reduceMotion = useReducedMotion()

  const deleteRow = () => {
    if (removing) return
    setRemoving(true)
    Animated.timing(collapse, {
      toValue: 0,
      duration: reduceMotion ? 0 : 200,
      useNativeDriver: false,
    }).start(({ finished }) => {
      if (!finished) return
      void onDelete().then((removed) => {
        if (!removed) {
          swipe.current?.close()
          Animated.timing(collapse, {
            toValue: 1,
            duration: reduceMotion ? 0 : 200,
            useNativeDriver: false,
          }).start(() => setRemoving(false))
        }
      })
    })
  }

  return (
    <Animated.View
      onLayout={(event) => {
        setWidth(event.nativeEvent.layout.width)
        if (!removing) setRowHeight(event.nativeEvent.layout.height)
      }}
      style={[
        divider && styles.rowDivider,
        {
          opacity: collapse,
          height: removing
            ? collapse.interpolate({ inputRange: [0, 1], outputRange: [0, rowHeight] })
            : undefined,
        },
      ]}
    >
      <ReanimatedSwipeable
        ref={swipe}
        rightThreshold={width / 2}
        dragOffsetFromRightEdge={20}
        overshootRight={false}
        onSwipeableOpen={() => {
          if (unread) {
            onMarkRead()
            swipe.current?.close()
          } else deleteRow()
        }}
        renderRightActions={(_progress, translation) => (
          <RightAction unread={unread} width={width} translation={translation} />
        )}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${unread ? 'Sin leer. ' : ''}${item.title}. ${caseLabel}${item.actorName ? `. por ${item.actorName}` : ''}`}
          accessibilityActions={[
            unread
              ? { name: 'markRead', label: 'Marcar como leído' }
              : { name: 'delete', label: 'Borrar' },
          ]}
          onAccessibilityAction={(event) => {
            if (event.nativeEvent.actionName === 'delete' && !unread) deleteRow()
            if (event.nativeEvent.actionName === 'markRead' && unread) onMarkRead()
          }}
          onPress={onOpen}
          style={[styles.row, unread && styles.unreadRow]}
        >
          <View
            testID="notification-icon-box"
            style={[
              styles.iconBox,
              { backgroundColor: unread ? colors.surface : appearance.background },
            ]}
          >
            <Icon name={appearance.icon} size={20} color={appearance.foreground} />
          </View>
          <View style={styles.rowBody}>
            <View style={styles.rowTop}>
              <Text numberOfLines={2} style={[styles.itemTitle, unread && styles.unreadTitle]}>
                {item.title}
              </Text>
              <Text style={styles.time}>{notificationTimeLabel(item.createdAt, now)}</Text>
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
      </ReanimatedSwipeable>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  action: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingRight: spacing.lg,
  },
  actionText: { ...typography.caption, color: colors.white, fontFamily: fonts.bold },
  rowDivider: { borderBottomColor: colors.cardBorder, borderBottomWidth: 1 },
  row: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    gap: spacing.base,
    minHeight: 80,
    padding: spacing.base,
    alignItems: 'flex-start',
  },
  unreadRow: { backgroundColor: colors.primarySoft },
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
  time: { ...typography.caption, color: colors.textMuted, fontSize: 12 },
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
