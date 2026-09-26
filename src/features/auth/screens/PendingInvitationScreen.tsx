import { useEffect, useState } from 'react'
import { Alert, AppState, Pressable, ScrollView, StyleSheet, Text, TextInput } from 'react-native'

import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { ScreenContainer } from '@/components/ui/ScreenContainer'
import { EmptyState } from '@/components/feedback/EmptyState'
import { useAuthStore } from '@/store/authStore'
import { colors, radius, spacing, typography } from '@/theme/tokens'

import { normalizeJoinCode } from '../accessService'
import {
  useCancelMyAccessRequest,
  useMyAccessRequest,
  useRequestOrganizationAccess,
} from '../useAccessRequest'

export function PendingInvitationScreen() {
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [showCode, setShowCode] = useState(false)
  const pending = useMyAccessRequest()
  const request = useRequestOrganizationAccess()
  const cancel = useCancelMyAccessRequest()
  const retryInvitation = useAuthStore((state) => state.retryInvitation)
  const logout = useAuthStore((state) => state.logout)
  const session = useAuthStore((state) => state.session)
  const refetchRequest = pending.refetch

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state !== 'active') return
      void retryInvitation().catch(() => {})
      void refetchRequest()
    })
    return () => subscription.remove()
  }, [retryInvitation, refetchRequest])

  useEffect(() => {
    if (pending.data?.status === 'aprobada') void retryInvitation().catch(() => {})
  }, [pending.data?.status, retryInvitation])

  async function retry() {
    setBusy(true)
    try {
      if (!(await retryInvitation())) {
        await pending.refetch()
        Alert.alert(
          'Acceso aún pendiente',
          'Si te invitaron, usa el mismo correo con el que entraste.',
        )
      }
    } catch {
      Alert.alert(
        'No fue posible comprobar el acceso',
        'Comprueba tu conexión e inténtalo de nuevo.',
      )
    } finally {
      setBusy(false)
    }
  }

  async function submitCode() {
    if (normalizeJoinCode(code).length !== 9) {
      Alert.alert('Código incompleto', 'Escribe los ocho caracteres del código de tu empresa.')
      return
    }
    try {
      const result = await request.mutateAsync(code)
      if (result.status === 'codigo_invalido')
        Alert.alert('Código no válido', 'Pídelo al administrador de tu empresa.')
      else if (result.status === 'demasiados_intentos')
        Alert.alert('Demasiados intentos', 'Vuelve a intentarlo en una hora.')
      else {
        setShowCode(false)
        Alert.alert(
          'Solicitud enviada',
          `Solicitud enviada a ${result.organizationName || 'tu empresa'}. El administrador revisará tu acceso.`,
        )
      }
    } catch (error) {
      Alert.alert(
        'No fue posible enviar la solicitud',
        error instanceof Error ? error.message : 'Comprueba tu conexión.',
      )
    }
  }

  async function cancelRequest() {
    try {
      await cancel.mutateAsync()
      Alert.alert('Solicitud cancelada')
    } catch (error) {
      Alert.alert(
        'No fue posible cancelar',
        error instanceof Error ? error.message : 'Inténtalo de nuevo.',
      )
    }
  }

  return (
    <ScreenContainer edges={['top', 'bottom', 'left', 'right']} padded={false}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.eyebrow}>NEXO CASOS</Text>
        <Text accessibilityRole="header" style={styles.title}>
          Entra a tu empresa
        </Text>
        <Text style={styles.description}>
          Tu cuenta está lista. Puedes solicitar acceso con un código o comprobar una invitación
          enviada a {session?.user.email || 'tu correo'}.
        </Text>
        {pending.isLoading ? (
          <Text style={styles.description}>Comprobando solicitudes…</Text>
        ) : null}
        {pending.isError ? (
          <Pressable accessibilityRole="button" onPress={() => void pending.refetch()}>
            <Text style={styles.error}>No se pudo comprobar tu solicitud. Reintentar</Text>
          </Pressable>
        ) : null}
        {pending.data?.status === 'pendiente' ? (
          <Card contentStyle={styles.card}>
            <EmptyState
              variant="pending"
              title={`Solicitud enviada a ${pending.data.organizationName}`}
              message="El administrador revisará tu acceso. Mientras tanto, no puedes ver los datos de la empresa."
              compact
            />
            <Button label="Comprobar estado" loading={busy} onPress={() => void retry()} />
            <Button
              label="Cancelar solicitud"
              loading={cancel.isPending}
              onPress={() => void cancelRequest()}
              variant="secondary"
            />
          </Card>
        ) : null}
        {pending.data?.status === 'rechazada' ? (
          <Card contentStyle={styles.card}>
            <Text style={styles.cardTitle}>Solicitud rechazada</Text>
            <Text style={styles.description}>
              {pending.data.decisionNote ||
                'Contacta al administrador si necesitas más información.'}
            </Text>
          </Card>
        ) : null}
        {pending.data?.status !== 'pendiente' ? (
          <Card contentStyle={styles.card}>
            <Text style={styles.cardTitle}>Tengo un código de empresa</Text>
            {showCode ? (
              <>
                <TextInput
                  accessibilityLabel="Código de empresa"
                  autoCapitalize="characters"
                  autoCorrect={false}
                  maxLength={9}
                  onChangeText={(value) => setCode(normalizeJoinCode(value))}
                  placeholder="XXXX-XXXX"
                  style={styles.input}
                  value={code}
                />
                <Button
                  label="Solicitar acceso"
                  loading={request.isPending}
                  onPress={() => void submitCode()}
                />
              </>
            ) : (
              <Button label="Escribir código" onPress={() => setShowCode(true)} />
            )}
          </Card>
        ) : null}
        <Card contentStyle={styles.card}>
          <Text style={styles.cardTitle}>Me enviaron una invitación</Text>
          <Text style={styles.description}>
            Comprueba que la invitación sea para este mismo correo.
          </Text>
          <Button label="Comprobar invitación" loading={busy} onPress={() => void retry()} />
        </Card>
        <Button label="Cerrar sesión" variant="text" onPress={() => void logout()} />
      </ScrollView>
    </ScreenContainer>
  )
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, gap: spacing.lg, padding: spacing.lg },
  eyebrow: { color: colors.primary, ...typography.overline },
  title: { color: colors.text, ...typography.display },
  description: { color: colors.textMuted, ...typography.body },
  card: { gap: spacing.md, padding: spacing.lg },
  cardTitle: { color: colors.text, ...typography.heading },
  input: {
    minHeight: 52,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    ...typography.heading,
    color: colors.text,
  },
  error: { color: colors.error, ...typography.body },
})
