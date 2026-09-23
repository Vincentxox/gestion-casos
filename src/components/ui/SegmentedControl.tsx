import { Pressable, StyleSheet, Text, View } from 'react-native'

import { feedback } from '@/services/feedback'
import { colors, elevation, fonts, radius, spacing } from '@/theme/tokens'

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
  return (
    <View style={styles.container}>
      {segments.map((segment) => {
        const active = segment.value === selected
        const label = `${segment.label}${segment.count === undefined ? '' : ` · ${segment.count}`}`
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
            <Text style={[styles.label, active && styles.activeLabel]}>{label}</Text>
          </Pressable>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: spacing.xs,
    padding: spacing.xs,
    borderRadius: radius.md,
    backgroundColor: colors.neutralSoft,
  },
  segment: {
    minHeight: 44,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.sm,
    paddingHorizontal: spacing.xs,
  },
  active: { backgroundColor: colors.surface, ...elevation.sm },
  label: { color: colors.textMuted, fontFamily: fonts.medium, fontSize: 13, textAlign: 'center' },
  activeLabel: { color: colors.text, fontFamily: fonts.bold },
})
