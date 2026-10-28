import { zodResolver } from '@hookform/resolvers/zod'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { StyleSheet, Text, View, Pressable } from 'react-native'

import { AppFeedback, useFeedback } from '@/components/feedback/AppFeedback'
import { FormField } from '@/components/forms/FormField'
import { KeyboardFormScrollView } from '@/components/layout/KeyboardFormScrollView'
import { Button } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'
import { ScreenContainer } from '@/components/ui/ScreenContainer'
import type { PendingOrganizationStackParamList } from '@/navigation/types'
import { useAuthStore } from '@/store/authStore'
import { colors, fonts, radius, spacing, typography } from '@/theme/tokens'
import { getErrorMessage } from '@/utils/errorMessage'
import { useRequestOrganizationCreation, myOrganizationRequestKey } from '../useOrganizationRequest'
import type { OrganizationCreationInput, TeamSize } from '../organizationRequestService'
import { organizationCreationSchema } from '../organizationRequestSchemas'
import { useQueryClient } from '@tanstack/react-query'

type Props = NativeStackScreenProps<PendingOrganizationStackParamList, 'RequestOrganization'>
const sizes: TeamSize[] = ['1-5', '6-25', '26-75', '76+']

export function RequestOrganizationScreen({ navigation, route }: Props) {
  const submitRequest = useRequestOrganizationCreation()
  const feedback = useFeedback()
  const client = useQueryClient()
  const email = useAuthStore((state) => state.session?.user.email) ?? 'tu correo'
  const userId = useAuthStore((state) => state.session?.user.id)
  const draft = userId
    ? client.getQueryData<OrganizationCreationInput>(['organization-creation-draft', userId])
    : undefined
  const prefill = route.params?.prefill ?? draft
  const {
    control,
    handleSubmit,
    formState: { errors, isValid },
  } = useForm<OrganizationCreationInput>({
    resolver: zodResolver(organizationCreationSchema),
    mode: 'onChange',
    defaultValues: {
      organizationName: prefill?.organizationName ?? '',
      contactPhone: prefill?.contactPhone ?? '',
      teamSize: prefill?.teamSize,
      message: prefill?.message ?? '',
    },
  })
  const size = useWatch({ control, name: 'teamSize' })

  const submit = handleSubmit(async (values) => {
    try {
      await submitRequest.mutateAsync(values)
      if (userId) client.setQueryData(['organization-creation-draft', userId], values)
      await client.invalidateQueries({ queryKey: myOrganizationRequestKey })
      AppFeedback.toast('Solicitud enviada', { tone: 'success' })
      navigation.goBack()
    } catch (error) {
      const message = getErrorMessage(error, 'No fue posible enviar tu solicitud.')
      if (message === 'Ya tienes una solicitud pendiente') {
        await feedback.alert({
          title: 'No fue posible enviar la solicitud',
          message,
          tone: 'error',
        })
        navigation.goBack()
        void client.invalidateQueries({ queryKey: myOrganizationRequestKey })
      } else if (/network|fetch|conexión|offline/i.test(message)) {
        const retry = await feedback.confirm({
          title: 'No hay conexión. Tu solicitud no se envió.',
          message: 'Comprueba tu conexión e inténtalo de nuevo.',
          confirmLabel: 'Reintentar',
          cancelLabel: 'Volver',
          tone: 'error',
        })
        if (retry) void submit()
      } else {
        AppFeedback.show('No fue posible enviar la solicitud', message, { tone: 'error' })
      }
    }
  })

  return (
    <ScreenContainer padded={false}>
      <KeyboardFormScrollView contentContainerStyle={styles.content}>
        <Text style={styles.intro}>
          Revisamos cada solicitud. Si la aprobamos, la empresa queda creada y tú serás su
          administrador.
        </Text>
        <Controller
          control={control}
          name="organizationName"
          render={({ field }) => (
            <FormField
              label="Nombre de la empresa"
              required
              maxLength={120}
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              error={errors.organizationName ? 'Escribe entre 2 y 120 caracteres.' : undefined}
            />
          )}
        />
        <Controller
          control={control}
          name="contactPhone"
          render={({ field }) => (
            <FormField
              label="Teléfono de contacto (opcional)"
              keyboardType="phone-pad"
              maxLength={30}
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
            />
          )}
        />
        <View style={styles.group}>
          <Text style={styles.label}>Cuántas personas la usarán</Text>
          <Controller
            control={control}
            name="teamSize"
            render={({ field }) => (
              <View accessibilityRole="radiogroup" style={styles.sizes}>
                {sizes.map((option) => (
                  <Pressable
                    key={option}
                    accessibilityRole="radio"
                    accessibilityLabel={option}
                    accessibilityState={{ checked: field.value === option }}
                    onPress={() => field.onChange(option)}
                    style={[styles.size, field.value === option && styles.sizeSelected]}
                  >
                    <Text
                      style={[styles.sizeText, field.value === option && styles.sizeTextSelected]}
                    >
                      {option}
                    </Text>
                  </Pressable>
                ))}
              </View>
            )}
          />
        </View>
        <Controller
          control={control}
          name="message"
          render={({ field }) => (
            <FormField
              label="Mensaje (opcional)"
              multiline
              maxLength={500}
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              style={styles.message}
              showCharacterCount
              characterCountThreshold={0.8}
            />
          )}
        />
        <View style={styles.note}>
          <Icon name="mail-outline" color={colors.textMuted} size={20} />
          <Text style={styles.noteText}>
            Te responderemos aquí y la invitación llegará a {email}.
          </Text>
        </View>
      </KeyboardFormScrollView>
      <View style={styles.footer}>
        <Button
          label="Enviar solicitud"
          disabled={!isValid || !size}
          loading={submitRequest.isPending}
          onPress={() => void submit()}
        />
      </View>
    </ScreenContainer>
  )
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, paddingBottom: spacing.xl, gap: spacing.lg },
  intro: { ...typography.body, color: colors.textMuted },
  group: { gap: spacing.sm },
  label: { ...typography.caption, color: colors.text },
  sizes: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.lg,
    padding: 4,
    gap: 4,
  },
  size: {
    flex: 1,
    minHeight: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
  },
  sizeSelected: { backgroundColor: colors.surface },
  sizeText: { ...typography.caption, color: colors.textMuted },
  sizeTextSelected: { color: colors.primaryDark, fontFamily: fonts.bold },
  message: { minHeight: 112, textAlignVertical: 'top', paddingTop: spacing.md },
  note: {
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceMuted,
  },
  noteText: { ...typography.caption, color: colors.textMuted, flex: 1 },
  footer: {
    padding: spacing.lg,
    borderTopWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
})
