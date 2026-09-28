import { render, waitFor } from '@testing-library/react-native'
import { AccessibilityInfo, Animated } from 'react-native'

import { BrandIntroScreen } from '../BrandIntroScreen'

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}))

describe('BrandIntroScreen', () => {
  afterEach(() => jest.restoreAllMocks())

  it('muestra la marca, la versión y el progreso con movimiento reducido', async () => {
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true)
    const onFinish = jest.fn()
    const screen = await render(<BrandIntroScreen onFinish={onFinish} ready={false} />)

    expect(screen.getByText('Nexo Casos').props.numberOfLines).toBe(1)
    expect(screen.getByText('Conecta cada caso con su solución')).toBeTruthy()
    expect(screen.getByText('Versión 1.0.0')).toBeTruthy()
    expect(screen.getByLabelText('Cargando sesión')).toBeTruthy()
    await waitFor(() => expect(screen.getByLabelText('Cargando sesión').children).toHaveLength(1))
    expect(onFinish).not.toHaveBeenCalled()
  })

  it('omite las animaciones y espera a que la sesión esté lista', async () => {
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true)
    const timing = jest.spyOn(Animated, 'timing')
    const onFinish = jest.fn()
    await render(<BrandIntroScreen onFinish={onFinish} ready />)

    await waitFor(() => expect(onFinish).toHaveBeenCalledTimes(1), { timeout: 1500 })
    expect(timing).not.toHaveBeenCalled()
  })
})
