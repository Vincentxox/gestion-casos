import { Ionicons } from '@expo/vector-icons'
import { useState } from 'react'
import { Pressable, StyleSheet, Text, TextInput, type TextInputProps, View } from 'react-native'

import { colors, radius, spacing, typography } from '@/theme/tokens'

interface FormFieldProps extends TextInputProps {
  label: string
  error?: string
  required?: boolean
  showCharacterCount?: boolean
}

export function FormField({
  label,
  error,
  required = false,
  showCharacterCount = false,
  secureTextEntry,
  style,
  ...inputProps
}: FormFieldProps) {
  const [isPasswordVisible, setIsPasswordVisible] = useState(false)
  const canTogglePassword = secureTextEntry === true

  return (
    <View style={styles.container}>
      <Text
        accessibilityLabel={required ? `${label}, obligatorio` : undefined}
        style={styles.label}
      >
        {label}
        {required ? <Text style={styles.required}> *</Text> : null}
      </Text>
      <View style={[styles.inputContainer, error ? styles.inputError : null]}>
        <TextInput
          {...inputProps}
          accessibilityLabel={
            inputProps.accessibilityLabel ?? (required ? `${label}, obligatorio` : label)
          }
          accessibilityHint={error}
          autoCorrect={canTogglePassword ? false : inputProps.autoCorrect}
          secureTextEntry={canTogglePassword && !isPasswordVisible}
          style={[styles.input, style]}
          placeholderTextColor={colors.textMuted}
        />
        {canTogglePassword ? (
          <Pressable
            accessibilityLabel={isPasswordVisible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            accessibilityRole="button"
            hitSlop={8}
            onPress={() => setIsPasswordVisible((isVisible) => !isVisible)}
            style={styles.visibilityButton}
          >
            <Ionicons
              color={colors.textMuted}
              name={isPasswordVisible ? 'eye-off-outline' : 'eye-outline'}
              size={22}
            />
          </Pressable>
        ) : null}
      </View>
      {showCharacterCount && inputProps.maxLength ? (
        <Text style={styles.count}>
          {(inputProps.value ?? '').length} / {inputProps.maxLength}
        </Text>
      ) : null}
      {error ? (
        <Text accessibilityLiveRegion="polite" style={styles.error}>
          {error}
        </Text>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.xs,
  },
  label: {
    ...typography.caption,
    color: colors.text,
  },
  required: { color: colors.error },
  count: { ...typography.caption, color: colors.textMuted, textAlign: 'right' },
  inputContainer: {
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  input: {
    ...typography.body,
    minHeight: 48,
    flex: 1,
    color: colors.text,
    paddingHorizontal: spacing.md,
  },
  visibilityButton: {
    minWidth: 48,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputError: {
    borderColor: colors.error,
  },
  error: {
    ...typography.caption,
    color: colors.error,
  },
})
