import { useMemo, useRef, useState } from 'react'
import { PanResponder, Pressable, StyleSheet, Text, View } from 'react-native'
import Svg, { Path } from 'react-native-svg'

import { Button } from '@/components/ui/Button'
import { BottomSheet } from '@/components/sheets/BottomSheet'
import { Icon } from '@/components/ui/Icon'
import { colors, radius, spacing, typography } from '@/theme/tokens'

import {
  appendSignatureSegment,
  clampSignaturePoint,
  signaturePath,
  type Point,
} from '../signaturePath'

export const CONSENT_TEXT = 'Confirmo que revisé este reporte y estoy de acuerdo con su contenido.'

export function SignatureSheet({
  visible,
  title,
  name,
  role,
  buttonLabel,
  loading,
  onClose,
  onSign,
}: {
  visible: boolean
  title: string
  name: string
  role: string
  buttonLabel: string
  loading: boolean
  onClose: () => void
  onSign: (path: string) => Promise<void>
}) {
  const [display, setDisplay] = useState<Point[][]>([])
  const [size, setSize] = useState({ width: 0, height: 0 })
  const gestureRef = useRef<{ start: Point | null; previous: Point | null }>({
    start: null,
    previous: null,
  })
  const [accepted, setAccepted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const pan = useMemo(() => {
    // PanResponder invokes these callbacks on touch events, never while rendering.
    // eslint-disable-next-line react-hooks/refs
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (event) => {
        if (size.width <= 0 || size.height <= 0) return
        const start = { x: event.nativeEvent.locationX, y: event.nativeEvent.locationY }
        if (!Number.isFinite(start.x) || !Number.isFinite(start.y)) return
        gestureRef.current.start = start
        const point = clampSignaturePoint(start, size.width, size.height, spacing.sm)
        gestureRef.current.previous = point
        setDisplay((current) => [...current, [point]])
      },
      onPanResponderMove: (_, gesture) => {
        const { start, previous } = gestureRef.current
        if (!start || !previous) return
        const from = previous
        const to = { x: start.x + gesture.dx, y: start.y + gesture.dy }
        if (!Number.isFinite(to.x) || !Number.isFinite(to.y)) return
        gestureRef.current.previous = to
        setDisplay((current) =>
          appendSignatureSegment(current, from, to, size.width, size.height, spacing.sm),
        )
      },
      onPanResponderRelease: () => {
        gestureRef.current = { start: null, previous: null }
      },
      onPanResponderTerminate: () => {
        gestureRef.current = { start: null, previous: null }
      },
    })
  }, [size.width, size.height])

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
    <BottomSheet
      title={title}
      subtitle={`${name} · ${role}`}
      visible={visible}
      onClose={onClose}
      height="82%"
      scrollable={false}
      footerAction={{
        label: buttonLabel,
        onPress: () => void confirm(),
        loading,
        disabled: !accepted || display.length === 0,
      }}
    >
      <View style={styles.canvasHeading}>
        <Text style={styles.note}>Dibuja tu firma</Text>
        <Button label="Borrar" variant="text" disabled={loading} onPress={clear} />
      </View>
      <View style={styles.canvas}>
        <View
          accessibilityLabel="Área para dibujar tu firma"
          style={styles.drawingArea}
          onLayout={(event) => {
            const { width, height } = event.nativeEvent.layout
            setSize({ width, height })
          }}
          {...pan.panHandlers}
        >
          <Svg pointerEvents="none" width="100%" height="100%">
            <Path d={preview} stroke={colors.text} strokeWidth={2} fill="none" />
          </Svg>
          <View pointerEvents="none" style={styles.guide} />
        </View>
      </View>
      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked: accepted }}
        onPress={() => setAccepted((current) => !current)}
        style={styles.consent}
      >
        <Icon
          name={accepted ? 'checkbox' : 'square-outline'}
          color={accepted ? colors.primary : colors.textMuted}
        />
        <Text style={[styles.copy, styles.consentText]}>{CONSENT_TEXT}</Text>
      </Pressable>
      <Text style={styles.note}>La fecha, la hora y el dispositivo los registra el servidor.</Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </BottomSheet>
  )
}

const styles = StyleSheet.create({
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
  canvasHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  drawingArea: { flex: 1 },
  guide: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    bottom: 28,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  consent: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  consentText: { flex: 1 },
  note: { ...typography.caption, color: colors.textMuted },
  error: { ...typography.caption, color: colors.error },
})
