import { act, fireEvent, render } from '@testing-library/react-native'
import { Pressable, StyleSheet, Text } from 'react-native'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { colors, tone } from '@/theme/tokens'

import {
  AppFeedback,
  AppFeedbackProvider,
  useFeedback,
  useFeedbackDialogOpen,
} from '../AppFeedback'

jest.mock('@/store/authStore', () => ({
  useAuthStore: (selector: (state: unknown) => unknown) =>
    selector({ status: 'authenticated', profile: { organizationId: 'org-1' } }),
}))
jest.mock('@/components/ui/Icon', () => ({
  Icon: ({ name }: { name: string }) => {
    const { Text } = jest.requireActual<typeof import('react-native')>('react-native')
    return <Text testID={`icon-${name}`}>{name}</Text>
  },
}))

function Harness({ onDecision }: { onDecision: (value: boolean) => void }) {
  const { confirm, alert, toast } = useFeedback()
  const dialogOpen = useFeedbackDialogOpen()
  return (
    <>
      <Text>{dialogOpen ? 'Diálogo abierto' : 'Sin diálogo'}</Text>
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
        accessibilityLabel="Mostrar información"
        onPress={() => toast('La solicitud ya se encuentra actualizada.', { tone: 'info' })}
      />
      <Pressable
        accessibilityLabel="Abrir confirmación larga"
        onPress={() =>
          void confirm({
            title: 'Revocar invitación',
            message: 'La persona ya no podrá aceptarla.',
            cancelLabel: 'Mantener invitación',
            confirmLabel: 'Revocar invitación',
            tone: 'danger',
          })
        }
      />
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
    expect(screen.getByText('Sin diálogo')).toBeTruthy()

    await fireEvent.press(screen.getByLabelText('Abrir confirmación'))
    expect(screen.getByText('¿Descartar?')).toBeTruthy()
    expect(screen.getByText('Diálogo abierto')).toBeTruthy()
    await fireEvent.press(screen.getByText('Cancelar'))
    expect(onDecision).toHaveBeenLastCalledWith(false)
    expect(screen.getByText('Sin diálogo')).toBeTruthy()

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

  test('apila las acciones con la principal primero', async () => {
    const screen = await setup()
    await fireEvent.press(screen.getByLabelText('Abrir confirmación'))
    expect(screen.getByTestId('app-dialog-actions').props.style).toEqual(
      expect.objectContaining({ flexDirection: 'column' }),
    )
    const labels = screen
      .getAllByRole('button')
      .map((button) => button.props.accessibilityLabel)
      .filter((label) => label === 'Confirmar' || label === 'Cancelar')
    expect(labels).toEqual(['Confirmar', 'Cancelar'])
    await fireEvent.press(screen.getByLabelText('Cancelar'))

    await fireEvent.press(screen.getByLabelText('Abrir confirmación larga'))
    expect(screen.getByLabelText('Revocar invitación')).toBeTruthy()
    expect(screen.getByLabelText('Mantener invitación')).toBeTruthy()
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

  test('muestra el aviso como isla arriba y permite cerrarlo', async () => {
    const screen = await setup()
    await fireEvent.press(screen.getByLabelText('Mostrar información'))
    const toast = screen.getByTestId('app-toast')
    expect(toast.props.style).toEqual(expect.arrayContaining([expect.objectContaining({ top: 8 })]))
    expect(screen.getByText('La solicitud ya se encuentra actualizada.')).toBeTruthy()
    await fireEvent.press(screen.getByLabelText('Cerrar aviso'))
    expect(screen.queryByTestId('app-toast')).toBeNull()
  })

  test.each([
    ['info', 'information-circle-outline', tone.info.bg],
    ['success', 'checkmark-circle-outline', tone.success.bg],
    ['warning', 'warning-outline', tone.warning.bg],
    ['error', 'close-circle-outline', tone.danger.bg],
  ] as const)('show usa tono explícito %s e icono propio', async (dialogTone, icon, background) => {
    const screen = await setup()
    await act(async () => AppFeedback.show('Aviso', 'Mensaje', { tone: dialogTone }))
    expect(screen.getByTestId(`icon-${icon}`)).toBeTruthy()
    expect(
      StyleSheet.flatten(screen.getByTestId('app-dialog-icon').props.style).backgroundColor,
    ).toBe(background)
    await fireEvent.press(screen.getByText('Entendido'))
  })

  test('la confirmación destructiva usa el icono indicado y botón rojo', async () => {
    const screen = await setup()
    await act(async () =>
      AppFeedback.show(
        'Eliminar',
        'No se puede deshacer.',
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Eliminar', style: 'destructive' },
        ],
        { tone: 'danger', icon: 'trash-outline' },
      ),
    )
    expect(screen.getByTestId('icon-trash-outline')).toBeTruthy()
    expect(
      StyleSheet.flatten(screen.getByRole('button', { name: 'Eliminar' }).props.style)
        .backgroundColor,
    ).toBe(colors.error)
  })

  test('el círculo del aviso de éxito usa el tono verde', async () => {
    const screen = await setup()
    await fireEvent.press(screen.getByLabelText('Mostrar éxito'))
    expect(
      StyleSheet.flatten(screen.getByTestId('app-toast-icon').props.style).backgroundColor,
    ).toBe(tone.success.text)
  })
})
