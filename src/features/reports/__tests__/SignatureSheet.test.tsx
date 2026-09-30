import { fireEvent, render, waitFor } from '@testing-library/react-native'
import { SafeAreaProvider } from 'react-native-safe-area-context'

import { CONSENT_TEXT, SignatureSheet } from '../components/SignatureSheet'

test('separa el trazo al salir y volver al margen aunque Android cambie locationX/Y', async () => {
  const onSign = jest.fn().mockResolvedValue(undefined)
  const screen = await render(
    <SafeAreaProvider
      initialMetrics={{
        frame: { x: 0, y: 0, width: 400, height: 800 },
        insets: { top: 0, right: 0, bottom: 0, left: 0 },
      }}
    >
      <SignatureSheet
        visible
        title="Firma de conformidad"
        name="Persona"
        role="Administrador"
        buttonLabel="Firmar conformidad"
        loading={false}
        onClose={jest.fn()}
        onSign={onSign}
      />
    </SafeAreaProvider>,
  )

  const area = screen.getByLabelText('Área para dibujar tu firma')
  await fireEvent(area, 'layout', {
    nativeEvent: { layout: { x: 0, y: 0, width: 100, height: 100 } },
  })
  const touchHistory = (
    timestamp: number,
    x: number,
    y: number,
    previousX: number,
    previousY: number,
  ) => ({
    touchBank: [
      {
        touchActive: true,
        currentTimeStamp: timestamp,
        currentPageX: x,
        currentPageY: y,
        previousPageX: previousX,
        previousPageY: previousY,
      },
    ],
    numberActiveTouches: 1,
    indexOfSingleActiveTouch: 0,
    mostRecentTimeStamp: timestamp,
  })
  await fireEvent(area, 'responderGrant', {
    nativeEvent: { locationX: 50, locationY: 50 },
    touchHistory: touchHistory(1, 50, 50, 50, 50),
  })
  await fireEvent(area, 'responderMove', {
    nativeEvent: { locationX: 2, locationY: 300 },
    touchHistory: touchHistory(2, 120, 70, 50, 50),
  })
  await fireEvent(area, 'responderMove', {
    nativeEvent: { locationX: 4, locationY: 300 },
    touchHistory: touchHistory(3, 140, 70, 120, 70),
  })
  await fireEvent(area, 'responderMove', {
    nativeEvent: { locationX: 999, locationY: -30 },
    touchHistory: touchHistory(4, 80, 80, 140, 70),
  })
  expect(screen.getByLabelText('Firmar conformidad').props.accessibilityState.disabled).toBe(true)

  await fireEvent.press(screen.getByText(CONSENT_TEXT))
  await fireEvent.press(screen.getByLabelText('Firmar conformidad'))

  await waitFor(() =>
    expect(onSign).toHaveBeenCalledWith('M 500 500 L 920 620 M 920 780 L 800 800'),
  )
})
