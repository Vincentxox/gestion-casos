import type { BottomTabBarProps } from '@react-navigation/bottom-tabs'
import { useEffect, useState } from 'react'
import { Keyboard, Platform, Pressable, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { Icon, type IconName } from '@/components/ui/Icon'
import { colors, elevation, fonts, radius, spacing } from '@/theme/tokens'

export const TAB_ICONS: Record<string, readonly [IconName, IconName]> = {
  Home: ['home-outline', 'home'],
  CasesTab: ['list-outline', 'list'],
  Administration: ['settings-outline', 'settings'],
  Help: ['help-circle-outline', 'help-circle'],
  Profile: ['person-outline', 'person'],
}

/** Barra inferior flotante en forma de píldora, con el botón + aparte cuando se puede crear. */
export function FloatingTabBar({
  state,
  descriptors,
  navigation,
  onCreate,
}: BottomTabBarProps & { onCreate?: () => void }) {
  const insets = useSafeAreaInsets()
  const [keyboardVisible, setKeyboardVisible] = useState(false)

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow'
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide'
    const show = Keyboard.addListener(showEvent, () => setKeyboardVisible(true))
    const hide = Keyboard.addListener(hideEvent, () => setKeyboardVisible(false))
    return () => {
      show.remove()
      hide.remove()
    }
  }, [])

  if (keyboardVisible) return null

  return (
    <View
      style={[styles.container, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}
      testID="floating-tab-bar"
    >
      <View accessibilityRole="tablist" style={styles.pill}>
        {state.routes.map((route, index) => {
          const options = descriptors[route.key]?.options
          const focused = state.index === index
          const title = typeof options?.title === 'string' ? options.title : route.name
          const label = typeof options?.tabBarLabel === 'string' ? options.tabBarLabel : title
          const badge = options?.tabBarBadge
          const icons = TAB_ICONS[route.name] ?? (['ellipse-outline', 'ellipse'] as const)
          const color = focused ? colors.primaryDark : colors.textMuted
          return (
            <Pressable
              key={route.key}
              accessibilityLabel={badge ? `${title}, ${badge} pendientes` : title}
              accessibilityRole="tab"
              accessibilityState={{ selected: focused }}
              onLongPress={() => navigation.emit({ type: 'tabLongPress', target: route.key })}
              onPress={() => {
                const event = navigation.emit({
                  type: 'tabPress',
                  target: route.key,
                  canPreventDefault: true,
                })
                if (!focused && !event.defaultPrevented) navigation.navigate(route.name, undefined)
              }}
              style={[styles.tab, focused && styles.tabFocused]}
            >
              <View>
                <Icon name={icons[focused ? 1 : 0]} color={color} size={21} />
                {badge ? (
                  <View
                    style={[styles.badge, route.name === 'Administration' && styles.adminBadge]}
                  >
                    <Text style={styles.badgeText}>{badge}</Text>
                  </View>
                ) : null}
              </View>
              <Text
                numberOfLines={1}
                style={[styles.label, { color }, focused && styles.labelFocused]}
              >
                {label}
              </Text>
            </Pressable>
          )
        })}
      </View>
      {onCreate ? (
        <Pressable
          accessibilityLabel="Nueva solicitud"
          accessibilityRole="button"
          onPress={onCreate}
          style={({ pressed }) => [styles.create, pressed && styles.createPressed]}
        >
          <Icon name="add" color={colors.white} size={28} />
        </Pressable>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    backgroundColor: colors.background,
  },
  pill: {
    flex: 1,
    flexDirection: 'row',
    gap: 2,
    padding: 6,
    borderRadius: radius.sheet,
    borderWidth: 1,
    borderColor: colors.track,
    backgroundColor: colors.surface,
    ...elevation.md,
  },
  tab: {
    flex: 1,
    minHeight: 50,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    borderRadius: 26,
  },
  tabFocused: { backgroundColor: colors.primarySoft },
  label: { fontFamily: fonts.semibold, fontSize: 11, lineHeight: 14 },
  labelFocused: { fontFamily: fonts.bold },
  badge: {
    position: 'absolute',
    top: -4,
    right: -10,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    backgroundColor: colors.sky,
  },
  badgeText: { fontFamily: fonts.bold, fontSize: 11, lineHeight: 14, color: colors.white },
  adminBadge: { backgroundColor: colors.warning },
  create: {
    width: 62,
    height: 62,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    ...elevation.md,
    shadowColor: colors.primary,
  },
  createPressed: { opacity: 0.85 },
})
