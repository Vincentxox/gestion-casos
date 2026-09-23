import { useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { Button } from '@/components/ui/Button'
import { FormField } from '@/components/forms/FormField'
import { KeyboardFormScrollView } from '@/components/layout/KeyboardFormScrollView'
import { useAreas } from '@/features/areas/useAreas'
import { APP_ROLES, ROLE_LABELS, type AppRole } from '@/features/auth/types'
import { useAuthStore } from '@/store/authStore'
import { colors, radius, spacing } from '@/theme/tokens'

import { formatInvitationNotice } from '../invitationNotice'
import { invitationSchema } from '../invitationSchemas'
import { useCreateInvitation, useInvitations, useRevokeInvitation } from '../useInvitations'

export function InvitationsScreen() {
  const organizationName = useAuthStore((state) => state.profile?.organizationName)
  const invitations = useInvitations()
  const areas = useAreas()
  const create = useCreateInvitation()
  const revoke = useRevokeInvitation()
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<AppRole>('solicitante')
  const [areaId, setAreaId] = useState<string | null>(null)

  async function shareNotice(invitationEmail: string, invitationRole: AppRole) {
    if (!organizationName?.trim()) {
      Alert.alert('No fue posible compartir', 'No se pudo identificar el nombre de la empresa.')
      return
    }
    try {
      await Share.share({
        message: formatInvitationNotice({
          organizationName,
          role: invitationRole,
          email: invitationEmail,
        }),
      })
    } catch {
      Alert.alert('No fue posible compartir', 'Inténtalo de nuevo desde la invitación registrada.')
    }
  }

  async function submit() {
    const result = invitationSchema.safeParse({ email, role, areaId })
    if (!result.success) {
      Alert.alert('Revisa la invitación', result.error.issues[0]?.message ?? 'Datos inválidos')
      return
    }
    if (role === 'tecnico' && areas.data?.find((area) => area.id === areaId)?.kind !== 'tecnica') {
      Alert.alert('Área incorrecta', 'Un técnico debe pertenecer a un área técnica.')
      return
    }
    try {
      await create.mutateAsync(result.data)
      setEmail('')
      Alert.alert(
        'Invitación creada',
        'La persona quedará vinculada al registrarse y confirmar este correo. Comparte el aviso para informarle.',
        [
          { text: 'Después', style: 'cancel' },
          {
            text: 'Compartir aviso',
            onPress: () => void shareNotice(result.data.email, result.data.role),
          },
        ],
      )
    } catch (error) {
      Alert.alert(
        'No fue posible invitar',
        error instanceof Error ? error.message : 'Inténtalo de nuevo.',
      )
    }
  }

  function confirmRevoke(id: string) {
    Alert.alert('Revocar invitación', '¿Deseas cancelar esta invitación?', [
      { text: 'Volver', style: 'cancel' },
      {
        text: 'Revocar',
        style: 'destructive',
        onPress: () =>
          void revoke
            .mutateAsync(id)
            .catch(() => Alert.alert('No fue posible revocar la invitación.')),
      },
    ])
  }

  return (
    <SafeAreaView edges={['bottom']} style={styles.safeArea}>
      <KeyboardFormScrollView contentContainerStyle={styles.content}>
        <Text accessibilityRole="header" style={styles.title}>
          Invitaciones
        </Text>
        <Text style={styles.muted}>
          La persona entra automáticamente al registrarse y confirmar el correo invitado. Comparte
          el aviso para informarle; la app no envía correos por sí sola.
        </Text>
        <View style={styles.card}>
          <FormField
            label="Correo electrónico"
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />
          <Text style={styles.label}>Rol</Text>
          <ScrollView
            horizontal
            contentContainerStyle={styles.options}
            showsHorizontalScrollIndicator={false}
          >
            {APP_ROLES.map((option) => (
              <Choice
                key={option}
                label={ROLE_LABELS[option]}
                selected={role === option}
                onPress={() => setRole(option)}
              />
            ))}
          </ScrollView>
          <Text style={styles.label}>Área</Text>
          <ScrollView
            horizontal
            contentContainerStyle={styles.options}
            showsHorizontalScrollIndicator={false}
          >
            <Choice label="Sin área" selected={areaId === null} onPress={() => setAreaId(null)} />
            {(areas.data ?? [])
              .filter((area) => area.isActive)
              .map((area) => (
                <Choice
                  key={area.id}
                  label={`${area.name} · ${area.kind === 'tecnica' ? 'Técnica' : 'Solicitante'}`}
                  selected={areaId === area.id}
                  onPress={() => setAreaId(area.id)}
                />
              ))}
          </ScrollView>
          <Button
            label="Crear invitación"
            loading={create.isPending}
            onPress={() => void submit()}
          />
        </View>
        <Text style={styles.sectionTitle}>Invitaciones registradas</Text>
        {invitations.isLoading ? <ActivityIndicator color={colors.primary} /> : null}
        {invitations.error ? (
          <Button label="Reintentar" onPress={() => void invitations.refetch()} />
        ) : null}
        {invitations.data?.length === 0 ? (
          <Text style={styles.muted}>Todavía no hay invitaciones.</Text>
        ) : null}
        {invitations.data?.map((invitation) => {
          const pending = !invitation.acceptedAt && !invitation.revokedAt
          return (
            <View key={invitation.id} style={styles.card}>
              <Text style={styles.email}>{invitation.email}</Text>
              <Text style={styles.muted}>
                {ROLE_LABELS[invitation.role]} ·{' '}
                {pending ? 'Pendiente' : invitation.acceptedAt ? 'Aceptada' : 'Revocada'}
              </Text>
              {pending ? (
                <View style={styles.actions}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Compartir aviso de invitación con ${invitation.email}`}
                    onPress={() => void shareNotice(invitation.email, invitation.role)}
                    style={styles.share}
                  >
                    <Text style={styles.shareText}>Compartir aviso</Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Revocar invitación de ${invitation.email}`}
                    onPress={() => confirmRevoke(invitation.id)}
                    style={styles.revoke}
                  >
                    <Text style={styles.revokeText}>Revocar</Text>
                  </Pressable>
                </View>
              ) : null}
            </View>
          )
        })}
      </KeyboardFormScrollView>
    </SafeAreaView>
  )
}

function Choice({
  label,
  selected,
  onPress,
}: {
  label: string
  selected: boolean
  onPress: () => void
}) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      onPress={onPress}
      style={[styles.choice, selected && styles.selected]}
    >
      <Text style={styles.choiceText}>{label}</Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  content: { flexGrow: 1, gap: spacing.md, padding: spacing.lg },
  title: { color: colors.text, fontSize: 28, fontWeight: '800' },
  muted: { color: colors.textMuted, lineHeight: 21 },
  label: { color: colors.text, fontWeight: '700' },
  sectionTitle: { color: colors.text, fontSize: 20, fontWeight: '800' },
  card: {
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  options: { gap: spacing.sm, paddingVertical: spacing.sm },
  choice: {
    minHeight: 44,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
  },
  selected: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  choiceText: { color: colors.text, fontWeight: '700' },
  email: { color: colors.text, fontWeight: '800' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  share: { minHeight: 44, justifyContent: 'center' },
  shareText: { color: colors.primary, fontWeight: '700' },
  revoke: { minHeight: 44, justifyContent: 'center' },
  revokeText: { color: colors.error, fontWeight: '700' },
})
