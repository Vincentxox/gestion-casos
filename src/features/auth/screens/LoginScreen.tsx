import { zodResolver } from '@hookform/resolvers/zod'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { Controller, useForm } from 'react-hook-form'
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'

import { PrimaryButton } from '@/components/buttons/PrimaryButton'
import { FormField } from '@/components/forms/FormField'
import { loginSchema, type LoginInput } from '@/features/auth/schemas'
import type { AuthStackParamList } from '@/navigation/types'
import { useAuthStore } from '@/store/authStore'
import { colors, radius, spacing } from '@/theme/tokens'

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>

export function LoginScreen({ navigation }: Props) {
  const login = useAuthStore((state) => state.login)
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
    } catch {
      Alert.alert(
        'No fue posible iniciar sesión',
        'Verifica tus credenciales y tu conexión a internet.',
      )
    }
  })

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.flex}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.brand}>
          <View accessibilityElementsHidden style={styles.logo}>
            <Text style={styles.logoText}>GC</Text>
          </View>
          <Text accessibilityRole="header" style={styles.title}>
            Gestión de casos
          </Text>
          <Text style={styles.subtitle}>Accede de forma segura a tus casos y documentos.</Text>
        </View>

        <View style={styles.card}>
          <Text accessibilityRole="header" style={styles.cardTitle}>
            Iniciar sesión
          </Text>

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

          <PrimaryButton label="Ingresar" loading={isSubmitting} onPress={() => void submit()} />

          <Pressable
            accessibilityRole="button"
            onPress={() => navigation.navigate('Register')}
            style={styles.linkButton}
          >
            <Text style={styles.linkText}>¿No tienes una cuenta? Crear cuenta</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
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
    width: 72,
    height: 72,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.lg,
    backgroundColor: colors.primary,
  },
  logoText: {
    color: colors.white,
    fontSize: 26,
    fontWeight: '800',
  },
  title: {
    color: colors.text,
    fontSize: 28,
    fontWeight: '800',
  },
  subtitle: {
    maxWidth: 320,
    color: colors.textMuted,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
  card: {
    gap: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    padding: spacing.lg,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  cardTitle: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '700',
  },
  linkButton: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  linkText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
})
