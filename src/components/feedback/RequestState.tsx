import { ActivityIndicator, StyleSheet, Text, View } from 'react-native'

import { EmptyState } from '@/components/feedback/EmptyState'
import { Button } from '@/components/ui/Button'
import { colors, spacing, typography } from '@/theme/tokens'

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
      {kind === 'error' && onRetry ? <Button label="Reintentar" onPress={onRetry} /> : null}
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
  title: { ...typography.heading, color: colors.text, textAlign: 'center' },
  message: { ...typography.body, color: colors.textMuted, textAlign: 'center' },
})
