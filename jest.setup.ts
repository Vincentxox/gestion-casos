jest.mock('react-native-reanimated', () => {
  const { View } = require('react-native')
  return {
    __esModule: true,
    default: { View },
    useAnimatedStyle: () => ({}),
    useReducedMotion: () => true,
    useSharedValue: (value: number) => ({ value, set: jest.fn() }),
    withTiming: (value: number) => value,
    withRepeat: (value: number) => value,
    cancelAnimation: jest.fn(),
  }
})
