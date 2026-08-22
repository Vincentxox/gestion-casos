import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { Alert, StyleSheet, Text } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import type { MainStackParamList } from '@/navigation/types'
import { useAuthStore } from '@/store/authStore'
import { colors, spacing } from '@/theme/tokens'

import { CaseForm } from '../components/CaseForm'
import type { CreateCaseInput } from '../types'
import { useCreateCase } from '../useCases'

type Props = NativeStackScreenProps<MainStackParamList, 'CreateCase'>

export function CreateCaseScreen({ navigation }: Props) {
  const session = useAuthStore((state) => state.session)
  const mutation = useCreateCase()

  async function handleSubmit(input: CreateCaseInput) {
    if (!session?.user.id) {
      Alert.alert('Sesión no disponible', 'Vuelve a iniciar sesión para crear el caso.')
      return
    }

    try {
      await mutation.mutateAsync({ input, userId: session.user.id })
      Alert.alert('Caso creado', 'El caso quedó registrado y ya aparece en el listado.', [
        { text: 'Entendido', onPress: () => navigation.goBack() },
      ])
    } catch {
      Alert.alert('No fue posible crear el caso', 'Comprueba tus permisos y la conexión.')
    }
  }

  return (
    <SafeAreaView edges={['bottom']} style={styles.safeArea}>
      <Text accessibilityRole="header" style={styles.title}>
        Información del caso
      </Text>
      <Text style={styles.subtitle}>
        Completa los datos obligatorios para iniciar el seguimiento.
      </Text>
      <CaseForm loading={mutation.isPending} onSubmit={handleSubmit} submitLabel="Guardar caso" />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  title: {
    color: colors.text,
    fontSize: 25,
    fontWeight: '800',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  subtitle: {
    color: colors.textMuted,
    lineHeight: 21,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
})
