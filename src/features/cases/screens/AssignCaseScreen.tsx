import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { PrimaryButton } from '@/components/buttons/PrimaryButton'
import { hasPermission } from '@/features/auth/permissions'
import type { MainStackParamList } from '@/navigation/types'
import { useAuthStore } from '@/store/authStore'
import { colors, radius, spacing } from '@/theme/tokens'

import { useAssignableProfiles, useAssignCase, useCaseDetail } from '../useCases'

type Props = NativeStackScreenProps<MainStackParamList, 'AssignCase'>

const ROLE_LABELS = {
  administrador: 'Administrador',
  auditor: 'Auditor',
  visualizador: 'Visualizador',
} as const

export function AssignCaseScreen({ navigation, route }: Props) {
  const profile = useAuthStore((state) => state.profile)
  const canAssign = hasPermission(profile?.role, 'cases.assign')
  const detail = useCaseDetail(route.params.caseId)
  const profiles = useAssignableProfiles(canAssign)
  const mutation = useAssignCase(route.params.caseId)
  const [selectedId, setSelectedId] = useState<string | null | undefined>(undefined)

  if (!canAssign) return <Message text="No tienes permiso para asignar personal." />

  if (detail.isLoading || profiles.isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    )
  }

  if (!detail.data || detail.error || profiles.error) {
    return <Message text="No fue posible cargar el personal disponible." />
  }

  const effectiveSelectedId = selectedId === undefined ? detail.data.assignedTo : selectedId

  async function handleSubmit() {
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
        <ProfileOption
          label="Sin asignar"
          onPress={() => setSelectedId(null)}
          selected={effectiveSelectedId === null}
          subtitle="El caso quedará disponible sin responsable"
        />
        {profiles.data?.map((item) => (
          <ProfileOption
            key={item.id}
            label={item.fullName}
            onPress={() => setSelectedId(item.id)}
            selected={effectiveSelectedId === item.id}
            subtitle={ROLE_LABELS[item.role]}
          />
        ))}
        <PrimaryButton
          label="Guardar asignación"
          loading={mutation.isPending}
          onPress={() => void handleSubmit()}
        />
      </ScrollView>
    </SafeAreaView>
  )
}

function ProfileOption({
  label,
  onPress,
  selected,
  subtitle,
}: {
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
      <View style={styles.optionContent}>
        <Text style={styles.optionTitle}>{label}</Text>
        <Text style={styles.optionSubtitle}>{subtitle}</Text>
      </View>
      <View style={[styles.radio, selected ? styles.radioSelected : null]} />
    </Pressable>
  )
}

function Message({ text }: { text: string }) {
  return (
    <View style={styles.center}>
      <Text style={styles.message}>{text}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  content: { gap: spacing.sm, padding: spacing.lg, paddingBottom: spacing.xl },
  instructions: { color: colors.textMuted, lineHeight: 21, marginBottom: spacing.sm },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    backgroundColor: colors.background,
  },
  message: { color: colors.textMuted, textAlign: 'center' },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    padding: spacing.md,
  },
  optionSelected: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  optionContent: { flex: 1, gap: spacing.xs },
  optionTitle: { color: colors.text, fontWeight: '800' },
  optionSubtitle: { color: colors.textMuted, fontSize: 12 },
  radio: { width: 20, height: 20, borderWidth: 2, borderColor: colors.border, borderRadius: 10 },
  radioSelected: { borderWidth: 6, borderColor: colors.primary },
})
