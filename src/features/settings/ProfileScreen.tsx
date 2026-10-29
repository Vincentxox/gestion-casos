import { getErrorMessage } from '@/utils/errorMessage'
import { AppFeedback } from '@/components/feedback/AppFeedback'
import * as ImagePicker from 'expo-image-picker'
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useState } from 'react'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import appConfig from '../../../app.json'

import { Button } from '@/components/ui/Button'
import { FormField } from '@/components/forms/FormField'
import { Icon, type IconName } from '@/components/ui/Icon'
import { IconTile } from '@/components/ui/IconTile'
import { Avatar } from '@/components/ui/Avatar'
import { Card } from '@/components/ui/Card'
import { Chip } from '@/components/ui/Chip'
import { ScreenContainer } from '@/components/ui/ScreenContainer'
import { BottomSheet } from '@/components/sheets/BottomSheet'
import { ROLE_ICONS, ROLE_LABELS } from '@/features/auth/types'
import { confirmLogout } from '@/features/auth/confirmLogout'
import { useAuthStore } from '@/store/authStore'
import { PRIVACY_POLICY_URL, TERMS_URL } from '@/config/legalLinks'
import type { ProfileStackParamList } from '@/navigation/types'
import { colors, fonts, radius, spacing, typography } from '@/theme/tokens'
import { updateOwnName } from './profileService'
import { prepareProfilePhoto } from './profilePhotoPreparation'
import { useClearOwnProfilePhoto, useUploadOwnProfilePhoto } from './useProfilePhoto'
import {
  useIsPlatformAdmin,
  useOrganizationCreationRequests,
} from '@/features/auth/useOrganizationRequest'

type Setting = 'appearance' | 'notifications' | 'permissions'

const ROLE_DESCRIPTIONS = {
  administrador:
    'Configuras tu empresa, sus áreas y usuarios, y gestionas las solicitudes. Las firmas dependen de cada caso.',
  jefe_area:
    'Gestionas las solicitudes de tu área y participas en la revisión o conformidad según el caso.',
  tecnico: 'Atiendes los trabajos que te asignan y registras fotos, recursos y reportes.',
  solicitante: 'Creas solicitudes y sigues las de tu área.',
  auditor: 'Puedes consultar las solicitudes y reportes de tu empresa, sin modificarlos.',
} as const

