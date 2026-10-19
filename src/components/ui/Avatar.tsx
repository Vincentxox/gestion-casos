import { useState, type ReactNode } from 'react'
import { Image } from 'expo-image'
import { StyleSheet, Text, View } from 'react-native'

import { useSignedProfilePhoto } from '@/features/settings/useSignedProfilePhoto'
import { colors, fonts, radius, typography } from '@/theme/tokens'

const palette = [colors.primary, colors.purple, colors.success, colors.neutral] as const

export function avatarInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  return parts.length
    ? `${parts[0]?.[0] ?? ''}${parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : ''}`.toLocaleUpperCase(
        'es',
      )
    : '?'
}

export function avatarColor(id: string): string {
  let hash = 0
  for (const character of id) hash = (hash * 31 + character.charCodeAt(0)) >>> 0
  return palette[hash % palette.length] ?? colors.primary
}

export function Avatar({
  name,
  id,
  size = 44,
  tone = 'default',
  avatarPath,
}: {
  name: string
  id: string
  size?: 24 | 28 | 44 | 72 | 76
  tone?: 'default' | 'neutral'
  avatarPath?: string | null
}) {
  const initials = (
    <Text style={[styles.initials, size <= 28 && styles.small, size >= 72 && styles.large]}>
      {avatarInitials(name)}
    </Text>
  )
  return (
    <View
      accessibilityLabel={name}
      style={[
        styles.avatar,
        {
          width: size,
          height: size,
          borderRadius: radius.pill,
          backgroundColor: tone === 'neutral' ? colors.neutral : avatarColor(id),
        },
      ]}
    >
      {avatarPath ? (
        <AvatarPhoto key={avatarPath} path={avatarPath} initials={initials} />
      ) : (
        initials
      )}
    </View>
  )
}

function AvatarPhoto({ path, initials }: { path: string; initials: ReactNode }) {
  const photo = useSignedProfilePhoto(path)
  const [failedUrl, setFailedUrl] = useState<string | null>(null)
  const signedUrl = photo.data && failedUrl !== photo.data ? photo.data : null
  if (!signedUrl) return initials
  return (
    <Image
      cachePolicy="memory-disk"
      contentFit="cover"
      onError={() => setFailedUrl(signedUrl)}
      source={{ uri: signedUrl, cacheKey: path }}
      style={styles.photo}
      testID="avatar-photo"
    />
  )
}

const styles = StyleSheet.create({
  avatar: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  photo: { width: '100%', height: '100%' },
  initials: { ...typography.body, color: colors.white, fontFamily: fonts.extrabold },
  small: { ...typography.overline },
  large: { ...typography.display, color: colors.white },
})
