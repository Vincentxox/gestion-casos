import type { View } from 'react-native'

export function measureNotificationView(
  view: View | null,
  callback: (x: number, y: number, width: number, height: number) => void,
) {
  view?.measureInWindow(callback)
}
