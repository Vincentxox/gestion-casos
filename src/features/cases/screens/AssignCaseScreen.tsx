import { getErrorMessage } from '@/utils/errorMessage'
import { AppFeedback } from '@/components/feedback/AppFeedback'
import { CommonActions } from '@react-navigation/native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { useEffect, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { Button } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'
import { FormField } from '@/components/forms/FormField'
import { KeyboardFormScrollView } from '@/components/layout/KeyboardFormScrollView'
import { Avatar } from '@/components/ui/Avatar'
import { EmptyState } from '@/components/feedback/EmptyState'
import { RequestState } from '@/components/feedback/RequestState'
import { ROLE_LABELS } from '@/features/auth/types'
import type { MainStackParamList } from '@/navigation/types'
import { useAuthStore } from '@/store/authStore'
import { colors, radius, spacing, typography } from '@/theme/tokens'

import { useAssignableProfiles, useAssignCase, useCaseActions, useCaseDetail } from '../useCases'
import { reassignmentReasonSchema } from '../schemas'

type Props = NativeStackScreenProps<MainStackParamList, 'AssignCase'>

export function AssignCaseScreen({ navigation, route }: Props) {
  const profile = useAuthStore((state) => state.profile)
  const detail = useCaseDetail(route.params.caseId)
  const actions = useCaseActions(route.params.caseId)
  const canAssign = actions.data?.asignar?.allowed === true
  const profiles = useAssignableProfiles(detail.data?.targetAreaId, canAssign)
  const mutation = useAssignCase(route.params.caseId)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [reason, setReason] = useState('')
  const isReassignment = Boolean(detail.data?.assignedTo)
  const needsReason = detail.data?.status === 'en_ejecucion' || detail.data?.status === 'en_espera'
  const reasonValid = !needsReason || reassignmentReasonSchema.safeParse(reason).success

  useEffect(() => {
    navigation.setOptions({ title: isReassignment ? 'Reasignar personal' : 'Asignar personal' })
  }, [isReassignment, navigation])

  if (detail.isLoading || actions.isPending || profiles.isLoading) {
    return <RequestState kind="loading" title="Cargando personal…" />
  }

  if (!detail.data || detail.error || actions.error || profiles.error) {
    return (
      <RequestState
        kind="error"
        title="No fue posible cargar el personal disponible"
        onRetry={() => {
          void detail.refetch()
          void actions.refetch()
          void profiles.refetch()
        }}
      />
    )
  }

  if (!canAssign)
    return <RequestState kind="empty" title="No tienes permiso para asignar esta solicitud" />

  const currentAssignee = profiles.data?.find((item) => item.id === detail.data.assignedTo)
  const availableProfiles =
    profiles.data?.filter((item) => item.id !== detail.data.assignedTo) ?? []
  const selectedProfile = availableProfiles.find((item) => item.id === selectedId)

  async function handleSubmit() {
    if (!selectedProfile || !reasonValid) return
    try {
      await mutation.mutateAsync({
        assignedTo: selectedProfile.id,
        comment: needsReason ? reason : '',
      })
      AppFeedback.toast(
        `Solicitud ${isReassignment ? 'reasignada' : 'asignada'} a ${selectedProfile.fullName}`,
        { tone: 'success' },
      )
      navigation.goBack()
    } catch (error) {
      AppFeedback.show(
        isReassignment ? 'No fue posible reasignar' : 'No fue posible asignar',
        getErrorMessage(error, 'Comprueba tus permisos y la conexión.'),
        { tone: 'error' },
      )
    }
  }

  return (
    <SafeAreaView edges={['bottom']} style={styles.safeArea}>
      <KeyboardFormScrollView contentContainerStyle={styles.content}>
        <Text style={styles.instructions}>
          {isReassignment
            ? `${detail.data.caseNumber} · Elige a quién pasarle la solicitud. La persona actual deja de estar a cargo, pero la seguirá viendo en «Mis trabajos».`
            : `${detail.data.caseNumber} · Elige a la persona responsable de la solicitud.`}
        </Text>
        {detail.data.assignedTo ? (
          <>
            <Text style={styles.sectionLabel}>RESPONSABLE ACTUAL</Text>
            <View style={styles.currentCard}>
              <Avatar
                name={detail.data.assigneeName || currentAssignee?.fullName || 'Responsable actual'}
                id={detail.data.assignedTo}
                avatarPath={detail.data.assigneeAvatarPath ?? currentAssignee?.avatarPath}
                size={44}
                tone="neutral"
              />
              <View style={styles.optionContent}>
                <Text style={[styles.optionTitle, styles.currentName]}>
                  {detail.data.assigneeName || currentAssignee?.fullName || 'Responsable actual'}
                </Text>
                <Text style={styles.optionSubtitle}>
                  {currentAssignee
                    ? `${ROLE_LABELS[currentAssignee.role]} · ${currentAssignee.areaName || 'Sin área'}`
                    : 'Asignado a esta solicitud'}
                </Text>
              </View>
              <View style={styles.currentBadge}>
                <Text style={styles.currentBadgeText}>Asignado ahora</Text>
              </View>
            </View>
          </>
        ) : null}
        <Text style={styles.sectionLabel}>
          {isReassignment ? 'ELIGE A OTRA PERSONA' : 'ELIGE UNA PERSONA'}
        </Text>
        {!availableProfiles.length ? (
          <EmptyState
            title={
              isReassignment ? 'No hay otra persona disponible' : 'No hay personal en esta área'
            }
            message={
              isReassignment
                ? 'Pide al administrador que asigne otra persona al área técnica.'
                : 'Pide al administrador que asigne personal al área técnica.'
            }
            variant="noResults"
            action={profile?.role === 'administrador' ? 'Ir a Usuarios' : undefined}
            onAction={
              profile?.role === 'administrador'
                ? () =>
                    navigation.dispatch(
                      CommonActions.navigate('MainTabs', {
                        screen: 'Administration',
                        params: { screen: 'Users' },
                      }),
                    )
                : undefined
            }
          />
        ) : null}
        {availableProfiles.map((item) => (
          <ProfileOption
            id={item.id}
            key={item.id}
            label={item.fullName}
            avatarPath={item.avatarPath}
            onPress={() => setSelectedId(item.id)}
            selected={selectedId === item.id}
            subtitle={`${ROLE_LABELS[item.role]} · ${item.areaName || 'Sin área'}`}
          />
        ))}
        {needsReason && availableProfiles.length ? (
          <FormField
            label="Motivo de la reasignación (obligatorio)"
            maxLength={500}
            multiline
            onChangeText={setReason}
            placeholder="Explica por qué cambia la persona responsable"
            showCharacterCount
            style={styles.reason}
            textAlignVertical="top"
            value={reason}
          />
        ) : null}
        {needsReason && availableProfiles.length ? (
          <Text style={styles.reasonHint}>Escribe entre 3 y 500 caracteres.</Text>
        ) : null}
      </KeyboardFormScrollView>
      {availableProfiles.length ? (
        <View style={styles.stickyAction}>
          <Button
            label={
              selectedProfile
                ? `${isReassignment ? 'Reasignar' : 'Asignar'} a ${selectedProfile.fullName}`
                : isReassignment
                  ? 'Reasignar personal'
                  : 'Asignar personal'
            }
            disabled={!selectedProfile || !reasonValid}
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
  avatarPath,
  onPress,
  selected,
  subtitle,
}: {
  id: string
  label: string
  avatarPath?: string | null
  onPress: () => void
  selected: boolean
  subtitle: string
}) {
  return (
    <Pressable
      accessibilityLabel={`Elegir a ${label}`}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.option,
        selected ? styles.optionSelected : null,
        pressed ? styles.optionPressed : null,
      ]}
    >
      <Avatar name={label} id={id} avatarPath={avatarPath} size={44} />
      <View style={styles.optionContent}>
        <Text style={styles.optionTitle}>{label}</Text>
        <Text style={styles.optionSubtitle}>{subtitle}</Text>
      </View>
      {selected ? (
        <Icon name="checkmark-circle" color={colors.primary} size={24} />
      ) : (
        <View style={styles.radio} />
      )}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  content: { gap: spacing.sm, padding: spacing.lg, paddingBottom: spacing.xl },
  instructions: { color: colors.textMuted, lineHeight: 21, marginBottom: spacing.sm },
  sectionLabel: { ...typography.overline, color: colors.textMuted, marginTop: spacing.md },
  currentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.neutralSoft,
    padding: spacing.md,
  },
  currentBadge: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  currentBadgeText: { ...typography.caption, color: colors.textMuted },
  currentName: { color: colors.neutral },
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
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    padding: spacing.md,
  },
  optionSelected: {
    borderColor: colors.primary,
    borderWidth: 2,
    backgroundColor: colors.primarySoft,
  },
  optionPressed: { backgroundColor: colors.surfaceMuted },
  reason: { minHeight: 100 },
  reasonHint: { ...typography.caption, color: colors.textMuted },
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
})
