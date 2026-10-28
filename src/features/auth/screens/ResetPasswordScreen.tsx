import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, useForm } from 'react-hook-form'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { AppFeedback } from '@/components/feedback/AppFeedback'
import { FormField } from '@/components/forms/FormField'
import { KeyboardFormScrollView } from '@/components/layout/KeyboardFormScrollView'
import { Button } from '@/components/ui/Button'
import { AuthBrand } from '@/features/auth/components/AuthHeading'
import { useAuthStore } from '@/store/authStore'
import { colors, fonts, spacing, typography } from '@/theme/tokens'

import { getAuthErrorMessage } from '../authErrors'
import { updatePassword } from '../authService'
import { resetPasswordSchema, type ResetPasswordInput } from '../schemas'

export function ResetPasswordScreen() {
  const finishPasswordRecovery = useAuthStore((state) => state.finishPasswordRecovery)
  const logout = useAuthStore((state) => state.logout)
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: '', passwordConfirmation: '' },
  })

  const submit = handleSubmit(async ({ password }) => {
    try {
      await updatePassword(password)
      await finishPasswordRecovery()
      AppFeedback.show('Contraseña actualizada', 'Tu contraseña se actualizó', { tone: 'success' })
    } catch (error) {
      AppFeedback.show(
        'No fue posible guardar la contraseña',
        getAuthErrorMessage(
          error,
          'No fue posible actualizar la contraseña. Inténtalo nuevamente.',
        ),
        { tone: 'error' },
      )
    }
  })

  return (
    <SafeAreaView edges={['top', 'bottom', 'left', 'right']} style={styles.flex}>
      <KeyboardFormScrollView contentContainerStyle={styles.content} style={styles.flex}>
        <View style={styles.main}>
          <AuthBrand />
          <Text accessibilityRole="header" style={styles.title}>
            Crea una contraseña nueva
          </Text>
          <Text style={styles.description}>Escribe y confirma la contraseña para continuar.</Text>
          <View style={styles.fields}>
            <Controller
              control={control}
              name="password"
              render={({ field: { onBlur, onChange, value } }) => (
                <FormField
                  autoComplete="new-password"
                  error={errors.password?.message}
                  highContrastBorder
                  label="Contraseña nueva"
                  onBlur={onBlur}
                  onChangeText={onChange}
                  secureTextEntry
                  value={value}
                  variant="outlined"
                />
              )}
            />
            <Controller
              control={control}
              name="passwordConfirmation"
              render={({ field: { onBlur, onChange, value } }) => (
                <FormField
                  autoComplete="new-password"
                  error={errors.passwordConfirmation?.message}
                  highContrastBorder
                  label="Confirmar contraseña"
                  onBlur={onBlur}
                  onChangeText={onChange}
                  secureTextEntry
                  value={value}
                  variant="outlined"
                />
              )}
            />
          </View>
          <Button label="Guardar contraseña" loading={isSubmitting} onPress={() => void submit()} />
        </View>
        <Pressable accessibilityRole="button" onPress={() => void logout()} style={styles.cancel}>
          <Text style={styles.cancelText}>Cancelar</Text>
        </Pressable>
      </KeyboardFormScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  content: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    gap: spacing.lg,
  },
  main: { flex: 1, justifyContent: 'center', gap: spacing.lg },
  title: { ...typography.display, color: colors.ink },
  description: { ...typography.body, color: colors.textMuted },
  fields: { gap: spacing.md },
  cancel: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  cancelText: { ...typography.body, fontFamily: fonts.semibold, color: colors.primary },
})
