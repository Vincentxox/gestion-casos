import { zodResolver } from '@hookform/resolvers/zod'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { FontAwesome } from '@expo/vector-icons'
import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { Alert, Image, Pressable, StyleSheet, Text, View } from 'react-native'

import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { FormField } from '@/components/forms/FormField'
import { KeyboardFormScrollView } from '@/components/layout/KeyboardFormScrollView'
import { getAuthErrorMessage } from '@/features/auth/authErrors'
import { loginSchema, type LoginInput } from '@/features/auth/schemas'
import type { AuthStackParamList } from '@/navigation/types'
import { useAuthStore } from '@/store/authStore'
import { colors, elevation, radius, spacing, typography } from '@/theme/tokens'

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>

const logoSource = require('../../../../assets/logo-mark.png')

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
      Alert.alert(
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
      Alert.alert(
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
    <KeyboardFormScrollView contentContainerStyle={styles.scrollContent} style={styles.flex}>
      <View style={styles.brand}>
        <Image
          accessibilityLabel="Logo de Nexo Casos"
          resizeMode="contain"
          source={logoSource}
          style={styles.logo}
        />
        <Text accessibilityRole="header" style={styles.title}>
          Nexo Casos
        </Text>
        <Text style={styles.subtitle}>Accede de forma segura a tus casos y documentos.</Text>
      </View>

      <Card contentStyle={styles.card}>
        <Text accessibilityRole="header" style={styles.cardTitle}>
          Iniciar sesión
        </Text>

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
            />
          )}
        />

        <Button
          disabled={isGoogleSubmitting}
          label="Ingresar"
          loading={isSubmitting}
          onPress={() => void submit()}
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

        <Pressable
          accessibilityRole="button"
          onPress={() => navigation.navigate('Register')}
          style={styles.linkButton}
        >
          <Text style={styles.linkText}>¿No tienes una cuenta? Crear cuenta</Text>
        </Pressable>
      </Card>
    </KeyboardFormScrollView>
  )
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: spacing.lg,
    gap: spacing.xl,
  },
  brand: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  logo: {
    width: 88,
    height: 88,
  },
  title: {
    color: colors.text,
    ...typography.display,
  },
  subtitle: {
    maxWidth: 320,
    color: colors.textMuted,
    ...typography.body,
    textAlign: 'center',
  },
  card: {
    gap: spacing.md,
    padding: spacing.lg,
    ...elevation.md,
  },
  cardTitle: {
    color: colors.text,
    ...typography.title,
  },
  sessionNotice: {
    gap: spacing.sm,
    borderRadius: radius.md,
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
  linkButton: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
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
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  googleButtonPressed: {
    backgroundColor: colors.primarySoft,
  },
  googleButtonDisabled: {
    opacity: 0.55,
  },
  googleButtonText: {
    color: colors.text,
    ...typography.heading,
  },
  linkText: {
    color: colors.primary,
    ...typography.caption,
    textAlign: 'center',
  },
})
