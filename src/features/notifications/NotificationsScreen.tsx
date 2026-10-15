import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { RequestState } from '@/components/feedback/RequestState'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { ScreenContainer } from '@/components/ui/ScreenContainer'
import type { MainStackParamList } from '@/navigation/types'
import { colors, spacing, typography } from '@/theme/tokens'
import { useMarkNotificationsRead, useNotifications } from './useNotifications'

type Props = NativeStackScreenProps<MainStackParamList, 'Notifications'>

export function NotificationsScreen({ navigation }: Props) {
  const notifications = useNotifications()
  const markRead = useMarkNotificationsRead()
  const unreadCount = notifications.data?.filter((item) => !item.readAt).length ?? 0
  return (
    <ScreenContainer padded={false}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.heading}>
          <Text accessibilityRole="header" style={styles.title}>
            Avisos
          </Text>
          {unreadCount > 0 ? (
            <Button
              label="Marcar todos como leídos"
              variant="text"
              loading={markRead.isPending}
              onPress={() => markRead.mutate(null)}
            />
          ) : null}
        </View>
        {notifications.isLoading ? <RequestState kind="loading" title="Cargando avisos…" /> : null}
        {notifications.isError ? (
          <RequestState
            kind="error"
            title="No fue posible cargar los avisos"
            onRetry={() => void notifications.refetch()}
          />
        ) : null}
        {notifications.data?.length === 0 ? (
          <Text style={styles.muted}>No tienes avisos por ahora.</Text>
        ) : null}
        {notifications.data?.map((item) => (
          <Card
            key={item.id}
            onPress={() => {
              if (!item.readAt) markRead.mutate([item.id])
              navigation.navigate('CaseDetail', { caseId: item.caseId })
            }}
            contentStyle={styles.card}
            accessibilityLabel={`${item.readAt ? '' : 'Sin leer. '}${item.title}. ${item.body}`}
          >
            <Text style={styles.itemTitle}>
              {item.title}
              {item.readAt ? '' : ' · Nuevo'}
            </Text>
            <Text style={styles.muted}>{item.body}</Text>
            <Text style={styles.date}>{new Date(item.createdAt).toLocaleString('es-GT')}</Text>
          </Card>
        ))}
      </ScrollView>
    </ScreenContainer>
  )
}

const styles = StyleSheet.create({
  content: { gap: spacing.md, padding: spacing.lg },
  heading: { gap: spacing.sm },
  title: { ...typography.display, color: colors.text },
  card: { gap: spacing.xs },
  itemTitle: { ...typography.heading, color: colors.text },
  muted: { ...typography.body, color: colors.textMuted },
  date: { ...typography.caption, color: colors.textMuted },
})
