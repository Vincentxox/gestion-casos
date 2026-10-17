import { AppFeedback } from '@/components/feedback/AppFeedback'
import { zodResolver } from '@hookform/resolvers/zod'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { FontAwesome } from '@expo/vector-icons'
import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { Button } from '@/components/ui/Button'
import { FormField } from '@/components/forms/FormField'
import { KeyboardFormScrollView } from '@/components/layout/KeyboardFormScrollView'
import { getAuthErrorMessage } from '@/features/auth/authErrors'
import { AuthBrand, AuthHeading } from '@/features/auth/components/AuthHeading'
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
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false)
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  })

  const submit = handleSubmit(async (values) => {
    try {
      await login(values.email, values.password)
    } catch (error) {
      AppFeedback.show(
        'No fue posible iniciar sesión',
        getAuthErrorMessage(
          error,
          'No fue posible iniciar sesión. Verifica tus datos e inténtalo nuevamente.',
        ),
      )
    }
  })

  const submitGoogle = async () => {
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
      )
    } finally {
      setIsGoogleSubmitting(false)
    }
  }

  return (
    <SafeAreaView edges={['top', 'bottom', 'left', 'right']} style={styles.flex}>
      <KeyboardFormScrollView contentContainerStyle={styles.scrollContent} style={styles.flex}>
        <AuthBrand />

        <View style={styles.headingBlock}>
          <AuthHeading title="Inicia sesión">
            Accede de forma segura a tus casos y documentos.
          </AuthHeading>

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
                keyboardType="email-address"
                label="Correo electrónico"
                onBlur={onBlur}
                onChangeText={onChange}
                placeholder="nombre@empresa.com"
                returnKeyType="next"
                value={value}
                variant="filled"
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
                label="Contraseña"
                onBlur={onBlur}
                onChangeText={onChange}
                onSubmitEditing={() => void submit()}
                placeholder="Ingresa tu contraseña"
                returnKeyType="done"
                secureTextEntry
                value={value}
                variant="filled"
              />
            )}
          />
        </View>

        <View style={styles.actions}>
          <Button
            disabled={isGoogleSubmitting}
            label="Ingresar"
            loading={isSubmitting}
            onPress={() => void submit()}
            style={styles.primaryButton}
          />

          <View accessibilityElementsHidden style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>o continúa con</Text>
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
            <FontAwesome color="#4285F4" name="google" size={20} />
            <Text style={styles.googleButtonText}>
              {isGoogleSubmitting ? 'Conectando…' : 'Continuar con Google'}
            </Text>
          </Pressable>
        </View>

        <View style={styles.spacer} />

        <Pressable
          accessibilityLabel="¿No tienes una cuenta? Crear cuenta"
          accessibilityRole="button"
          onPress={() => navigation.navigate('Register')}
          style={styles.linkButton}
        >
          <Text style={styles.linkText}>
            ¿No tienes una cuenta? <Text style={styles.linkStrong}>Crear cuenta</Text>
          </Text>
        </Pressable>
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
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
    gap: spacing.roomy,
  },
  headingBlock: {
    gap: spacing.md,
    paddingTop: spacing.base,
  },
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
  spacer: {
    flex: 1,
  },
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
    backgroundColor: colors.surfaceMuted,
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
