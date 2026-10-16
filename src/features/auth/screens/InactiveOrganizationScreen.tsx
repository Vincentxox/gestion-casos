import { useState } from 'react'
import { StyleSheet, Text } from 'react-native'

import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { ScreenContainer } from '@/components/ui/ScreenContainer'
import { useAuthStore } from '@/store/authStore'
import { colors, spacing, typography } from '@/theme/tokens'
import { getErrorMessage } from '@/utils/errorMessage'

import { confirmLogout } from '../confirmLogout'

export function InactiveOrganizationScreen() {
  const refreshProfile = useAuthStore((state) => state.refreshProfile)
  const logout = useAuthStore((state) => state.logout)
  const [checking, setChecking] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  async function retry() {
    setChecking(true)
    setMessage(null)
    try {
      const profile = await refreshProfile()
      if (profile?.organizationActive === false) {
        setMessage('Tu empresa sigue inactiva. Inténtalo de nuevo más tarde.')
      }
    } catch (error) {
      setMessage(getErrorMessage(error, 'No fue posible comprobar el estado. Inténtalo de nuevo.'))
    } finally {
      setChecking(false)
    }
  }

  async function closeSession() {
    setSigningOut(true)
    setMessage(null)
    try {
      await logout()
    } catch (error) {
      setMessage(getErrorMessage(error, 'No fue posible cerrar sesión. Inténtalo de nuevo.'))
    } finally {
      setSigningOut(false)
    }
  }

  return (
    <ScreenContainer edges={['top', 'bottom', 'left', 'right']}>
      <Card style={styles.card}>
        <Text accessibilityRole="header" style={styles.title}>
          Tu empresa está inactiva
        </Text>
        <Text style={styles.description}>
          Tu cuenta sigue activa, pero tu empresa no tiene acceso por ahora. Comunícate con el
          administrador de tu empresa o con Nexo Casos.
        </Text>
        {message ? (
          <Text accessibilityRole="alert" style={styles.message}>
            {message}
          </Text>
        ) : null}
        <Button
          label="Reintentar"
          loading={checking}
          disabled={signingOut}
          onPress={() => void retry()}
        />
        <Button
          label="Cerrar sesión"
          variant="secondary"
          loading={signingOut}
          disabled={checking}
          onPress={() => confirmLogout(() => void closeSession())}
        />
      </Card>
    </ScreenContainer>
  )
}

const styles = StyleSheet.create({
  card: { gap: spacing.lg, marginTop: spacing.xl },
  title: { color: colors.text, ...typography.display },
  description: { color: colors.textMuted, ...typography.body },
  message: { color: colors.error, ...typography.body },
})
