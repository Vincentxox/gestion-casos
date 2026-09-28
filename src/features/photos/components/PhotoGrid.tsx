import { useQueryClient } from '@tanstack/react-query'
import { useNetInfo } from '@react-native-community/netinfo'
import { Image } from 'expo-image'
import * as ImagePicker from 'expo-image-picker'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { ActionSheet } from '@/components/actions/ActionSheet'
import { Button } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'
import { colors, radius, spacing, typography } from '@/theme/tokens'

import { preparePhoto } from '../imagePreparation'
import { useCasePhotos, useDeletePhoto, usePhotoUrl, photosQueryKey } from '../usePhotos'
import {
  discardPendingPhoto,
  enqueuePhoto,
  listPendingPhotos,
  resumePendingPhotos,
  subscribePendingPhotos,
} from '../uploadQueue'
import type { CasePhoto, PendingPhoto, PhotoKind } from '../types'

function ConfirmedTile({
  photo,
  label,
  onPress,
  onOptions,
}: {
  photo: CasePhoto
  label: string
  onPress: () => void
  onOptions?: () => void
}) {
  const url = usePhotoUrl(photo.thumbPath)
  return (
    <View style={styles.slot}>
      <Pressable
        accessibilityLabel={`Ver foto ${label}`}
        accessibilityRole="button"
        onPress={onPress}
        style={styles.imagePress}
      >
        {url.data ? (
          <Image
            source={{ uri: url.data, cacheKey: photo.thumbPath }}
            cachePolicy="disk"
            style={styles.image}
          />
        ) : (
          <Icon name="image-outline" color={colors.textMuted} />
        )}
      </Pressable>
      {onOptions ? (
        <Pressable
          accessibilityLabel={`Opciones de foto ${label}`}
          accessibilityRole="button"
          onPress={onOptions}
          style={styles.options}
        >
          <View style={styles.optionsBubble}>
            <Icon name="ellipsis-horizontal" size="inline" color={colors.white} />
          </View>
        </Pressable>
      ) : null}
    </View>
  )
}

function PhotoViewer({
  photo,
  label,
  onClose,
}: {
  photo: CasePhoto | null
  label: string
  onClose: () => void
}) {
  const url = usePhotoUrl(photo?.imagePath)
  return (
    <Modal animationType="fade" visible={Boolean(photo)} onRequestClose={onClose}>
      <SafeAreaView style={styles.viewer}>
        <Text style={styles.viewerTitle}>{label}</Text>
        {url.data && photo ? (
          <Image
            source={{ uri: url.data, cacheKey: photo.imagePath }}
            cachePolicy="disk"
            contentFit="contain"
            style={styles.fullImage}
          />
        ) : (
          <ActivityIndicator color={colors.white} />
        )}
        <Button label="Cerrar" variant="secondary" onPress={onClose} />
      </SafeAreaView>
    </Modal>
  )
}

