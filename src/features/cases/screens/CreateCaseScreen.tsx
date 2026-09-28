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
  const profile = useAuthStore((state) => state.profile)
  const mutation = useCreateCase()

  async function handleSubmit(input: CreateCaseInput) {
    if (!profile?.areaId) {
      Alert.alert(
        'Necesitas un área',
        'Pide al administrador que asigne tu área antes de crear solicitudes.',
      )
      return
    }

    try {
      const created = await mutation.mutateAsync(input)
      navigation.replace('CaseDetail', { caseId: created.id })
      Alert.alert('Solicitud enviada', `${created.caseNumber} quedó registrada.`)
    } catch {
      Alert.alert(
        'No fue posible crear la solicitud',
        'Comprueba tus permisos, el área y la conexión.',
      )
    }
  }

  return (
    <SafeAreaView edges={['bottom']} style={styles.safeArea}>
      <Text style={styles.subtitle}>
        Completa los datos obligatorios para iniciar el seguimiento.
      </Text>
      {!profile?.areaId ? (
        <Text style={styles.subtitle}>
          No tienes un área asignada. El administrador debe asignarla antes de crear solicitudes.
        </Text>
      ) : (
        <CaseForm
          loading={mutation.isPending}
          onSubmit={handleSubmit}
          submitLabel="Enviar solicitud"
        />
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  subtitle: {
    color: colors.textMuted,
    lineHeight: 21,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
})
