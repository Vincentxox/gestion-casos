import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { Alert, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { RequestState } from '@/components/feedback/RequestState'

import type { MainStackParamList } from '@/navigation/types'
import { useAuthStore } from '@/store/authStore'
import { colors } from '@/theme/tokens'

import { CaseForm } from '../components/CaseForm'
import { canEditCase } from '../casePermissions'
import type { UpdateCaseInput } from '../types'
import { useCaseDetail, useUpdateCase } from '../useCases'

type Props = NativeStackScreenProps<MainStackParamList, 'EditCase'>

export function EditCaseScreen({ navigation, route }: Props) {
  const profile = useAuthStore((state) => state.profile)
  const detail = useCaseDetail(route.params.caseId)
  const mutation = useUpdateCase(route.params.caseId)

  if (detail.isLoading) {
    return <RequestState kind="loading" title="Cargando solicitud…" />
  }

  if (!detail.data || detail.error)
    return (
      <RequestState
        kind="error"
        title="No fue posible cargar la solicitud"
        onRetry={() => void detail.refetch()}
      />
    )

  if (!canEditCase(detail.data, profile))
    return <RequestState kind="empty" title="No tienes permiso para editar esta solicitud" />

  const initialValues: UpdateCaseInput = {
    title: detail.data.title,
    description: detail.data.description,
    categoryId: detail.data.categoryId,
    location: detail.data.location,
    priority: detail.data.priority,
  }

  async function handleSubmit(input: UpdateCaseInput) {
    try {
      await mutation.mutateAsync(input)
      Alert.alert('Caso actualizado', 'Los cambios se guardaron correctamente.', [
        { text: 'Entendido', onPress: () => navigation.goBack() },
      ])
    } catch (error) {
      Alert.alert(
        'No fue posible actualizar',
        error instanceof Error ? error.message : 'Comprueba tus permisos y la conexión.',
      )
    }
  }

  return (
    <SafeAreaView edges={['bottom']} style={styles.safeArea}>
      <CaseForm
        initialValues={initialValues}
        loading={mutation.isPending}
        onSubmit={handleSubmit}
        submitLabel="Guardar cambios"
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
})
