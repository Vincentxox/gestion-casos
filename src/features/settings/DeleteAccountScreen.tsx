import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { useEffect, useRef, useState } from 'react'
import {
  BackHandler,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { useFeedback } from '@/components/feedback/AppFeedback'
import { FormField } from '@/components/forms/FormField'
import { Button } from '@/components/ui/Button'
import { Icon, type IconName } from '@/components/ui/Icon'
import type { ProfileStackParamList } from '@/navigation/types'
import { useAuthStore } from '@/store/authStore'
import { colors, fonts, radius, spacing, typography } from '@/theme/tokens'

import {
  AccountDeletionBlockedError,
  AccountDeletionNetworkError,
  deleteOwnAccount,
  isSoleOrganizationMember,
} from './accountDeletionService'

type Props = NativeStackScreenProps<ProfileStackParamList, 'DeleteAccount'>
type RetryError = 'network' | 'generic' | null

const removedItems = [
  'Tu acceso: no podrás volver a entrar con este correo, pero sí crear una cuenta nueva.',
  'Tu nombre, tu foto, tu área y tu rol.',
  'Tus avisos y los teléfonos registrados para recibirlos.',
  'Tus pedidos para unirte a una empresa.',
]

const preservedItems = [
  'Las solicitudes, el historial, los reportes y sus PDF.',
  'Las firmas que hiciste, porque son la evidencia de cada reporte.',
  'Tu nombre en los casos donde trabajaste, para que se sepa quién hizo qué.',
]

function ExplanationRow({ icon, color, text }: { icon: IconName; color: string; text: string }) {
  return (
    <View style={styles.explanationRow}>
      <Icon name={icon} color={color} size={18} />
      <Text style={styles.explanationText}>{text}</Text>
    </View>
  )
}

export function DeleteAccountScreen({ navigation }: Props) {
  const profile = useAuthStore((state) => state.profile)
  const completeAccountDeletion = useAuthStore((state) => state.completeAccountDeletion)
  const { alert } = useFeedback()
  const [confirmation, setConfirmation] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [retryError, setRetryError] = useState<RetryError>(null)
  const [soleMember, setSoleMember] = useState(false)
  const inFlight = useRef(false)
  const confirmed = confirmation === 'ELIMINAR'

  useEffect(() => {
    if (!profile?.organizationId) return
    let active = true
    void isSoleOrganizationMember(profile.organizationId)
      .then((value) => {
        if (active) setSoleMember(value)
      })
      .catch(() => {
        // This is informative only; do not block deletion if the count is unavailable.
      })
    return () => {
      active = false
    }
  }, [profile?.organizationId])

  useEffect(() => {
    navigation.setOptions({ headerBackVisible: !submitting, gestureEnabled: !submitting })
    const hardwareBack = BackHandler.addEventListener('hardwareBackPress', () => submitting)
    return () => hardwareBack.remove()
  }, [navigation, submitting])

  async function submitDeletion() {
    if (!confirmed || inFlight.current) return
    inFlight.current = true
    setSubmitting(true)
    setRetryError(null)
    try {
      await deleteOwnAccount()
      setConfirmation('')
      await completeAccountDeletion()
    } catch (error) {
      if (error instanceof AccountDeletionBlockedError) {
        void alert({
          title: 'Aún no puedes eliminar tu cuenta',
          message: error.message,
          tone: 'danger',
          icon: 'warning-outline',
        })
      } else {
        setRetryError(error instanceof AccountDeletionNetworkError ? 'network' : 'generic')
      }
    } finally {
      inFlight.current = false
      setSubmitting(false)
    }
  }

  return (
    <SafeAreaView edges={['bottom', 'left', 'right']} style={styles.root}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.root}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          style={styles.scroll}
        >
          <View style={styles.warning}>
            <Icon name="warning-outline" color={colors.error} size={24} />
            <View style={styles.warningCopy}>
              <Text style={styles.warningTitle}>No se puede deshacer</Text>
              <Text style={styles.body}>
                Tu cuenta se elimina de inmediato y se cierra tu sesión en este teléfono.
              </Text>
            </View>
          </View>

          {soleMember && profile?.organizationName ? (
            <View style={styles.soleMemberNotice}>
              <Icon name="information-circle-outline" color={colors.info} size={24} />
              <Text style={styles.soleMemberText}>
                Eres la única persona en {profile.organizationName}. La empresa quedará inactiva y
                sus datos se guardan.
              </Text>
            </View>
          ) : null}

          <View style={styles.section}>
            <Text accessibilityRole="header" style={styles.sectionTitle}>
              Se borra
            </Text>
            {removedItems.map((text) => (
              <ExplanationRow key={text} icon="close" color={colors.error} text={text} />
            ))}
          </View>

          <View style={styles.section}>
            <Text accessibilityRole="header" style={styles.sectionTitle}>
              {profile?.organizationName ? `${profile.organizationName} conserva` : 'Se conserva'}
            </Text>
            {preservedItems.map((text) => (
              <ExplanationRow
                key={text}
                icon="archive-outline"
                color={colors.textMuted}
                text={text}
              />
            ))}
          </View>

          <Text style={styles.note}>Son registros del trabajo de tu empresa.</Text>
          <Pressable
            accessibilityRole="link"
            onPress={() =>
              void Linking.openURL('https://vincentxox.github.io/gestion-casos/privacidad/')
            }
            style={styles.privacyLink}
          >
            <Text style={styles.privacyText}>Política de privacidad</Text>
          </Pressable>
        </ScrollView>

        <View style={styles.footer}>
          {retryError ? (
            <View accessibilityRole="alert" style={styles.retryNotice}>
              <Text style={styles.retryText}>
                {retryError === 'network'
                  ? 'No hay conexión. Tu cuenta sigue igual.'
                  : 'No terminamos de eliminar tu cuenta. Inténtalo de nuevo.'}
              </Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => void submitDeletion()}
                style={styles.retryButton}
              >
                <Text style={styles.retryButtonText}>Reintentar</Text>
              </Pressable>
            </View>
          ) : null}
          <FormField
            accessibilityLabel="Escribe ELIMINAR para confirmar"
            autoCapitalize="characters"
            autoCorrect={false}
            editable={!submitting}
            label="Escribe ELIMINAR para confirmar"
            onChangeText={setConfirmation}
            value={confirmation}
          />
          {confirmed ? (
            <View style={styles.matchRow}>
              <Icon name="checkmark" color={colors.success} size={18} />
              <Text style={styles.matchText}>Coincide</Text>
            </View>
          ) : (
            <Text style={styles.helperText}>Escríbelo en mayúsculas.</Text>
          )}
          <Button
            disabled={!confirmed}
            label={submitting ? 'Eliminando…' : 'Eliminar mi cuenta'}
            loading={submitting}
            onPress={() => void submitDeletion()}
            showLabelWhileLoading
            style={styles.deleteButton}
            variant="destructive"
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  scroll: { flex: 1 },
  content: { gap: spacing.lg, padding: spacing.lg, paddingBottom: spacing.xl },
  warning: {
    flexDirection: 'row',
    gap: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.dangerSoft,
    padding: spacing.md,
  },
  warningCopy: { flex: 1, gap: spacing.xs },
  warningTitle: { ...typography.heading, color: colors.error },
  body: { ...typography.body, color: colors.text },
  soleMemberNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.infoSoft,
    padding: spacing.md,
  },
  soleMemberText: { ...typography.caption, color: colors.ink, flex: 1 },
  section: { gap: spacing.md },
  sectionTitle: { ...typography.title, color: colors.ink },
  explanationRow: { flexDirection: 'row', gap: spacing.base, alignItems: 'flex-start' },
  explanationText: { ...typography.body, color: colors.text, flex: 1 },
  note: { ...typography.caption, color: colors.textMuted },
  privacyLink: { minHeight: 44, alignSelf: 'flex-start', justifyContent: 'center' },
  privacyText: { ...typography.body, color: colors.primary, fontFamily: fonts.semibold },
  footer: {
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
  helperText: { ...typography.caption, color: colors.textMuted },
  matchRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  matchText: { ...typography.caption, color: colors.success },
  deleteButton: { minHeight: 52 },
  retryNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.dangerSoft,
    padding: spacing.sm,
  },
  retryText: { ...typography.caption, color: colors.error, flex: 1 },
  retryButton: { minHeight: 44, justifyContent: 'center' },
  retryButtonText: { ...typography.label, color: colors.primary },
})
