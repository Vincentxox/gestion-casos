import { useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'

import { feedback } from '@/services/feedback'
import { colors, elevation, fonts, radius, spacing, typography } from '@/theme/tokens'

export interface Segment<T extends string> {
  value: T
  label: string
  count?: number
}

export function SegmentedControl<T extends string>({
  segments,
  selected,
  onChange,
}: {
  segments: readonly Segment<T>[]
  selected: T
  onChange: (value: T) => void
}) {
  const [width, setWidth] = useState(0)
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
      contentContainerStyle={[styles.container, { minWidth: width }]}
      style={styles.scroll}
    >
      {segments.map((segment) => {
        const active = segment.value === selected
        const label = `${segment.label}${segment.count === undefined ? '' : `, ${segment.count}`}`
        return (
          <Pressable
            key={segment.value}
            accessibilityLabel={label}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            onPress={() => {
              if (!active) {
                onChange(segment.value)
                void feedback.selection()
              }
            }}
            style={[styles.segment, active && styles.active]}
          >
            <Text numberOfLines={1} style={[styles.label, active && styles.activeLabel]}>
              {segment.label}
            </Text>
            {segment.count === undefined ? null : (
              <View style={[styles.count, active && styles.activeCount]}>
                <Text style={[styles.countText, active && styles.activeLabel]}>
                  {segment.count}
                </Text>
              </View>
            )}
          </Pressable>
        )
      })}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 0, flexShrink: 0 },
  container: {
    flexDirection: 'row',
    gap: spacing.xs,
    padding: spacing.xs,
    borderRadius: radius.md,
    backgroundColor: colors.neutralSoft,
  },
  segment: {
    minHeight: 44,
    minWidth: 84,
    flex: 1,
    flexDirection: 'row',
    gap: spacing.xs,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.sm,
    paddingHorizontal: spacing.xs,
  },
  active: { backgroundColor: colors.surface, ...elevation.sm },
  label: {
    ...typography.caption,
    color: colors.text,
    textAlign: 'center',
    flexShrink: 0,
  },
  activeLabel: { color: colors.text, fontFamily: fonts.bold },
  count: {
    minWidth: 22,
    height: 22,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.xs,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeCount: { backgroundColor: colors.primarySoft },
  countText: {
    ...typography.caption,
    color: colors.textMuted,
    fontFamily: fonts.semibold,
    lineHeight: typography.caption.fontSize,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
})
