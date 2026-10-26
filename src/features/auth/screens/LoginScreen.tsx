import { AppFeedback } from '@/components/feedback/AppFeedback'
import { zodResolver } from '@hookform/resolvers/zod'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import Constants from 'expo-constants'
import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { Button } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'
import { FormField } from '@/components/forms/FormField'
import { KeyboardFormScrollView } from '@/components/layout/KeyboardFormScrollView'
import { getAuthErrorMessage } from '@/features/auth/authErrors'
import { AuthBrand, AuthHeading } from '@/features/auth/components/AuthHeading'
import { GoogleMark } from '@/features/auth/components/GoogleMark'
import { loginSchema, type LoginInput } from '@/features/auth/schemas'
import type { AuthStackParamList } from '@/navigation/types'
import { useAuthStore } from '@/store/authStore'
import { colors, fonts, radius, spacing, typography } from '@/theme/tokens'

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>

export function LoginScreen({ navigation }: Props) {
  const login = useAuthStore((state) => state.login)
  const loginWithGoogle = useAuthStore((state) => state.loginWithGoogle)
  const initialize = useAuthStore((state) => state.initialize)
  const initializationError = useAuthStore((state) => state.initializationError)
  const recoveryLinkError = useAuthStore((state) => state.recoveryLinkError)
  const accountDeletedNotice = useAuthStore((state) => state.accountDeletedNotice)
  const clearAccountDeletedNotice = useAuthStore((state) => state.clearAccountDeletedNotice)
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false)
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
    getValues,
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  })

  const submit = handleSubmit(async (values) => {
    clearAccountDeletedNotice()
    try {
      await login(values.email, values.password)
    } catch (error) {
      AppFeedback.show(
        'No fue posible iniciar sesión',
        getAuthErrorMessage(
          error,
          'No fue posible iniciar sesión. Verifica tus datos e inténtalo nuevamente.',
        ),
        { tone: 'error' },
      )
    }
  })

  const submitGoogle = async () => {
    clearAccountDeletedNotice()
    try {
      setIsGoogleSubmitting(true)
      await loginWithGoogle()
    } catch (error) {
      AppFeedback.show(
        'No fue posible iniciar sesión con Google',
        getAuthErrorMessage(
          error,
          'Google no pudo completar el acceso. Verifica la configuración e inténtalo nuevamente.',
        ),
        { tone: 'error' },
      )
    } finally {
      setIsGoogleSubmitting(false)
    }
  }

  return (
    <SafeAreaView edges={['top', 'bottom', 'left', 'right']} style={styles.flex}>
      <KeyboardFormScrollView contentContainerStyle={styles.scrollContent} style={styles.flex}>
        <View style={styles.main}>
          <AuthBrand />

          <View style={styles.headingBlock}>
            {accountDeletedNotice ? (
              <View accessibilityRole="alert" style={styles.deletedNotice}>
                <Icon name="checkmark-circle" color={colors.success} size={24} />
                <View style={styles.deletedNoticeCopy}>
                  <Text style={styles.deletedNoticeTitle}>Tu cuenta fue eliminada</Text>
                  <Text style={styles.deletedNoticeBody}>Gracias por usar Nexo Casos.</Text>
                </View>
              </View>
            ) : null}
            <AuthHeading title="Inicia sesión" />

            {initializationError ? (
              <View accessibilityLiveRegion="polite" style={styles.sessionNotice}>
                <Text style={styles.sessionNoticeText}>{initializationError}</Text>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => void initialize()}
                  style={styles.retryButton}
                >
                  <Text style={styles.retryButtonText}>Reintentar</Text>
                </Pressable>
              </View>
            ) : null}
            {recoveryLinkError ? (
              <Text accessibilityLiveRegion="polite" style={styles.sessionNoticeText}>
                {recoveryLinkError}
              </Text>
            ) : null}
          </View>

          <View style={styles.form}>
            <Controller
              control={control}
              name="email"
              render={({ field: { onBlur, onChange, value } }) => (
                <FormField
                  autoCapitalize="none"
                  autoComplete="email"
                  error={errors.email?.message}
                  highContrastBorder
                  keyboardType="email-address"
                  label="Correo electrónico"
                  onBlur={onBlur}
                  onChangeText={onChange}
                  placeholder="nombre@empresa.com"
                  returnKeyType="next"
                  value={value}
                  variant="outlined"
                />
              )}
            />

            <Controller
              control={control}
              name="password"
              render={({ field: { onBlur, onChange, value } }) => (
                <FormField
                  autoCapitalize="none"
                  autoComplete="current-password"
                  error={errors.password?.message}
                  highContrastBorder
                  label="Contraseña"
                  onBlur={onBlur}
                  onChangeText={onChange}
                  onSubmitEditing={() => void submit()}
                  placeholder="Ingresa tu contraseña"
                  returnKeyType="done"
                  secureTextEntry
                  value={value}
                  variant="outlined"
                />
              )}
            />
          </View>

          <Pressable
            accessibilityRole="button"
            onPress={() => navigation.navigate('ForgotPassword', { email: getValues('email') })}
            style={styles.forgotLink}
          >
            <Text style={styles.forgotText}>¿Olvidaste tu contraseña?</Text>
          </Pressable>

          <View style={styles.actions}>
            <Button
              disabled={isGoogleSubmitting}
              label="Ingresar"
              loading={isSubmitting}
              onPress={() => {
                clearAccountDeletedNotice()
                void submit()
              }}
              style={styles.primaryButton}
            />

            <View accessibilityElementsHidden style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>o</Text>
              <View style={styles.dividerLine} />
            </View>

            <Pressable
              accessibilityRole="button"
              accessibilityState={{ busy: isGoogleSubmitting, disabled: isGoogleSubmitting }}
              disabled={isGoogleSubmitting || isSubmitting}
              onPress={() => void submitGoogle()}
              style={({ pressed }) => [
                styles.googleButton,
                pressed ? styles.googleButtonPressed : null,
                isGoogleSubmitting || isSubmitting ? styles.googleButtonDisabled : null,
              ]}
            >
              <GoogleMark />
              <Text style={styles.googleButtonText}>
                {isGoogleSubmitting ? 'Conectando…' : 'Continuar con Google'}
              </Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.footer}>
          <Pressable
            accessibilityLabel="¿No tienes una cuenta? Crear cuenta"
            accessibilityRole="button"
            onPress={() => {
              clearAccountDeletedNotice()
              navigation.navigate('Register')
            }}
            style={styles.linkButton}
          >
            <Text style={styles.linkText}>
              ¿No tienes una cuenta? <Text style={styles.linkStrong}>Crear cuenta</Text>
            </Text>
          </Pressable>
          <Text style={styles.version}>versión {Constants.expoConfig?.version ?? '—'}</Text>
        </View>
      </KeyboardFormScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    gap: spacing.md,
  },
  main: {
    flex: 1,
    justifyContent: 'center',
    gap: spacing.lg,
  },
  headingBlock: {
    gap: spacing.md,
    paddingTop: spacing.base,
    marginTop: -spacing.base,
  },
  deletedNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radius.lg,
    backgroundColor: colors.successSoft,
    padding: spacing.md,
  },
  deletedNoticeCopy: { flex: 1, gap: spacing.xs },
  deletedNoticeTitle: { ...typography.body, fontFamily: fonts.bold, color: colors.success },
  deletedNoticeBody: { ...typography.caption, color: colors.text },
  form: {
    gap: spacing.md,
  },
  actions: {
    gap: spacing.base,
  },
  primaryButton: {
    minHeight: 56,
  },
  sessionNotice: {
    gap: spacing.sm,
    borderRadius: radius.lg,
    backgroundColor: colors.warningSoft,
    padding: spacing.md,
  },
  sessionNoticeText: {
    color: colors.text,
    ...typography.caption,
  },
  retryButton: {
    alignSelf: 'flex-start',
    minHeight: 44,
    justifyContent: 'center',
  },
  retryButtonText: {
    color: colors.primary,
    ...typography.caption,
  },
  footer: { gap: spacing.xs },
  forgotLink: { minHeight: 44, alignSelf: 'flex-end', justifyContent: 'center' },
  forgotText: { ...typography.body, color: colors.primary, fontFamily: fonts.semibold },
  version: { ...typography.caption, color: colors.textMuted, textAlign: 'center' },
  linkButton: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.base,
  },
  dividerLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
  },
  dividerText: {
    color: colors.textMuted,
    ...typography.caption,
  },
  googleButton: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.base,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.inputBorder,
  },
  googleButtonPressed: {
    backgroundColor: colors.primarySoft,
  },
  googleButtonDisabled: {
    opacity: 0.55,
  },
  googleButtonText: {
    color: colors.text,
    fontFamily: fonts.semibold,
    fontSize: 16,
  },
  linkText: {
    color: colors.textMuted,
    ...typography.body,
    textAlign: 'center',
  },
  linkStrong: {
    color: colors.primary,
    fontFamily: fonts.bold,
  },
})
