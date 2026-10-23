import { useCallback, useEffect, useRef, type ReactNode } from 'react'
import { View, type StyleProp, type ViewStyle } from 'react-native'

import type { TourTargetId } from '../helpContent'
import { useGuidedTour } from './useGuidedTour'

export function TourTarget({
  id,
  children,
  style,
}: {
  id: TourTargetId
  children: ReactNode
  style?: StyleProp<ViewStyle>
}) {
  const ref = useRef<View>(null)
  const active = useGuidedTour((state) => state.active && state.target === id)
  const setRect = useGuidedTour((state) => state.setRect)
  const measure = useCallback(() => {
    if (!active) return
    requestAnimationFrame(() =>
      ref.current?.measureInWindow((x, y, width, height) => {
        if (width > 0 && height > 0) setRect(id, { x, y, width, height })
      }),
    )
  }, [active, id, setRect])
  useEffect(() => {
    measure()
  }, [measure])
  return (
    <View ref={ref} collapsable={false} onLayout={measure} style={style}>
      {children}
    </View>
  )
}
