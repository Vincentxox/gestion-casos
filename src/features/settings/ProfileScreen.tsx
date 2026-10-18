import { getErrorMessage } from '@/utils/errorMessage'
import { AppFeedback } from '@/components/feedback/AppFeedback'
import * as ImagePicker from 'expo-image-picker'
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useState } from 'react'
import appConfig from '../../../app.json'

import { Button } from '@/components/ui/Button'
import { FormField } from '@/components/forms/FormField'
import { Icon } from '@/components/ui/Icon'
import { Avatar } from '@/components/ui/Avatar'
import { Card } from '@/components/ui/Card'
import { Chip } from '@/components/ui/Chip'
import { ScreenContainer } from '@/components/ui/ScreenContainer'
import { BottomSheet } from '@/components/sheets/BottomSheet'
import { ROLE_ICONS, ROLE_LABELS } from '@/features/auth/types'
import { confirmLogout } from '@/features/auth/confirmLogout'
import { useAuthStore } from '@/store/authStore'
import { colors, radius, spacing, typography } from '@/theme/tokens'
import { updateOwnName } from './profileService'
import { prepareProfilePhoto } from './profilePhotoPreparation'
import { useClearOwnProfilePhoto, useUploadOwnProfilePhoto } from './useProfilePhoto'

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

export function ProfileScreen() {
  const profile = useAuthStore((state) => state.profile)
  const session = useAuthStore((state) => state.session)
  const logout = useAuthStore((state) => state.logout)
  const applyOwnName = useAuthStore((state) => state.applyOwnName)
  const uploadPhoto = useUploadOwnProfilePhoto()
  const clearPhoto = useClearOwnProfilePhoto()
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
      AppFeedback.toast('Foto actualizada')
    } catch (error) {
      AppFeedback.show(
        'No fue posible cambiar la foto',
        getErrorMessage(error, 'Inténtalo de nuevo.'),
      )
    }
  }

  async function removePhoto() {
    setPhotoSheetOpen(false)
    if (!profile?.avatarUrl) return
    try {
      await clearPhoto.mutateAsync(profile.avatarUrl)
      AppFeedback.toast('Foto eliminada')
    } catch (error) {
      AppFeedback.show(
        'No fue posible quitar la foto',
        getErrorMessage(error, 'Inténtalo de nuevo.'),
      )
    }
  }

  async function saveName() {
    if (!profile) return
    setSaving(true)
    try {
      applyOwnName(await updateOwnName(profile.id, name ?? profile.fullName))
      setName(null)
      AppFeedback.toast('Nombre actualizado')
    } catch (error) {
      AppFeedback.show('No fue posible guardar', getErrorMessage(error, 'Inténtalo de nuevo.'))
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

        <View style={styles.identity}>
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
                <Icon name="create-outline" color={colors.primary} />
              </Pressable>
            </View>
            {profile?.role ? (
              <Chip label={ROLE_LABELS[profile.role]} icon={ROLE_ICONS[profile.role]} tone="info" />
            ) : (
              <Text style={styles.roleFallback}>Sin rol</Text>
            )}
          </View>
        </View>

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
            <Text style={styles.value} numberOfLines={1}>
              {session?.user.email || 'No disponible'}
            </Text>
          </View>
        </View>

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
        <Button
          label="Cerrar sesión"
          icon="log-out-outline"
          variant="danger"
          style={styles.logoutButton}
          onPress={() => confirmLogout(() => void handleLogout())}
        />
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
}: {
  icon: 'color-palette-outline' | 'notifications-outline' | 'shield-checkmark-outline'
  label: string
  detail: string
  onPress: () => void
}) {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      onPress={onPress}
      style={styles.settingRow}
    >
      <Icon name={icon} color={colors.primary} />
      <View style={styles.settingText}>
        <Text style={styles.settingLabel}>{label}</Text>
        <Text style={styles.settingDetail}>{detail}</Text>
      </View>
      <Icon name="chevron-forward" color={colors.textMuted} size={18} />
    </Pressable>
  )
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, gap: spacing.lg, padding: spacing.lg, paddingBottom: spacing.xl },
  header: { gap: spacing.sm },
  title: { ...typography.display, color: colors.text },
  identity: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
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
  editName: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  roleFallback: { ...typography.body, color: colors.textMuted },
  dataList: { borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.border },
  dataRow: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  dataLabel: { ...typography.caption, color: colors.textMuted, width: 72 },
  value: { ...typography.body, color: colors.text, flex: 1 },
  separator: { height: 1, backgroundColor: colors.border },
  sectionHeading: { ...typography.overline, color: colors.textMuted },
  settingsCard: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs },
  settingRow: { minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  settingText: { flex: 1 },
  settingLabel: { ...typography.body, color: colors.text },
  settingDetail: { ...typography.caption, color: colors.textMuted },
  sheetText: { ...typography.body, color: colors.text },
  logoutButton: {
    minHeight: 52,
    borderWidth: 1,
    borderColor: colors.dangerBorder,
    backgroundColor: colors.background,
  },
  version: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 'auto',
  },
})
