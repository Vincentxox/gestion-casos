import { useEffect, useRef, useState } from 'react'
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native'
import ReanimatedSwipeable from 'react-native-gesture-handler/ReanimatedSwipeable'
import type { SwipeableMethods } from 'react-native-gesture-handler/ReanimatedSwipeable'
import Reanimated, {
  runOnJS,
  useAnimatedReaction,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated'

import { Icon } from '@/components/ui/Icon'
import { feedback } from '@/services/feedback'
import { colors, fonts, radius, spacing, typography } from '@/theme/tokens'
import type { AppNotification } from './notificationService'
import { notificationAppearance, notificationTimeLabel } from './notificationPresentation'
import { measureNotificationView } from './notificationLayout'

export type NotificationRowRect = { x: number; y: number; width: number; height: number }

function SwipeAction({
  direction,
  width,
  translation,
}: {
  direction: 'left' | 'right'
  width: number
  translation: SharedValue<number>
}) {
  const markRead = direction === 'left'
  const crossed = useSharedValue(false)
  useAnimatedReaction(
    () =>
      width > 0 &&
      (markRead ? translation.value >= width * 0.4 : translation.value <= -width * 0.4),
    (beyond) => {
      if (beyond && !crossed.value) {
        crossed.value = true
        runOnJS(feedback.selection)()
      }
      if (translation.value === 0) crossed.value = false
    },
    [width, markRead],
  )
  const leftBackground = useAnimatedStyle(() => ({
    backgroundColor: withTiming(
      translation.value >= width * 0.4 ? colors.primary : colors.primaryTint,
      { duration: 120 },
    ),
  }))
  const primaryIcon = useAnimatedStyle(() => ({
    opacity: withTiming(translation.value >= width * 0.4 ? 0 : 1, { duration: 120 }),
  }))
  const whiteIcon = useAnimatedStyle(() => ({
    opacity: withTiming(translation.value >= width * 0.4 ? 1 : 0, { duration: 120 }),
    transform: [
      { scale: withTiming(translation.value >= width * 0.4 ? 1.25 : 1, { duration: 120 }) },
    ],
  }))
  return (
    <Reanimated.View
      testID={markRead ? 'notification-swipe-read-action' : 'notification-swipe-delete-action'}
      style={[
        styles.action,
        markRead ? styles.leftAction : styles.rightAction,
        { width },
        markRead ? leftBackground : styles.deleteAction,
      ]}
    >
      {markRead ? (
        <View style={styles.actionIcon}>
          <Reanimated.View style={[styles.absoluteIcon, primaryIcon]}>
            <Icon name="checkmark" size={24} color={colors.primary} />
          </Reanimated.View>
          <Reanimated.View style={[styles.absoluteIcon, whiteIcon]}>
            <Icon name="checkmark" size={24} color={colors.white} />
          </Reanimated.View>
        </View>
      ) : (
        <Icon name="trash-outline" size={24} color={colors.white} />
      )}
    </Reanimated.View>
  )
}

function RowContent({ item, now }: { item: AppNotification; now: Date }) {
  const unread = !item.readAt
  const appearance = notificationAppearance(item.action)
  const caseLabel =
    item.caseNumber && item.caseTitle ? `${item.caseNumber} · ${item.caseTitle}` : item.body
  return (
    <>
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
    </>
  )
}

export function NotificationRowPreview({ item, now }: { item: AppNotification; now: Date }) {
  return (
    <View style={[styles.row, styles.previewRow]}>
      <RowContent item={item} now={now} />
    </View>
  )
}

export function NotificationRow({
  item,
  now,
  divider,
  restored = false,
  onOpen,
  onMarkRead,
  onDelete,
  onLongPress,
}: {
  item: AppNotification
  now: Date
  divider: boolean
  restored?: boolean
  onOpen: () => void
  onMarkRead: () => void
  onDelete: () => Promise<boolean>
  onLongPress: (rect: NotificationRowRect) => void
}) {
  const unread = !item.readAt
  const caseLabel =
    item.caseNumber && item.caseTitle ? `${item.caseNumber} · ${item.caseTitle}` : item.body
  const swipe = useRef<SwipeableMethods>(null)
  const rowRef = useRef<View>(null)
  const [width, setWidth] = useState(0)
  const [rowHeight, setRowHeight] = useState(80)
  const [removing, setRemoving] = useState(false)
  const [collapse] = useState(() => new Animated.Value(1))
  const reduceMotion = useReducedMotion()
  // Only the value at mount matters: a restored notice comes back as a new row.
  const [returning] = useState(restored)
  const [entrance] = useState(() => new Animated.Value(returning && !reduceMotion ? 0 : 1))
  const [highlight] = useState(() => new Animated.Value(returning ? 1 : 0))

  useEffect(() => {
    if (!returning) return
    Animated.parallel([
      Animated.timing(entrance, {
        toValue: 1,
        duration: reduceMotion ? 0 : 280,
        useNativeDriver: true,
      }),
      Animated.timing(highlight, {
        toValue: 0,
        delay: 700,
        duration: 900,
        useNativeDriver: true,
      }),
    ]).start()
  }, [entrance, highlight, reduceMotion, returning])

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
      testID="notification-row-container"
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
      <Animated.View
        style={{
          opacity: entrance,
          transform: [
            { translateX: entrance.interpolate({ inputRange: [0, 1], outputRange: [-32, 0] }) },
          ],
        }}
      >
        <ReanimatedSwipeable
          ref={swipe}
          leftThreshold={width * 0.4}
          rightThreshold={width * 0.4}
          dragOffsetFromLeftEdge={20}
          dragOffsetFromRightEdge={20}
          overshootLeft={false}
          overshootRight={false}
          onSwipeableOpen={(direction) => {
            if (direction === 'right' && unread) {
              onMarkRead()
              swipe.current?.close()
            } else if (direction === 'left' && !unread) deleteRow()
            else swipe.current?.close()
          }}
          renderLeftActions={
            unread
              ? (_progress, translation) => (
                  <SwipeAction direction="left" width={width} translation={translation} />
                )
              : undefined
          }
          renderRightActions={
            !unread
              ? (_progress, translation) => (
                  <SwipeAction direction="right" width={width} translation={translation} />
                )
              : undefined
          }
        >
          <Pressable
            ref={rowRef}
            accessibilityRole="button"
            accessibilityLabel={`${unread ? 'Sin leer. ' : ''}${item.title}. ${caseLabel}${item.actorName ? `. por ${item.actorName}` : ''}`}
            accessibilityHint="Mantén presionado para ver opciones"
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
            onLongPress={() => {
              measureNotificationView(rowRef.current, (x, y, measuredWidth, measuredHeight) => {
                void feedback.selection()
                onLongPress({ x, y, width: measuredWidth, height: measuredHeight })
              })
            }}
            style={[styles.row, unread && styles.unreadRow]}
          >
            <RowContent item={item} now={now} />
          </Pressable>
        </ReanimatedSwipeable>
        {returning ? (
          <Animated.View
            testID="notification-restored-highlight"
            pointerEvents="none"
            style={[styles.restoredHighlight, { opacity: highlight }]}
          />
        ) : null}
      </Animated.View>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  action: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  leftAction: { alignItems: 'flex-start', paddingLeft: spacing.lg },
  rightAction: { alignItems: 'flex-end', paddingRight: spacing.lg },
  deleteAction: { backgroundColor: colors.error },
  actionIcon: { width: 24, height: 24 },
  absoluteIcon: { position: 'absolute', top: 0, left: 0 },
  restoredHighlight: {
    ...StyleSheet.absoluteFill,
    // Translucent so the restored content stays readable under the highlight.
    backgroundColor: `${colors.primary}29`,
  },
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
  previewRow: { backgroundColor: colors.surface, borderRadius: radius.lg, overflow: 'hidden' },
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