export function PhotoGrid({
  caseId,
  kind,
  userId,
  editable,
}: {
  caseId: string
  kind: PhotoKind
  userId: string | undefined
  editable: boolean
}) {
  const client = useQueryClient()
  const network = useNetInfo()
  const photos = useCasePhotos(caseId)
  const remove = useDeletePhoto(caseId)
  const [pending, setPending] = useState<PendingPhoto[]>([])
  const [pickerVisible, setPickerVisible] = useState(false)
  const [selectedPhoto, setSelectedPhoto] = useState<CasePhoto | null>(null)
  const [optionsPhoto, setOptionsPhoto] = useState<CasePhoto | null>(null)
  const [deletePhoto, setDeletePhoto] = useState<CasePhoto | null>(null)
  const [discardPhoto, setDiscardPhoto] = useState<PendingPhoto | null>(null)
  const [discardBusy, setDiscardBusy] = useState(false)
  const [discardError, setDiscardError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const queueReadVersion = useRef(0)
  const label = kind === 'antes' ? 'Antes' : 'Después'
  const confirmed = (photos.data ?? []).filter((photo) => photo.kind === kind)
  const queued = pending.filter((photo) => photo.kind === kind)
  const offline = network.isConnected === false || network.isInternetReachable === false

  const refreshQueue = useCallback(async () => {
    if (!userId) return
    const version = ++queueReadVersion.current
    const entries = await listPendingPhotos(userId, caseId)
    if (version === queueReadVersion.current) setPending(entries)
  }, [userId, caseId])

  const resume = useCallback(
    async (mode: 'startup' | 'manual' = 'startup', onlyLocalId?: string) => {
      if (!userId) return
      setBusy(true)
      try {
        await resumePendingPhotos(
          userId,
          (changedCase) => {
            void client.invalidateQueries({ queryKey: [...photosQueryKey, changedCase] })
          },
          mode,
          onlyLocalId,
        )
        await refreshQueue()
      } finally {
        setBusy(false)
      }
    },
    [userId, client, refreshQueue],
  )

  useEffect(() => {
    if (!userId) return
    return subscribePendingPhotos(userId, caseId, () => void refreshQueue())
  }, [userId, caseId, refreshQueue])

  useEffect(() => {
    const timer = setTimeout(() => void resume(), 0)
    return () => clearTimeout(timer)
  }, [resume])

  async function pick(source: 'camera' | 'library') {
    setPickerVisible(false)
    const permission =
      source === 'camera'
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!permission.granted) {
      Alert.alert(
        'Permiso necesario',
        `Activa el acceso a ${source === 'camera' ? 'la cámara' : 'las fotos'} en los ajustes del teléfono.`,
        [{ text: 'Volver' }, { text: 'Abrir ajustes', onPress: () => void Linking.openSettings() }],
      )
      return
    }
    const result =
      source === 'camera'
        ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 1 })
        : await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsMultipleSelection: false,
            quality: 1,
          })
    if (result.canceled || !result.assets[0] || !userId) return
    setBusy(true)
    try {
      const asset = result.assets[0]
      const prepared = await preparePhoto(asset.uri, asset.width, asset.height)
      await enqueuePhoto(userId, caseId, kind, prepared)
      await refreshQueue()
      await resume()
    } catch (error) {
      Alert.alert(
        'No fue posible preparar la foto',
        error instanceof Error ? error.message : 'Inténtalo de nuevo.',
      )
    } finally {
      setBusy(false)
    }
  }

  async function confirmDelete() {
    if (!deletePhoto) return
    try {
      await remove.mutateAsync(deletePhoto)
      setDeletePhoto(null)
    } catch (error) {
      Alert.alert(
        'No fue posible eliminar la foto',
        error instanceof Error ? error.message : 'Inténtalo de nuevo.',
      )
    }
  }

  async function confirmDiscard() {
    if (!userId || !discardPhoto) return
    setDiscardBusy(true)
    try {
      await discardPendingPhoto(userId, discardPhoto.localId)
      await refreshQueue()
      setDiscardPhoto(null)
      setDiscardError(null)
    } catch (error) {
      setDiscardError(error instanceof Error ? error.message : 'No fue posible descartar la foto.')
    } finally {
      setDiscardBusy(false)
    }
  }

  const slots = Array.from({ length: 3 }, (_, index) => ({
    confirmedPhoto: confirmed[index],
    pendingPhoto: queued[index - confirmed.length],
    index,
  }))

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        Fotos de {label.toLowerCase()} · {confirmed.length} de 3
      </Text>
      {!editable && confirmed.length === 0 ? (
        <Text style={styles.description}>Sin fotos de {label.toLowerCase()}</Text>
      ) : (
        <View style={styles.row}>
          {slots.map(({ confirmedPhoto, pendingPhoto, index }) =>
            confirmedPhoto ? (
              <ConfirmedTile
                key={confirmedPhoto.id}
                photo={confirmedPhoto}
                label={`${label} ${index + 1}`}
                onPress={() => setSelectedPhoto(confirmedPhoto)}
                onOptions={editable ? () => setOptionsPhoto(confirmedPhoto) : undefined}
              />
            ) : pendingPhoto ? (
              <View key={pendingPhoto.localId} style={styles.slot}>
                <Image source={{ uri: pendingPhoto.thumbUri }} style={styles.image} />
                <View style={styles.pendingOverlay}>
                  {offline && (pendingPhoto.status !== 'error' || pendingPhoto.retryOnReconnect) ? (
                    <Text style={styles.pendingLabel}>Sin conexión; se subirá al reconectar</Text>
                  ) : pendingPhoto.status === 'error' ? (
                    <Pressable
                      accessibilityLabel={`Reintentar foto ${label} ${index + 1}`}
                      onPress={() => void resume('manual', pendingPhoto.localId)}
                      style={styles.pendingAction}
                    >
                      <Text style={styles.pendingLabel}>Error · Reintentar</Text>
                    </Pressable>
                  ) : (
                    <Text style={styles.pendingLabel}>Subiendo…</Text>
                  )}
                </View>
              </View>
            ) : editable && confirmed.length + queued.length < 3 ? (
              <Pressable
                key={index}
                accessibilityLabel={`Agregar foto de ${label.toLowerCase()}`}
                accessibilityRole="button"
                onPress={() => setPickerVisible(true)}
                style={[styles.slot, styles.emptySlot]}
              >
                <Icon name="camera-outline" color={colors.primary} />
                <Text style={styles.addLabel}>Agregar</Text>
              </Pressable>
            ) : editable ? (
              <View key={index} style={[styles.slot, styles.emptySlot]} />
            ) : null,
          )}
        </View>
      )}
      {queued
        .filter((photo) => photo.status === 'error')
        .map((photo) => (
          <View key={photo.localId} style={styles.errorRow}>
            <Text style={styles.error}>
              {offline && photo.retryOnReconnect
                ? 'Sin conexión; se subirá al reconectar'
                : (photo.error ?? 'No fue posible subir la foto.')}
            </Text>
            <Button
              label="Descartar"
              variant="text"
              accessibilityLabel={`Descartar foto de ${label.toLowerCase()} con error`}
              onPress={() => {
                setDiscardError(null)
                setDiscardPhoto(photo)
              }}
            />
          </View>
        ))}
      {photos.isError ? (
        <Text style={styles.error}>
          No fue posible cargar las fotos.{' '}
          <Text onPress={() => void photos.refetch()}>Reintentar</Text>
        </Text>
      ) : null}
      {busy ? <ActivityIndicator color={colors.primary} /> : null}
      <ActionSheet<'camera' | 'library'>
        title={`Agregar foto de ${label.toLowerCase()}`}
        actions={[
          { id: 'camera', label: 'Tomar foto', icon: 'camera-outline' },
          { id: 'library', label: 'Elegir de la galería', icon: 'images-outline' },
        ]}
        visible={pickerVisible}
        onClose={() => setPickerVisible(false)}
        onSelect={(source) => void pick(source)}
      />
      <ActionSheet<'delete'>
        title="Opciones de foto"
        actions={[
          { id: 'delete', label: 'Eliminar foto', icon: 'trash-outline', destructive: true },
        ]}
        visible={Boolean(optionsPhoto)}
        onClose={() => setOptionsPhoto(null)}
        onSelect={() => {
          setDeletePhoto(optionsPhoto)
          setOptionsPhoto(null)
        }}
      />
      <Modal
        animationType="fade"
        transparent
        visible={Boolean(deletePhoto)}
        onRequestClose={() => setDeletePhoto(null)}
      >
        <View style={styles.confirmBackdrop}>
          <View style={styles.confirmCard}>
            <Text style={styles.title}>Eliminar foto</Text>
            <Text style={styles.description}>
              ¿Deseas eliminar esta foto? Esta acción no se puede deshacer.
            </Text>
            <Button
              label="Eliminar foto"
              variant="danger"
              loading={remove.isPending}
              onPress={() => void confirmDelete()}
            />
            <Button
              label="Conservar foto"
              variant="secondary"
              onPress={() => setDeletePhoto(null)}
            />
          </View>
        </View>
      </Modal>
      <Modal
        animationType="fade"
        transparent
        visible={Boolean(discardPhoto)}
        onRequestClose={() => setDiscardPhoto(null)}
      >
        <View style={styles.confirmBackdrop}>
          <View style={styles.confirmCard}>
            <Text accessibilityRole="header" style={styles.title}>
              Descartar foto pendiente
            </Text>
            <Text style={styles.description}>
              Se borrará la foto de este teléfono y se quitará de la cola. Esta acción no se puede
              deshacer.
            </Text>
            {discardError ? <Text style={styles.error}>{discardError}</Text> : null}
            <Button
              label="Descartar foto"
              variant="danger"
              loading={discardBusy}
              onPress={() => void confirmDiscard()}
            />
            <Button
              label="Conservar foto"
              variant="secondary"
              disabled={discardBusy}
              onPress={() => setDiscardPhoto(null)}
            />
          </View>
        </View>
      </Modal>
      <PhotoViewer
        photo={selectedPhoto}
        label={`${label} · ${confirmed.findIndex((photo) => photo.id === selectedPhoto?.id) + 1} de ${confirmed.length}`}
        onClose={() => setSelectedPhoto(null)}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { gap: spacing.sm },
  title: { ...typography.heading, color: colors.text },
  description: { ...typography.body, color: colors.textMuted },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  slot: {
    width: 96,
    height: 96,
    borderRadius: radius.md,
    overflow: 'hidden',
    backgroundColor: colors.neutralSoft,
  },
  emptySlot: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imagePress: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  image: { width: '100%', height: '100%' },
  options: {
    position: 'absolute',
    top: 0,
    right: 0,
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionsBubble: {
    width: 28,
    height: 28,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.backdrop,
  },
  pendingOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing.xs,
    backgroundColor: colors.backdrop,
  },
  pendingLabel: { ...typography.caption, color: colors.white, textAlign: 'center' },
  pendingAction: { minHeight: 44, justifyContent: 'center' },
  addLabel: { ...typography.caption, color: colors.primary },
  error: { ...typography.caption, color: colors.error },
  errorRow: { gap: spacing.xs },
  viewer: {
    flex: 1,
    gap: spacing.md,
    padding: spacing.lg,
    backgroundColor: colors.text,
    justifyContent: 'center',
  },
  viewerTitle: { ...typography.title, color: colors.white },
  fullImage: { flex: 1 },
  confirmBackdrop: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing.lg,
    backgroundColor: colors.backdrop,
  },
  confirmCard: {
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
  },
})
