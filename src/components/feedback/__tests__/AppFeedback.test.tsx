import { act, fireEvent, render } from '@testing-library/react-native'
import { Pressable, Text } from 'react-native'
import { SafeAreaProvider } from 'react-native-safe-area-context'

import { AppFeedback, AppFeedbackProvider, useFeedback } from '../AppFeedback'

jest.mock('@/store/authStore', () => ({
  useAuthStore: (selector: (state: unknown) => unknown) =>
    selector({ status: 'authenticated', profile: { organizationId: 'org-1' } }),
}))

function Harness({ onDecision }: { onDecision: (value: boolean) => void }) {
  const { confirm, alert, toast } = useFeedback()
  return (
    <>
      <Pressable
        accessibilityLabel="Abrir confirmación"
        onPress={() => {
          void confirm({
            title: '¿Descartar?',
            message: 'No podrás recuperarlo.',
            tone: 'danger',
          }).then(onDecision)
        }}
      />
      <Pressable
        accessibilityLabel="Abrir aviso"
        onPress={() => void alert({ title: 'Sin conexión', message: 'Inténtalo de nuevo.' })}
      />
      <Pressable accessibilityLabel="Mostrar éxito" onPress={() => toast('Guardado')} />
      <Pressable
        accessibilityLabel="Abrir confirmación existente"
        onPress={() =>
          AppFeedback.show('Eliminar registro', '¿Deseas continuar?', [
            { text: 'Cancelar', style: 'cancel' },
            { text: 'Eliminar', style: 'destructive', onPress: () => onDecision(true) },
          ])
        }
      />
      <Text>Contenido</Text>
    </>
  )
}

async function setup(onDecision = jest.fn()) {
  return render(
    <SafeAreaProvider
      initialMetrics={{
        frame: { x: 0, y: 0, width: 400, height: 800 },
        insets: { top: 0, right: 0, bottom: 0, left: 0 },
      }}
    >
      <AppFeedbackProvider>
        <Harness onDecision={onDecision} />
      </AppFeedbackProvider>
    </SafeAreaProvider>,
  )
}

describe('AppFeedback', () => {
  test('resuelve confirmaciones y cancelaciones', async () => {
    const onDecision = jest.fn()
    const screen = await setup(onDecision)

    await fireEvent.press(screen.getByLabelText('Abrir confirmación'))
    expect(screen.getByText('¿Descartar?')).toBeTruthy()
    await fireEvent.press(screen.getByText('Cancelar'))
    expect(onDecision).toHaveBeenLastCalledWith(false)

    await fireEvent.press(screen.getByLabelText('Abrir confirmación'))
    await fireEvent.press(screen.getByText('Confirmar'))
    expect(onDecision).toHaveBeenLastCalledWith(true)
  })

  test('Atrás cierra el diálogo sin confirmar', async () => {
    const onDecision = jest.fn()
    const screen = await setup(onDecision)

    await fireEvent.press(screen.getByLabelText('Abrir confirmación'))
    await fireEvent(screen.getByTestId('app-dialog-modal'), 'requestClose')

    expect(onDecision).toHaveBeenCalledWith(false)
  })

  test('conserva la acción destructiva de las confirmaciones existentes', async () => {
    const onDecision = jest.fn()
    const screen = await setup(onDecision)
    await fireEvent.press(screen.getByLabelText('Abrir confirmación existente'))
    expect(screen.getByText('Eliminar registro')).toBeTruthy()
    await fireEvent.press(screen.getByText('Cancelar'))
    expect(onDecision).not.toHaveBeenCalled()

    await fireEvent.press(screen.getByLabelText('Abrir confirmación existente'))
    await fireEvent.press(screen.getByText('Eliminar'))
    expect(onDecision).toHaveBeenCalledWith(true)
  })

  test('muestra un error y un toast temporal accesible', async () => {
    const screen = await setup()
    await fireEvent.press(screen.getByLabelText('Abrir aviso'))
    expect(screen.getByText('Sin conexión')).toBeTruthy()
    await fireEvent.press(screen.getByText('Entendido'))

    jest.useFakeTimers()
    await fireEvent.press(screen.getByLabelText('Mostrar éxito'))
    expect(screen.getByTestId('app-toast').props.accessibilityLiveRegion).toBe('polite')
    expect(screen.getByText('Guardado')).toBeTruthy()
    await act(async () => jest.advanceTimersByTime(3000))
    expect(screen.queryByText('Guardado')).toBeNull()
    jest.useRealTimers()
  })
})
