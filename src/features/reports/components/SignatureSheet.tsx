import { useMemo, useState } from 'react'
import { Modal, PanResponder, Pressable, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import Svg, { Path } from 'react-native-svg'

import { Button } from '@/components/ui/Button'
import { colors, radius, spacing, typography } from '@/theme/tokens'

import { signaturePath, type Point } from '../signaturePath'

export const CONSENT_TEXT = 'Confirmo que revisé este reporte y estoy de acuerdo con su contenido.'

export function SignatureSheet({
  visible,
  title,
  name,
  role,
  loading,
  onClose,
  onSign,
}: {
  visible: boolean
  title: string
  name: string
  role: string
  loading: boolean
  onClose: () => void
  onSign: (path: string) => Promise<void>
}) {
  const [display, setDisplay] = useState<Point[][]>([])
  const [size, setSize] = useState({ width: 0, height: 0 })
  const [accepted, setAccepted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const pan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (event) => {
          const point = { x: event.nativeEvent.locationX, y: event.nativeEvent.locationY }
          setDisplay((current) => [...current, [point]])
        },
        onPanResponderMove: (event) => {
          const point = { x: event.nativeEvent.locationX, y: event.nativeEvent.locationY }
          setDisplay((current) => {
            if (!current.length) return current
            return [...current.slice(0, -1), [...current[current.length - 1]!, point]]
          })
        },
      }),
    [],
  )

  const preview = display
    .map((stroke) =>
      stroke.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' '),
    )
    .join(' ')

  async function confirm() {
    if (!accepted) return
    try {
      const path = signaturePath(display, size.width, size.height)
      setError(null)
      await onSign(path)
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : 'No fue posible firmar. Inténtalo de nuevo.',
      )
    }
  }

  function clear() {
    setDisplay([])
    setError(null)
  }

  return (
    <Modal animationType="slide" transparent visible={visible} onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <SafeAreaView edges={['bottom']} style={styles.sheet}>
          <Text accessibilityRole="header" style={styles.title}>
            {title}
          </Text>
          <Text style={styles.copy}>
            {name} · {role}
          </Text>
          <View
            accessibilityLabel="Área para dibujar tu firma"
            style={styles.canvas}
            onLayout={(event) => setSize(event.nativeEvent.layout)}
            {...pan.panHandlers}
          >
            <Svg pointerEvents="none" width="100%" height="100%">
              <Path d={preview} stroke={colors.text} strokeWidth={2} fill="none" />
            </Svg>
            <View pointerEvents="none" style={styles.guide} />
          </View>
          <Pressable
            accessibilityRole="checkbox"
            accessibilityState={{ checked: accepted }}
            onPress={() => setAccepted((current) => !current)}
            style={styles.consent}
          >
            <Text style={styles.copy}>
              {accepted ? '☑' : '☐'} {CONSENT_TEXT}
            </Text>
          </Pressable>
          <Text style={styles.note}>
            La fecha, la hora y el dispositivo los registra el servidor.
          </Text>
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <View style={styles.actions}>
            <Button label="Borrar" variant="secondary" disabled={loading} onPress={clear} />
            <Button label="Cancelar" variant="secondary" disabled={loading} onPress={onClose} />
          </View>
          <Button
            label="Firmar"
            loading={loading}
            disabled={!accepted || display.length === 0}
            onPress={() => void confirm()}
          />
        </SafeAreaView>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: colors.backdrop },
  sheet: {
    minHeight: '70%',
    gap: spacing.md,
    padding: spacing.lg,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    backgroundColor: colors.surface,
  },
  title: { ...typography.title, color: colors.text },
  copy: { ...typography.body, color: colors.text },
  canvas: {
    flex: 1,
    minHeight: 180,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.white,
    overflow: 'hidden',
  },
  guide: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    bottom: 28,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  consent: { minHeight: 44, justifyContent: 'center' },
  note: { ...typography.caption, color: colors.textMuted },
  error: { ...typography.caption, color: colors.error },
  actions: { flexDirection: 'row', justifyContent: 'space-around', gap: spacing.sm },
})
