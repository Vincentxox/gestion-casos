import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native'

import { EmptyState } from '@/components/feedback/EmptyState'
import { colors, radius, spacing } from '@/theme/tokens'

type Kind = 'empty' | 'error' | 'loading'

export function RequestState({
  kind,
  title,
  message,
  onRetry,
}: {
  kind: Kind
  title: string
  message?: string
  onRetry?: () => void
}) {
  if (kind === 'empty') {
    return <EmptyState title={title} message={message ?? ''} variant="noResults" />
  }

  return (
    <View style={styles.container}>
      {kind === 'loading' ? <ActivityIndicator color={colors.primary} size="large" /> : null}
      <Text accessibilityRole="header" style={styles.title}>
        {title}
      </Text>
      {message ? <Text style={styles.message}>{message}</Text> : null}
      {kind === 'error' && onRetry ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Reintentar"
          onPress={onRetry}
          style={styles.button}
        >
          <Text style={styles.buttonText}>Reintentar</Text>
        </Pressable>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.lg,
  },
  title: { color: colors.text, fontSize: 18, fontWeight: '800', textAlign: 'center' },
  message: { color: colors.textMuted, textAlign: 'center', lineHeight: 21 },
  button: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
  },
  buttonText: { color: colors.white, fontWeight: '800' },
})
