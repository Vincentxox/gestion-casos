import { useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'

import { Icon } from '@/components/ui/Icon'
import { Button } from '@/components/ui/Button'
import { ScreenContainer } from '@/components/ui/ScreenContainer'
import { useAuthStore } from '@/store/authStore'
import { colors, radius, spacing, typography } from '@/theme/tokens'
import { getErrorMessage } from '@/utils/errorMessage'

import { AuthHeading } from '../components/AuthHeading'
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
    <ScreenContainer edges={['top', 'bottom', 'left', 'right']} padded={false}>
      <View style={styles.content}>
        <View style={styles.body}>
          <View style={styles.iconCircle}>
            <Icon color={colors.warning} name="pause-circle-outline" size={34} />
          </View>
          <AuthHeading title="Tu empresa está inactiva" centered>
            Tu cuenta sigue activa, pero tu empresa no tiene acceso por ahora. Comunícate con el
            administrador de tu empresa o con Nexo Casos.
          </AuthHeading>
          {message ? (
            <Text accessibilityRole="alert" style={styles.message}>
              {message}
            </Text>
          ) : null}
        </View>
        <View style={styles.actions}>
          <Button
            label="Reintentar"
            loading={checking}
            disabled={signingOut}
            onPress={() => void retry()}
            style={styles.primaryButton}
          />
          <Button
            label="Cerrar sesión"
            variant="text"
            loading={signingOut}
            disabled={checking}
            onPress={() => confirmLogout(() => void closeSession())}
          />
        </View>
      </View>
    </ScreenContainer>
  )
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
  },
  body: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: spacing.md + 2 },
  iconCircle: {
    width: 72,
    height: 72,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    backgroundColor: colors.warningSoft,
  },
  message: {
    ...typography.body,
    color: colors.text,
    textAlign: 'center',
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceMuted,
    overflow: 'hidden',
  },
  actions: { gap: spacing.sm },
  primaryButton: { minHeight: 56 },
})
