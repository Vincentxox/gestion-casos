import { zodResolver } from '@hookform/resolvers/zod'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { Controller, useForm } from 'react-hook-form'
import { Alert, StyleSheet, Text, View } from 'react-native'

import { PrimaryButton } from '@/components/buttons/PrimaryButton'
import { FormField } from '@/components/forms/FormField'
import { KeyboardFormScrollView } from '@/components/layout/KeyboardFormScrollView'
import { usesMaintenanceDataModel } from '@/config/dataModel'
import { getAuthErrorMessage } from '@/features/auth/authErrors'
import { registrationSchema, type RegistrationInput } from '@/features/auth/schemas'
import type { AuthStackParamList } from '@/navigation/types'
import { useAuthStore } from '@/store/authStore'
import { colors, radius, spacing } from '@/theme/tokens'

type Props = NativeStackScreenProps<AuthStackParamList, 'Register'>

export function RegisterScreen({ navigation }: Props) {
  const maintenanceMode = usesMaintenanceDataModel()
  const register = useAuthStore((state) => state.register)
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegistrationInput>({
    resolver: zodResolver(registrationSchema),
    defaultValues: {
      fullName: '',
      email: '',
      password: '',
      passwordConfirmation: '',
    },
  })

  const submit = handleSubmit(async (values) => {
    try {
      const hasSession = await register(values)

      if (!hasSession) {
        Alert.alert(
          'Confirma tu correo',
          'Enviamos un enlace de verificación a tu correo electrónico.',
          [{ text: 'Entendido', onPress: () => navigation.navigate('Login') }],
        )
      }
    } catch (error) {
      Alert.alert(
        'No fue posible crear la cuenta',
        getAuthErrorMessage(
          error,
          'No fue posible crear la cuenta. Revisa los datos e inténtalo nuevamente.',
        ),
      )
    }
  })

  return (
    <KeyboardFormScrollView contentContainerStyle={styles.scrollContent} style={styles.flex}>
      <View style={styles.heading}>
        <Text accessibilityRole="header" style={styles.title}>
          Crear cuenta
        </Text>
        <Text style={styles.subtitle}>
          {maintenanceMode
            ? 'Completa tus datos. La cuenta nueva inicia como visualizador; un administrador podrá cambiar su rol.'
            : 'Completa tus datos. Tu rol será asignado de forma segura por un administrador.'}
        </Text>
      </View>

      <View style={styles.card}>
        <Controller
          control={control}
          name="fullName"
          render={({ field: { onBlur, onChange, value } }) => (
            <FormField
              autoCapitalize="words"
              autoComplete="name"
              error={errors.fullName?.message}
              label="Nombre completo"
              onBlur={onBlur}
              onChangeText={onChange}
              placeholder="Nombre y apellido"
              value={value}
            />
          )}
        />

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
              autoComplete="new-password"
              error={errors.password?.message}
              label="Contraseña"
              onBlur={onBlur}
              onChangeText={onChange}
              placeholder="Mínimo 8 caracteres"
              secureTextEntry
              value={value}
            />
          )}
        />

        <Controller
          control={control}
          name="passwordConfirmation"
          render={({ field: { onBlur, onChange, value } }) => (
            <FormField
              autoCapitalize="none"
              autoComplete="new-password"
              error={errors.passwordConfirmation?.message}
              label="Confirmar contraseña"
              onBlur={onBlur}
              onChangeText={onChange}
              onSubmitEditing={() => void submit()}
              placeholder="Repite tu contraseña"
              returnKeyType="done"
              secureTextEntry
              value={value}
            />
          )}
        />

        <PrimaryButton label="Crear cuenta" loading={isSubmitting} onPress={() => void submit()} />
      </View>
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
    padding: spacing.lg,
    gap: spacing.lg,
  },
  heading: {
    gap: spacing.sm,
    paddingTop: spacing.md,
  },
  title: {
    color: colors.text,
    fontSize: 28,
    fontWeight: '800',
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 15,
    lineHeight: 22,
  },
  card: {
    gap: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    padding: spacing.lg,
  },
})
