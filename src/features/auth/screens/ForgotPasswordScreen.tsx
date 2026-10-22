import { zodResolver } from '@hookform/resolvers/zod'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { isAuthApiError } from '@supabase/supabase-js'
import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { FormField } from '@/components/forms/FormField'
import { KeyboardFormScrollView } from '@/components/layout/KeyboardFormScrollView'
import { Button } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'
import type { AuthStackParamList } from '@/navigation/types'
import { colors, fonts, radius, spacing, typography } from '@/theme/tokens'

import { requestPasswordReset } from '../authService'
import { forgotPasswordSchema, type ForgotPasswordInput } from '../schemas'

type Props = NativeStackScreenProps<AuthStackParamList, 'ForgotPassword'>

const SENT_MESSAGE =
  'Si el correo tiene una cuenta, te llegará un enlace en unos minutos. Revisa también la carpeta de spam.'
const RATE_MESSAGE = 'Espera unos minutos antes de pedir otro enlace'

export function ForgotPasswordScreen({ navigation, route }: Props) {
  const [notice, setNotice] = useState<string | null>(null)
  const [rateLimited, setRateLimited] = useState(false)
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: route.params?.email ?? '' },
  })

  const submit = handleSubmit(async ({ email }) => {
    setNotice(null)
    setRateLimited(false)
    try {
      await requestPasswordReset(email)
      setNotice(SENT_MESSAGE)
    } catch (error) {
      const limited =
        isAuthApiError(error) &&
        (error.status === 429 || error.code === 'over_email_send_rate_limit')
      setNotice(limited ? RATE_MESSAGE : SENT_MESSAGE)
      setRateLimited(limited)
    }
  })

  return (
    <SafeAreaView edges={['top', 'bottom', 'left', 'right']} style={styles.flex}>
      <KeyboardFormScrollView contentContainerStyle={styles.content} style={styles.flex}>
        <Pressable
          accessibilityLabel="Volver"
          accessibilityRole="button"
          onPress={() => navigation.goBack()}
          style={styles.back}
        >
          <Icon name="chevron-back" size={24} color={colors.ink} />
        </Pressable>
        <Text accessibilityRole="header" style={styles.title}>
          Recupera tu contraseña
        </Text>
        <Text style={styles.description}>
          Escribe el correo de tu cuenta y te enviaremos un enlace para crear una nueva.
        </Text>
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
              value={value}
              variant="outlined"
            />
          )}
        />
        <Button label="Enviar enlace" loading={isSubmitting} onPress={() => void submit()} />
        {notice ? (
          <View
            accessibilityLiveRegion="polite"
            style={[styles.notice, rateLimited && styles.rateNotice]}
          >
            <Text style={[styles.noticeText, rateLimited && styles.rateText]}>{notice}</Text>
          </View>
        ) : null}
        <View style={styles.spacer} />
        <Text style={styles.note}>
          Si entras con Google, tu contraseña la administra Google; no hace falta recuperarla aquí.
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => navigation.navigate('Login')}
          style={styles.loginLink}
        >
          <Text style={styles.loginText}>Volver a iniciar sesión</Text>
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
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    gap: spacing.lg,
  },
  back: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceMuted,
  },
  title: { ...typography.display, color: colors.ink },
  description: { ...typography.body, color: colors.textMuted },
  notice: { padding: spacing.md, borderRadius: radius.lg, backgroundColor: colors.successSoft },
  noticeText: { ...typography.body, color: colors.success },
  rateNotice: { backgroundColor: colors.warningSoft },
  rateText: { color: colors.warning },
  spacer: { flex: 1 },
  note: { ...typography.caption, color: colors.textMuted },
  loginLink: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  loginText: { ...typography.body, color: colors.primary, fontFamily: fonts.semibold },
})