export function ProfileScreen({
  navigation,
}: NativeStackScreenProps<ProfileStackParamList, 'ProfileHome'>) {
  const profile = useAuthStore((state) => state.profile)
  const session = useAuthStore((state) => state.session)
  const logout = useAuthStore((state) => state.logout)
  const applyOwnName = useAuthStore((state) => state.applyOwnName)
  const uploadPhoto = useUploadOwnProfilePhoto()
  const clearPhoto = useClearOwnProfilePhoto()
  const platformAdmin = useIsPlatformAdmin()
  const pendingOrganizations = useOrganizationCreationRequests(
    'pendiente',
    platformAdmin.data === true,
  )
  const pendingCount = pendingOrganizations.data?.length ?? 0
  const [name, setName] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [photoSheetOpen, setPhotoSheetOpen] = useState(false)
  const [setting, setSetting] = useState<Setting | null>(null)

  async function pickPhoto(source: 'camera' | 'library') {
    setPhotoSheetOpen(false)
    if (!profile || !profile.organizationId || !profile.organizationActive) return
    try {
      const cameraPermission =
        source === 'camera' ? await ImagePicker.requestCameraPermissionsAsync() : null
      if (cameraPermission && !cameraPermission.granted) {
        // La cámara requiere permiso; el selector de imágenes del sistema no lo necesita.
        Alert.alert(
          'Permiso necesario',
          'Activa el acceso a la cámara en los ajustes del teléfono.',
          [
            { text: 'Volver' },
            { text: 'Abrir ajustes', onPress: () => void Linking.openSettings() },
          ],
        )
        return
      }
      const result =
        source === 'camera'
          ? await ImagePicker.launchCameraAsync({
              mediaTypes: ['images'],
              allowsEditing: true,
              aspect: [1, 1],
              quality: 1,
            })
          : await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ['images'],
              allowsEditing: true,
              aspect: [1, 1],
              quality: 1,
            })
      if (result.canceled || !result.assets[0]) return
      const asset = result.assets[0]
      const uri = await prepareProfilePhoto(asset.uri, asset.width, asset.height)
      await uploadPhoto.mutateAsync({ profile, uri })
      AppFeedback.toast('Foto actualizada', { tone: 'success' })
    } catch (error) {
      AppFeedback.show(
        'No fue posible cambiar la foto',
        getErrorMessage(error, 'Inténtalo de nuevo.'),
        { tone: 'error' },
      )
    }
  }

  async function removePhoto() {
    setPhotoSheetOpen(false)
    if (!profile?.avatarUrl) return
    try {
      await clearPhoto.mutateAsync(profile.avatarUrl)
      AppFeedback.toast('Foto eliminada', { tone: 'success' })
    } catch (error) {
      AppFeedback.show(
        'No fue posible quitar la foto',
        getErrorMessage(error, 'Inténtalo de nuevo.'),
        { tone: 'error' },
      )
    }
  }

  async function saveName() {
    if (!profile) return
    setSaving(true)
    try {
      applyOwnName(await updateOwnName(profile.id, name ?? profile.fullName))
      setName(null)
      AppFeedback.toast('Nombre actualizado', { tone: 'success' })
    } catch (error) {
      AppFeedback.show('No fue posible guardar', getErrorMessage(error, 'Inténtalo de nuevo.'), {
        tone: 'error',
      })
    } finally {
      setSaving(false)
    }
  }

  async function handleLogout() {
    try {
      await logout()
    } catch {
      AppFeedback.show(
        'No fue posible cerrar sesión',
        'Comprueba tu conexión e inténtalo nuevamente.',
        { tone: 'error' },
      )
    }
  }

  return (
    <ScreenContainer padded={false}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text accessibilityRole="header" style={styles.title}>
            Mi perfil
          </Text>
        </View>

        <Pressable
          accessible={false}
          onPress={() => setName(profile?.fullName ?? '')}
          style={({ pressed }) => [styles.identity, pressed && styles.identityPressed]}
        >
          <View style={styles.avatarWrap}>
            <Avatar
              name={profile?.fullName || 'Usuario'}
              id={profile?.id || 'user'}
              avatarPath={profile?.avatarUrl}
              size={76}
            />
            <Pressable
              accessibilityLabel="Cambiar foto de perfil"
              accessibilityRole="button"
              accessibilityState={{
                disabled:
                  !profile?.organizationActive || uploadPhoto.isPending || clearPhoto.isPending,
              }}
              disabled={
                !profile?.organizationActive || uploadPhoto.isPending || clearPhoto.isPending
              }
              onPress={() => setPhotoSheetOpen(true)}
              style={styles.cameraTouchTarget}
            >
              <View style={styles.cameraCircle} testID="profile-camera-circle">
                <Icon name="camera" color={colors.white} size={16} />
              </View>
            </Pressable>
          </View>
          <View style={styles.identityDetails}>
            <View style={styles.nameRow}>
              <Text style={styles.identityName} numberOfLines={2}>
                {profile?.fullName || 'Usuario sin nombre'}
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Editar nombre"
                onPress={() => setName(profile?.fullName ?? '')}
                style={styles.editName}
              >
                <Text style={styles.editNameText}>Editar</Text>
              </Pressable>
            </View>
            {profile?.role ? (
              <Chip label={ROLE_LABELS[profile.role]} icon={ROLE_ICONS[profile.role]} tone="info" />
            ) : (
              <Text style={styles.roleFallback}>Sin rol</Text>
            )}
          </View>
        </Pressable>

        {name !== null ? (
          <View style={styles.nameEditor}>
            <FormField
              label="Nombre completo"
              maxLength={120}
              onChangeText={setName}
              value={name}
            />
            <View style={styles.nameActions}>
              <Button label="Guardar" loading={saving} onPress={() => void saveName()} />
              <Button label="Cancelar" variant="text" onPress={() => setName(null)} />
            </View>
          </View>
        ) : null}

        <View style={styles.dataList}>
          <View style={styles.dataRow}>
            <Text style={styles.dataLabel}>Empresa</Text>
            <Text style={styles.value} numberOfLines={1}>
              {profile?.organizationName || 'Sin empresa'}
            </Text>
          </View>
          <View style={styles.separator} />
          <View style={styles.dataRow}>
            <Text style={styles.dataLabel}>Área</Text>
            <Text style={styles.value} numberOfLines={1}>
              {profile?.areaName || 'Sin área asignada'}
            </Text>
          </View>
          <View style={styles.separator} />
          <View style={styles.dataRow}>
            <Text style={styles.dataLabel}>Correo</Text>
            <Text style={styles.value} numberOfLines={1} ellipsizeMode="middle">
              {session?.user.email || 'No disponible'}
            </Text>
          </View>
        </View>

        {platformAdmin.data === true ? (
          <>
            <Text style={styles.sectionHeading}>PLATAFORMA</Text>
            <Card style={[styles.settingsCard, styles.platformCard]}>
              <Pressable
                accessibilityLabel="Solicitudes de empresas"
                accessibilityRole="button"
                onPress={() => navigation.navigate('OrganizationRequests')}
                style={styles.settingRow}
              >
                <IconTile
                  icon="business-outline"
                  size={40}
                  backgroundColor={colors.primarySoft}
                  iconColor={colors.primary}
                />
                <View style={styles.settingText}>
                  <Text style={styles.settingLabel}>Solicitudes de empresas</Text>
                  <Text style={styles.settingDetail}>
                    {pendingOrganizations.isError
                      ? 'No se pudieron comprobar las solicitudes'
                      : pendingCount
                        ? `${pendingCount} por revisar`
                        : 'Sin solicitudes por revisar'}
                  </Text>
                </View>
                {pendingCount > 0 ? (
                  <View style={styles.countBadge}>
                    <Text style={styles.countBadgeText}>{pendingCount}</Text>
                  </View>
                ) : null}
                <Icon name="chevron-forward" color={colors.textMuted} size={18} />
              </Pressable>
            </Card>
          </>
        ) : null}
        <Text style={styles.sectionHeading}>AJUSTES</Text>
        <Card style={styles.settingsCard}>
          <SettingRow
            icon="color-palette-outline"
            label="Apariencia"
            detail="Modo claro"
            onPress={() => setSetting('appearance')}
          />
          <View style={styles.separator} />
          <SettingRow
            icon="notifications-outline"
            label="Notificaciones"
            detail="Permisos del teléfono"
            onPress={() => setSetting('notifications')}
          />
          <View style={styles.separator} />
          <SettingRow
            icon="shield-checkmark-outline"
            label="Permisos de tu rol"
            detail={profile?.role ? ROLE_LABELS[profile.role] : 'Sin rol'}
            onPress={() => setSetting('permissions')}
          />
        </Card>
        <Text style={styles.sectionHeading}>LEGAL</Text>
        <Card style={styles.settingsCard}>
          <SettingRow
            icon="shield-checkmark-outline"
            label="Política de privacidad"
            detail="Se abre en el navegador"
            trailingIcon="open-outline"
            accessibilityLabel="Abrir política de privacidad"
            accessibilityRole="link"
            onPress={() => void Linking.openURL(PRIVACY_POLICY_URL)}
          />
          <View style={styles.separator} />
          <SettingRow
            icon="document-text-outline"
            label="Términos y condiciones"
            detail="Se abre en el navegador"
            trailingIcon="open-outline"
            accessibilityLabel="Abrir términos y condiciones"
            accessibilityRole="link"
            onPress={() => void Linking.openURL(TERMS_URL)}
          />
        </Card>
        <Button
          label="Cerrar sesión"
          variant="danger"
          style={styles.logoutButton}
          onPress={() => confirmLogout(() => void handleLogout())}
        />
        <Pressable
          accessibilityLabel="Eliminar mi cuenta"
          accessibilityRole="button"
          onPress={() => navigation.navigate('DeleteAccount')}
          style={styles.deleteAccountLink}
        >
          <Icon name="trash-outline" color={colors.error} size={18} />
          <Text style={styles.deleteAccountText}>Eliminar mi cuenta</Text>
        </Pressable>
        <Text style={styles.version}>Nexo Casos · versión {appConfig.expo.version}</Text>
      </ScrollView>
      <BottomSheet
        visible={photoSheetOpen}
        title="Foto de perfil"
        onClose={() => setPhotoSheetOpen(false)}
        fitContent
      >
        <Button label="Tomar foto" onPress={() => void pickPhoto('camera')} />
        <Button
          label="Elegir de galería"
          variant="secondary"
          onPress={() => void pickPhoto('library')}
        />
        {profile?.avatarUrl ? (
          <Button label="Quitar foto" variant="text" onPress={() => void removePhoto()} />
        ) : null}
      </BottomSheet>
      <BottomSheet
        visible={setting !== null}
        title={
          setting === 'appearance'
            ? 'Apariencia'
            : setting === 'notifications'
              ? 'Notificaciones'
              : 'Permisos de tu rol'
        }
        onClose={() => setSetting(null)}
        fitContent
      >
        <Text style={styles.sheetText}>
          {setting === 'appearance'
            ? 'Por ahora Nexo Casos usa el modo claro. El modo oscuro estará disponible más adelante.'
            : setting === 'notifications'
              ? 'Los avisos de tus solicitudes aparecen en Inicio. Puedes cambiar los permisos de notificaciones en los ajustes del teléfono.'
              : profile?.role
                ? `${ROLE_DESCRIPTIONS[profile.role]} Las acciones disponibles en cada solicitud las decide el servidor.`
                : 'Aún no tienes un rol asignado.'}
        </Text>
        {setting === 'notifications' ? (
          <Button label="Abrir ajustes del teléfono" onPress={() => void Linking.openSettings()} />
        ) : null}
      </BottomSheet>
    </ScreenContainer>
  )
}

