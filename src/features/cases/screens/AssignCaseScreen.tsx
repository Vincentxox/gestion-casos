import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs'
import { useState } from 'react'
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { Button } from '@/components/ui/Button'
import { Avatar } from '@/components/ui/Avatar'
import { EmptyState } from '@/components/feedback/EmptyState'
import { RequestState } from '@/components/feedback/RequestState'
import { ROLE_LABELS } from '@/features/auth/types'
import type { MainStackParamList, MainTabParamList } from '@/navigation/types'
import { useAuthStore } from '@/store/authStore'
import { colors, radius, spacing, typography } from '@/theme/tokens'

import { useAssignableProfiles, useAssignCase, useCaseDetail } from '../useCases'
import { getAvailableCaseActions } from '../casePermissions'

type Props = NativeStackScreenProps<MainStackParamList, 'AssignCase'>

export function AssignCaseScreen({ navigation, route }: Props) {
  const profile = useAuthStore((state) => state.profile)
  const detail = useCaseDetail(route.params.caseId)
  const canAssign = detail.data
    ? getAvailableCaseActions(detail.data, profile).includes('asignar')
    : false
  const profiles = useAssignableProfiles(detail.data?.targetAreaId, canAssign)
  const mutation = useAssignCase(route.params.caseId)
  const [selectedId, setSelectedId] = useState<string | null | undefined>(undefined)

  if (detail.isLoading || profiles.isLoading) {
    return <RequestState kind="loading" title="Cargando personal…" />
  }

  if (!detail.data || detail.error || profiles.error) {
    return (
      <RequestState
        kind="error"
        title="No fue posible cargar el personal disponible"
        onRetry={() => {
          void detail.refetch()
          void profiles.refetch()
        }}
      />
    )
  }

  if (!canAssign)
    return <RequestState kind="empty" title="No tienes permiso para asignar esta solicitud" />

  const effectiveSelectedId = selectedId === undefined ? detail.data.assignedTo : selectedId

  async function handleSubmit() {
    if (!effectiveSelectedId || effectiveSelectedId === detail.data?.assignedTo) {
      Alert.alert('Selecciona otra persona', 'Elige un técnico o jefe del área responsable.')
      return
    }
    try {
      await mutation.mutateAsync(effectiveSelectedId)
      Alert.alert('Asignación actualizada', 'El responsable del caso se guardó correctamente.', [
        { text: 'Entendido', onPress: () => navigation.goBack() },
      ])
    } catch {
      Alert.alert('No fue posible asignar', 'Comprueba tus permisos y la conexión.')
    }
  }

  return (
    <SafeAreaView edges={['bottom']} style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.instructions}>Selecciona una persona responsable del seguimiento.</Text>
        {!profiles.data?.length ? (
          <EmptyState
            title="No hay técnicos en esta área"
            message="Pide al administrador que asigne personal al área técnica."
            variant="noResults"
            action={profile?.role === 'administrador' ? 'Ir a Usuarios' : undefined}
            onAction={
              profile?.role === 'administrador'
                ? () =>
                    navigation
                      .getParent<BottomTabNavigationProp<MainTabParamList>>()
                      ?.navigate('Administration', { screen: 'Users' })
                : undefined
            }
          />
        ) : null}
        {profiles.data?.map((item) => (
          <ProfileOption
            id={item.id}
            key={item.id}
            label={item.fullName}
            onPress={() => setSelectedId(item.id)}
            selected={effectiveSelectedId === item.id}
            subtitle={`${ROLE_LABELS[item.role]} · ${item.areaName || 'Sin área'}`}
          />
        ))}
      </ScrollView>
      {profiles.data?.length ? (
        <View style={styles.stickyAction}>
          <Button
            label="Guardar asignación"
            loading={mutation.isPending}
            onPress={() => void handleSubmit()}
          />
        </View>
      ) : null}
    </SafeAreaView>
  )
}

function ProfileOption({
  id,
  label,
  onPress,
  selected,
  subtitle,
}: {
  id: string
  label: string
  onPress: () => void
  selected: boolean
  subtitle: string
}) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      onPress={onPress}
      style={[styles.option, selected ? styles.optionSelected : null]}
    >
      <Avatar name={label} id={id} size={44} />
      <View style={styles.optionContent}>
        <Text style={styles.optionTitle}>{label}</Text>
        <Text style={styles.optionSubtitle}>{subtitle}</Text>
      </View>
      <View style={[styles.radio, selected ? styles.radioSelected : null]} />
    </Pressable>
  )
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  content: { gap: spacing.sm, padding: spacing.lg, paddingBottom: spacing.xl },
  instructions: { color: colors.textMuted, lineHeight: 21, marginBottom: spacing.sm },
  stickyAction: {
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    padding: spacing.md,
  },
  optionSelected: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  optionContent: { flex: 1, gap: spacing.xs },
  optionTitle: { ...typography.heading, color: colors.text },
  optionSubtitle: { ...typography.caption, color: colors.textMuted },
  radio: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: radius.pill,
  },
  radioSelected: { borderWidth: 6, borderColor: colors.primary },
})
