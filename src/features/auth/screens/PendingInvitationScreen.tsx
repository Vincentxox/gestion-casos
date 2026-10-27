import { getErrorMessage } from '@/utils/errorMessage'
import { AppFeedback } from '@/components/feedback/AppFeedback'
import { useEffect, useState } from 'react'
import {
  AppState,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { queryClient } from '@/config/queryClient'
import type { PendingOrganizationStackParamList } from '@/navigation/types'
import type { OrganizationCreationInput } from '../organizationRequestService'
import {
  useCancelOrganizationCreationRequest,
  useMyOrganizationCreationRequest,
} from '../useOrganizationRequest'

import { Button } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'
import { KeyboardFormScrollView } from '@/components/layout/KeyboardFormScrollView'
import { ScreenContainer } from '@/components/ui/ScreenContainer'
import { useAuthStore } from '@/store/authStore'
import { colors, fonts, radius, spacing, typography } from '@/theme/tokens'
import { formatTrackingMoment } from '@/theme/formatters'

import { AuthHeading } from '../components/AuthHeading'

import { normalizeJoinCode } from '../accessService'
import { confirmLogout } from '../confirmLogout'
import {
  useCancelMyAccessRequest,
  useMyAccessRequest,
  useRequestOrganizationAccess,
} from '../useAccessRequest'

export function PendingInvitationScreen({
  navigation,
}: {
  navigation?: {
    navigate: (
      screen: 'RequestOrganization',
      params?: PendingOrganizationStackParamList['RequestOrganization'],
    ) => void
  }
} = {}) {
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const pending = useMyAccessRequest()
  const request = useRequestOrganizationAccess()
  const cancel = useCancelMyAccessRequest()
  const organizationRequest = useMyOrganizationCreationRequest()
  const cancelOrganization = useCancelOrganizationCreationRequest()
  const retryInvitation = useAuthStore((state) => state.retryInvitation)
  const logout = useAuthStore((state) => state.logout)
  const session = useAuthStore((state) => state.session)
  const refetchRequest = pending.refetch
  const refetchOrganization = organizationRequest.refetch

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state !== 'active') return
      void retryInvitation().catch(() => {})
      void refetchRequest()
      void refetchOrganization()
    })
    return () => subscription.remove()
  }, [retryInvitation, refetchRequest, refetchOrganization])

  useEffect(() => {
    if (pending.data?.status === 'aprobada') void retryInvitation().catch(() => {})
  }, [pending.data?.status, retryInvitation])

  useEffect(() => {
    if (organizationRequest.data?.status === 'aprobada') void retryInvitation().catch(() => {})
  }, [organizationRequest.data?.status, retryInvitation])

  async function checkOrganization() {
    setBusy(true)
    try {
      const result = await organizationRequest.refetch()
      if (result.isError) throw result.error
      if (await retryInvitation()) return
      if (result.data?.status === 'pendiente') {
        AppFeedback.show(
          'Tu solicitud sigue en revisión',
          'Te avisamos aquí cuando la revisemos.',
          { tone: 'info' },
        )
      }
    } catch {
      AppFeedback.show(
        'No fue posible comprobar el estado',
        'Comprueba tu conexión e inténtalo de nuevo.',
        { tone: 'error' },
      )
    } finally {
      setBusy(false)
    }
  }

  async function cancelOrganizationRequest() {
    const name = organizationRequest.data?.organizationName
    if (!name) return
    AppFeedback.show(
      `¿Cancelar la solicitud de ${name}?`,
      'Puedes enviar otra solicitud después.',
      [
        { text: 'Volver', style: 'cancel' },
        {
          text: 'Cancelar solicitud',
          style: 'destructive',
          onPress: () => {
            void cancelOrganization
              .mutateAsync()
              .then(() => AppFeedback.toast('Solicitud cancelada', { tone: 'info' }))
              .catch((error) =>
                AppFeedback.show(
                  'No fue posible cancelar',
                  getErrorMessage(error, 'Inténtalo de nuevo.'),
                  { tone: 'error' },
                ),
              )
          },
        },
      ],
      { tone: 'danger' },
    )
  }

  async function retry() {
    setBusy(true)
    try {
      if (!(await retryInvitation())) {
        await pending.refetch()
        AppFeedback.show(
          'Acceso aún pendiente',
          'Si te invitaron, usa el mismo correo con el que entraste.',
          { tone: 'info' },
        )
      }
    } catch {
      AppFeedback.show(
        'No fue posible comprobar el acceso',
        'Comprueba tu conexión e inténtalo de nuevo.',
        { tone: 'error' },
      )
    } finally {
      setBusy(false)
    }
  }

  async function submitCode() {
    if (normalizeJoinCode(code).length !== 9) {
      AppFeedback.show(
        'Código incompleto',
        'Escribe los ocho caracteres del código de tu empresa.',
        { tone: 'warning' },
      )
      return
    }
    try {
      const result = await request.mutateAsync(code)
      if (result.status === 'codigo_invalido')
        AppFeedback.show('Código no válido', 'Pídelo al administrador de tu empresa.', {
          tone: 'warning',
        })
      else if (result.status === 'demasiados_intentos')
        AppFeedback.show('Demasiados intentos', 'Vuelve a intentarlo en una hora.', {
          tone: 'warning',
        })
      else {
        setCode('')
        AppFeedback.show(
          'Solicitud enviada',
          `Solicitud enviada a ${result.organizationName || 'tu empresa'}. El administrador revisará tu acceso.`,
          { tone: 'success' },
        )
      }
    } catch (error) {
      AppFeedback.show(
        'No fue posible enviar la solicitud',
        getErrorMessage(error, 'Comprueba tu conexión.'),
        { tone: 'error' },
      )
    }
  }

  async function cancelRequest() {
    try {
      await cancel.mutateAsync()
      AppFeedback.toast('Solicitud cancelada', { tone: 'info' })
    } catch (error) {
      AppFeedback.show('No fue posible cancelar', getErrorMessage(error, 'Inténtalo de nuevo.'), {
        tone: 'error',
      })
    }
  }

  const isPending = pending.data?.status === 'pendiente'
  const creation = organizationRequest.data
  const creationPending = creation?.status === 'pendiente'

  return (
    <ScreenContainer edges={['top', 'bottom', 'left', 'right']} padded={false}>
      <KeyboardFormScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={pending.isRefetching || organizationRequest.isRefetching}
            onRefresh={() =>
              void Promise.all([
                pending.refetch(),
                organizationRequest.refetch(),
                retryInvitation(),
              ])
            }
          />
        }
      >
        <View
          accessibilityLabel={
            creation?.status === 'aprobada'
              ? 'Paso 3 de 3: empresa creada'
              : isPending || creationPending
                ? 'Paso 2 de 3: solicitud enviada'
                : 'Paso 2 de 3: elegir empresa'
          }
          accessible
          style={styles.steps}
        >
          <View style={styles.line}>
            <View style={styles.lineStart} />
            <View style={[styles.lineSegment, styles.lineDone]} />
            <View style={styles.lineSegment}>
              <View
                style={[
                  styles.lineFill,
                  {
                    width:
                      creation?.status === 'aprobada'
                        ? '100%'
                        : isPending || creationPending
                          ? '50%'
                          : '0%',
                  },
                ]}
              />
            </View>
            <View style={[styles.lineEnd, creation?.status === 'aprobada' && styles.lineEndDone]} />
          </View>
          <View style={styles.stepLabels}>
            <Text style={styles.stepLabel}>Cuenta</Text>
            <Text style={styles.stepLabel}>Empresa</Text>
            <Text style={styles.stepLabel}>Listo</Text>
          </View>
        </View>

        <AuthHeading title="Entra a tu empresa">
          Tu cuenta está lista. Pide acceso con el código de tu empresa o comprueba una invitación
          enviada a <Text style={styles.email}>{session?.user.email || 'tu correo'}</Text>.
        </AuthHeading>

        {pending.isLoading ? (
          <Text style={styles.description}>Comprobando solicitudes…</Text>
        ) : null}
        {pending.isError ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => void pending.refetch()}
            style={styles.errorButton}
          >
            <Text style={styles.error}>No se pudo comprobar tu solicitud. Reintentar</Text>
          </Pressable>
        ) : null}
        {organizationRequest.isError ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => void organizationRequest.refetch()}
            style={styles.errorButton}
          >
            <Text style={styles.error}>
              No se pudo comprobar tu solicitud de empresa. Reintentar
            </Text>
          </Pressable>
        ) : null}

        {creation?.status === 'pendiente' ? (
          <View style={[styles.panel, styles.pendingPanel]}>
            <View style={styles.panelHeader}>
              <View style={[styles.iconTile, styles.iconTileOnSoft]}>
                <Icon color={colors.primaryDark} name="time-outline" />
              </View>
              <View style={styles.panelText}>
                <Text accessibilityRole="header" style={styles.pendingTitle}>
                  Solicitud enviada: {creation.organizationName}
                </Text>
                <Text style={styles.panelBody}>
                  La revisamos y te avisamos aquí. Enviada{' '}
                  {formatTrackingMoment(creation.createdAt)}
                </Text>
              </View>
            </View>
            <Button
              label="Comprobar estado"
              loading={busy}
              onPress={() => void checkOrganization()}
              style={styles.panelButton}
            />
            <Button
              label="Cancelar solicitud"
              loading={cancelOrganization.isPending}
              variant="text"
              onPress={() => void cancelOrganizationRequest()}
            />
          </View>
        ) : null}

        {creation?.status === 'rechazada' ? (
          <View style={[styles.panel, styles.rejectedPanel]}>
            <View style={styles.panelHeader}>
              <View style={[styles.iconTile, styles.iconTileOnSoft]}>
                <Icon color={colors.dangerText} name="close-circle-outline" />
              </View>
              <View style={styles.panelText}>
                <Text accessibilityRole="header" style={styles.panelTitle}>
                  No aprobamos {creation.organizationName}
                </Text>
                <Text style={styles.panelBody}>Motivo: {creation.rejectionReason}</Text>
              </View>
            </View>
            <Button
              label="Enviar otra solicitud"
              variant="secondary"
              onPress={() => {
                const draft = session?.user.id
                  ? queryClient.getQueryData<OrganizationCreationInput>([
                      'organization-creation-draft',
                      session.user.id,
                    ])
                  : undefined
                navigation?.navigate('RequestOrganization', {
                  prefill: {
                    organizationName: creation.organizationName,
                    contactPhone: draft?.contactPhone ?? '',
                    teamSize: draft?.teamSize,
                    message: draft?.message ?? '',
                  },
                })
              }}
            />
          </View>
        ) : null}

        {creation?.status === 'aprobada' ? (
          <View style={[styles.panel, styles.approvedPanel]}>
            <View style={styles.panelHeader}>
              <View style={[styles.iconTile, styles.iconTileOnSoft]}>
                <Icon color={colors.success} name="checkmark-circle-outline" />
              </View>
              <View style={styles.panelText}>
                <Text accessibilityRole="header" style={styles.panelTitle}>
                  {creation.organizationName} ya está creada
                </Text>
                <Text style={styles.panelBody}>
                  Eres su administrador. Entra para configurar áreas e invitar a tu equipo.
                </Text>
              </View>
            </View>
            <Button
              label={`Entrar a ${creation.organizationName}`}
              loading={busy}
              onPress={() => void checkOrganization()}
            />
          </View>
        ) : null}

        {isPending ? (
          <View style={[styles.panel, styles.pendingPanel]}>
            <View style={styles.panelHeader}>
              <View style={[styles.iconTile, styles.iconTileOnSoft]}>
                <Icon color={colors.primaryDark} name="time-outline" />
              </View>
              <View style={styles.panelText}>
                <Text accessibilityRole="header" style={styles.pendingTitle}>
                  Solicitud enviada a {pending.data?.organizationName}
                </Text>
                <Text style={styles.panelBody}>
                  El administrador revisará tu acceso. Mientras tanto no puedes ver los datos de la
                  empresa.
                </Text>
              </View>
            </View>
            <Button
              label="Comprobar estado"
              loading={busy}
              onPress={() => void retry()}
              style={styles.panelButton}
            />
            <Button
              label="Cancelar solicitud"
              loading={cancel.isPending}
              onPress={() => void cancelRequest()}
              variant="text"
            />
          </View>
        ) : null}

        {pending.data?.status === 'rechazada' ? (
          <View style={[styles.panel, styles.rejectedPanel]}>
            <View style={styles.panelHeader}>
              <View style={[styles.iconTile, styles.iconTileOnSoft]}>
                <Icon color={colors.dangerText} name="close-circle-outline" />
              </View>
              <View style={styles.panelText}>
                <Text accessibilityRole="header" style={styles.panelTitle}>
                  Solicitud rechazada
                </Text>
                <Text style={styles.panelBody}>
                  {pending.data.decisionNote ||
                    'Contacta al administrador si necesitas más información.'}
                </Text>
              </View>
            </View>
          </View>
        ) : null}

        {!isPending ? (
          <View style={styles.panel}>
            <View style={styles.panelHeader}>
              <View style={[styles.iconTile, styles.iconTileCode]}>
                <Icon color={colors.primaryDark} name="key-outline" />
              </View>
              <Text accessibilityRole="header" style={styles.panelTitle}>
                Tengo un código de empresa
              </Text>
            </View>
            <TextInput
              accessibilityLabel="Código de empresa"
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={9}
              onChangeText={(value) => setCode(normalizeJoinCode(value))}
              onSubmitEditing={() => void submitCode()}
              placeholder="XXXX-XXXX"
              placeholderTextColor={colors.textMuted}
              returnKeyType="send"
              style={styles.codeInput}
              value={code}
            />
            <Button
              label="Solicitar acceso"
              loading={request.isPending}
              onPress={() => void submitCode()}
              style={styles.panelButton}
            />
          </View>
        ) : null}

        <View style={styles.panel}>
          <View style={styles.panelHeader}>
            <View style={[styles.iconTile, styles.iconTileInvite]}>
              <Icon color={colors.primaryDark} name="mail-outline" />
            </View>
            <View style={styles.panelText}>
              <Text accessibilityRole="header" style={styles.panelTitle}>
                Me enviaron una invitación
              </Text>
              <Text style={styles.description}>Debe ser para este mismo correo.</Text>
            </View>
          </View>
          <Button
            label="Comprobar invitación"
            loading={busy}
            onPress={() => void retry()}
            style={styles.inviteButton}
            variant="text"
          />
        </View>

        {!isPending &&
        creation?.status !== 'pendiente' &&
        creation?.status !== 'rechazada' &&
        creation?.status !== 'aprobada' ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Solicita crearla"
            onPress={() => navigation?.navigate('RequestOrganization')}
            style={styles.createLink}
          >
            <Icon name="business-outline" color={colors.primary} size={24} />
            <View style={styles.panelText}>
              <Text style={styles.panelBody}>¿Tu empresa aún no usa Nexo Casos?</Text>
              <Text style={styles.createLinkText}>Solicita crearla</Text>
            </View>
            <Icon name="chevron-forward" color={colors.primary} size={18} />
          </Pressable>
        ) : null}

        <View style={styles.spacer} />
        <Button
          label="Cerrar sesión"
          variant="text"
          onPress={() => confirmLogout(() => void logout())}
        />
      </KeyboardFormScrollView>
    </ScreenContainer>
  )
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    gap: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
  },
  steps: { gap: spacing.sm },
  line: { flexDirection: 'row', alignItems: 'center' },
  lineStart: { width: 14, height: 14, borderRadius: radius.pill, backgroundColor: colors.ink },
  lineSegment: {
    flex: 1,
    height: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.track,
    overflow: 'hidden',
  },
  lineDone: { marginHorizontal: -2, backgroundColor: colors.primary },
  lineFill: { height: 6, backgroundColor: colors.primary },
  lineEnd: {
    width: 14,
    height: 14,
    borderRadius: radius.pill,
    borderWidth: 3,
    borderColor: colors.sky,
    backgroundColor: colors.background,
  },
  lineEndDone: { backgroundColor: colors.primary },
  stepLabels: { flexDirection: 'row', justifyContent: 'space-between' },
  stepLabel: { ...typography.caption, fontFamily: fonts.semibold, color: colors.textMuted },
  email: { color: colors.text, fontFamily: fonts.semibold },
  description: { color: colors.textMuted, ...typography.body },
  errorButton: { minHeight: 44, justifyContent: 'center' },
  error: { color: colors.error, ...typography.body },
  panel: {
    gap: spacing.base,
    padding: spacing.md + 2,
    borderRadius: radius.xl,
    backgroundColor: colors.surfaceMuted,
  },
  pendingPanel: { backgroundColor: colors.primarySoft },
  rejectedPanel: { backgroundColor: colors.dangerSoft },
  approvedPanel: { backgroundColor: colors.successSoft },
  createLink: {
    minHeight: 76,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.primary,
    borderRadius: radius.xl,
    padding: spacing.md,
  },
  createLinkText: { ...typography.body, color: colors.primary, fontFamily: fonts.bold },
  panelHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.base },
  panelText: { flex: 1, gap: 2 },
  panelTitle: { ...typography.heading, color: colors.text, flexShrink: 1 },
  pendingTitle: { ...typography.heading, color: colors.primaryDark },
  panelBody: { ...typography.body, color: colors.text },
  iconTile: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
  },
  iconTileOnSoft: { backgroundColor: colors.background },
  iconTileCode: { backgroundColor: colors.primarySoft },
  iconTileInvite: { backgroundColor: colors.skySoft },
  codeInput: {
    minHeight: 56,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.md,
    fontFamily: fonts.bold,
    fontSize: 22,
    letterSpacing: 4,
    textAlign: 'center',
    color: colors.text,
  },
  panelButton: { minHeight: 52 },
  inviteButton: { minHeight: 52, backgroundColor: colors.background },
  spacer: { flex: 1 },
})