function SettingRow({
  icon,
  label,
  detail,
  onPress,
  trailingIcon = 'chevron-forward',
  accessibilityLabel = label,
  accessibilityRole = 'button',
}: {
  icon: IconName
  label: string
  detail: string
  onPress: () => void
  trailingIcon?: IconName
  accessibilityLabel?: string
  accessibilityRole?: 'button' | 'link'
}) {
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole={accessibilityRole}
      onPress={onPress}
      style={({ pressed }) => [styles.settingRow, pressed && styles.settingPressed]}
    >
      <IconTile icon={icon} size={40} backgroundColor={colors.surface} iconColor={colors.ink} />
      <View style={styles.settingText}>
        <Text style={styles.settingLabel}>{label}</Text>
        <Text style={styles.settingDetail}>{detail}</Text>
      </View>
      <Icon name={trailingIcon} color={colors.textMuted} size={18} />
    </Pressable>
  )
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, gap: spacing.lg, padding: spacing.lg, paddingBottom: spacing.xl },
  header: { gap: spacing.sm },
  title: { ...typography.display, color: colors.text },
  identity: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  identityPressed: { backgroundColor: colors.surfaceMuted },
  avatarWrap: { width: 76, height: 76 },
  cameraTouchTarget: {
    position: 'absolute',
    right: -8,
    bottom: -8,
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraCircle: {
    width: 32,
    height: 32,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.background,
  },
  identityDetails: { flex: 1, alignItems: 'flex-start', gap: spacing.xs },
  identityName: { ...typography.title, color: colors.text, flex: 1 },
  nameRow: { width: '100%', flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  nameEditor: { gap: spacing.sm },
  nameActions: { flexDirection: 'row', gap: spacing.sm },
  editName: {
    minWidth: 64,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceMuted,
  },
  editNameText: { ...typography.label, color: colors.primary },
  roleFallback: { ...typography.body, color: colors.textMuted },
  dataList: { borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.border },
  dataRow: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  dataLabel: { ...typography.caption, color: colors.textMuted, width: 72 },
  value: {
    ...typography.body,
    fontFamily: fonts.semibold,
    color: colors.ink,
    flex: 1,
    textAlign: 'right',
  },
  separator: { height: 1, backgroundColor: colors.border },
  sectionHeading: { ...typography.overline, color: colors.textMuted },
  settingsCard: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs },
  platformCard: { backgroundColor: colors.surfaceMuted },
  settingRow: { minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  settingPressed: { backgroundColor: colors.surfaceMuted },
  settingText: { flex: 1 },
  settingLabel: { ...typography.body, color: colors.text },
  settingDetail: { ...typography.caption, color: colors.textMuted },
  countBadge: {
    minWidth: 24,
    height: 24,
    paddingHorizontal: 5,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
  },
  countBadgeText: { ...typography.caption, color: colors.white, fontFamily: fonts.bold },
  sheetText: { ...typography.body, color: colors.text },
  logoutButton: {
    minHeight: 52,
    borderWidth: 1,
    borderColor: colors.dangerBorder,
    backgroundColor: colors.background,
  },
  deleteAccountLink: {
    minHeight: 44,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  deleteAccountText: { ...typography.body, color: colors.error, fontFamily: fonts.semibold },
  version: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 'auto',
  },
})
