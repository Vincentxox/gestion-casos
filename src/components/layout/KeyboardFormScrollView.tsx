import { type PropsWithChildren, useEffect, useState } from 'react'
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  type ScrollViewProps,
  type StyleProp,
  StyleSheet,
  type ViewStyle,
} from 'react-native'

type Props = PropsWithChildren<{
  contentContainerStyle?: ScrollViewProps['contentContainerStyle']
  keyboardVerticalOffset?: number
  style?: StyleProp<ViewStyle>
}>

/**
 * Provides consistent keyboard avoidance and scrolling for data-entry screens.
 * Use only for forms; virtualized lists should manage their own scrolling.
 */
export function KeyboardFormScrollView({
  children,
  contentContainerStyle,
  keyboardVerticalOffset = 0,
  style,
}: Props) {
  const [androidKeyboardHeight, setAndroidKeyboardHeight] = useState(0)

  useEffect(() => {
    if (Platform.OS !== 'android') return

    const showSubscription = Keyboard.addListener('keyboardDidShow', (event) => {
      setAndroidKeyboardHeight(event.endCoordinates.height)
    })
    const hideSubscription = Keyboard.addListener('keyboardDidHide', () => {
      setAndroidKeyboardHeight(0)
    })

    return () => {
      showSubscription.remove()
      hideSubscription.remove()
    }
  }, [])

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={keyboardVerticalOffset}
      style={[styles.container, style]}
    >
      <ScrollView
        contentContainerStyle={[
          contentContainerStyle,
          androidKeyboardHeight > 0 ? { paddingBottom: androidKeyboardHeight } : null,
        ]}
        keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
})
