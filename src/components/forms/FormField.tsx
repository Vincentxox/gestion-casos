import { Ionicons } from '@expo/vector-icons'
import { useState } from 'react'
import { Pressable, StyleSheet, Text, TextInput, type TextInputProps, View } from 'react-native'

import { colors, radius, spacing, typography } from '@/theme/tokens'

interface FormFieldProps extends TextInputProps {
  label: string
  error?: string
}

export function FormField({ label, error, secureTextEntry, style, ...inputProps }: FormFieldProps) {
  const [isPasswordVisible, setIsPasswordVisible] = useState(false)
  const canTogglePassword = secureTextEntry === true

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.inputContainer, error ? styles.inputError : null]}>
        <TextInput
          {...inputProps}
          accessibilityLabel={inputProps.accessibilityLabel ?? label}
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
