import 'react-native-gesture-handler/jestSetup'

jest.mock('react-native-gesture-handler/ReanimatedSwipeable', () => {
  const React = require('react')
  const { View } = require('react-native')
  return {
    __esModule: true,
    default: React.forwardRef(({ children, ...props }: { children: unknown }, ref: unknown) => {
      React.useImperativeHandle(ref, () => ({ close: jest.fn() }))
      return React.createElement(
        View,
        { testID: 'mock-swipeable', swipeableProps: props },
        children,
      )
    }),
  }
})

jest.mock('react-native-reanimated', () => {
  const { View } = require('react-native')
  return {
    __esModule: true,
    default: { View },
    useAnimatedStyle: () => ({}),
    useAnimatedReaction: jest.fn(),
    runOnJS: (callback: (...args: unknown[]) => unknown) => callback,
    useReducedMotion: () => true,
    useSharedValue: (value: number) => ({ value, set: jest.fn() }),
    withTiming: (value: number) => value,
    withRepeat: (value: number) => value,
    cancelAnimation: jest.fn(),
  }
})

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
)
