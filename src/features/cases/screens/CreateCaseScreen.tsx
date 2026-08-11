import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { useState } from 'react'
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { PrimaryButton } from '@/components/buttons/PrimaryButton'
import { FormField } from '@/components/forms/FormField'
import type { MainStackParamList } from '@/navigation/types'
import { useAuthStore } from '@/store/authStore'
import { colors, radius, spacing } from '@/theme/tokens'

import { createCaseSchema } from '../schemas'
import type { CasePriority } from '../types'
import { useCreateCase } from '../useCases'

type Props = NativeStackScreenProps<MainStackParamList, 'CreateCase'>
const PRIORITIES: CasePriority[] = ['alta', 'media', 'baja']

export function CreateCaseScreen({ navigation }: Props) {
  const session = useAuthStore((state) => state.session)
  const mutation = useCreateCase()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('')
  const [location, setLocation] = useState('')
  const [priority, setPriority] = useState<CasePriority>('media')
  const [errors, setErrors] = useState<Record<string, string>>({})

  async function handleSubmit() {
    const result = createCaseSchema.safeParse({ title, description, category, location, priority })
    if (!result.success) {
      const nextErrors: Record<string, string> = {}
      for (const issue of result.error.issues) nextErrors[String(issue.path[0])] ??= issue.message
      setErrors(nextErrors)
      return
    }
    if (!session?.user.id) {
      Alert.alert('Sesión no disponible', 'Vuelve a iniciar sesión para crear el caso.')
      return
    }
    setErrors({})
    try {
      await mutation.mutateAsync({ input: result.data, userId: session.user.id })
      Alert.alert('Caso creado', 'El caso quedó registrado y ya aparece en el listado.', [
        { text: 'Entendido', onPress: () => navigation.goBack() },
      ])
    } catch {
      Alert.alert('No fue posible crear el caso', 'Comprueba tus permisos y la conexión.')
    }
  }

  return (
    <SafeAreaView edges={['bottom']} style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text accessibilityRole="header" style={styles.title}>
          Información del caso
        </Text>
        <Text style={styles.subtitle}>
          Completa los datos obligatorios para iniciar el seguimiento.
        </Text>
        <FormField
          error={errors.title}
          label="Título"
          maxLength={120}
          onChangeText={setTitle}
          placeholder="Ej. Fuga de agua en medidor"
          value={title}
        />
        <FormField
          error={errors.description}
          label="Descripción"
          maxLength={2000}
          multiline
          onChangeText={setDescription}
          placeholder="Describe qué sucede y cualquier información útil"
          style={styles.multiline}
          textAlignVertical="top"
          value={description}
        />
        <FormField
          error={errors.category}
          label="Categoría"
          maxLength={80}
          onChangeText={setCategory}
          placeholder="Ej. Agua potable"
          value={category}
        />
        <FormField
          error={errors.location}
          label="Ubicación"
          maxLength={180}
          onChangeText={setLocation}
          placeholder="Dirección o referencia"
          value={location}
        />
        <View style={styles.priorityGroup}>
          <Text style={styles.label}>Prioridad</Text>
          <View style={styles.priorityRow}>
            {PRIORITIES.map((item) => (
              <Pressable
                accessibilityRole="radio"
                accessibilityState={{ checked: priority === item }}
                key={item}
                onPress={() => setPriority(item)}
                style={[styles.priority, priority === item ? styles.priorityActive : null]}
              >
                <Text
                  style={[
                    styles.priorityText,
                    priority === item ? styles.priorityTextActive : null,
                  ]}
                >
                  {item.charAt(0).toUpperCase() + item.slice(1)}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
        <PrimaryButton
          label="Guardar caso"
          loading={mutation.isPending}
          onPress={() => void handleSubmit()}
        />
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  content: { gap: spacing.md, padding: spacing.lg, paddingBottom: spacing.xl },
  title: { color: colors.text, fontSize: 25, fontWeight: '800' },
  subtitle: { color: colors.textMuted, lineHeight: 21 },
  multiline: { minHeight: 110, paddingTop: spacing.md },
  priorityGroup: { gap: spacing.sm },
  label: { color: colors.text, fontSize: 14, fontWeight: '600' },
  priorityRow: { flexDirection: 'row', gap: spacing.sm },
  priority: {
    flex: 1,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    paddingVertical: 12,
  },
  priorityActive: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  priorityText: { color: colors.textMuted, fontWeight: '700' },
  priorityTextActive: { color: colors.primary },
})
