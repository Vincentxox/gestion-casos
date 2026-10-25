import AsyncStorage from '@react-native-async-storage/async-storage'

import { getTutorialFor } from '../../helpContent'
import { useGuidedTour } from '../useGuidedTour'

const steps = getTutorialFor('tecnico')

describe('useGuidedTour', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(AsyncStorage.getItem as jest.Mock).mockResolvedValue(null)
    ;(AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined)
    useGuidedTour.setState({
      userId: null,
      ready: false,
      autoAllowed: false,
      seen: [],
      skipped: false,
      autoShown: false,
      steps: [],
      index: 0,
      active: false,
      target: null,
      rect: null,
    })
  })

  test('lee y guarda el avance por persona', async () => {
    ;(AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(
      JSON.stringify({ seen: ['inicio'], autoShown: true }),
    )
    await useGuidedTour.getState().hydrate('person-1')
    expect(AsyncStorage.getItem).toHaveBeenCalledWith('guided-tour:person-1')
    expect(useGuidedTour.getState().seen).toEqual(['inicio'])
    await useGuidedTour.getState().start(steps, 1)
    await useGuidedTour.getState().next()
    expect(useGuidedTour.getState().seen).toEqual(['inicio', 'avisos'])
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      'guided-tour:person-1',
      JSON.stringify({ seen: ['inicio', 'avisos'], autoShown: true }),
    )
    await useGuidedTour.getState().skip()
    expect(useGuidedTour.getState().active).toBe(false)
    expect(useGuidedTour.getState().skipped).toBe(true)
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      'guided-tour:person-1',
      JSON.stringify({ seen: ['inicio', 'avisos'], autoShown: true, skipped: true }),
    )
  })

  test('un fallo de lectura impide el lanzamiento automático', async () => {
    ;(AsyncStorage.getItem as jest.Mock).mockRejectedValueOnce(new Error('Storage unavailable'))
    await useGuidedTour.getState().hydrate('person-2')
    await useGuidedTour.getState().start(steps, 0, false, true)
    expect(useGuidedTour.getState().active).toBe(false)
    expect(useGuidedTour.getState().autoAllowed).toBe(false)
  })

  test('guarda autoShown antes de mostrar el recorrido', async () => {
    await useGuidedTour.getState().hydrate('person-3')
    let finishWrite: () => void = () => undefined
    ;(AsyncStorage.setItem as jest.Mock).mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          finishWrite = resolve
        }),
    )
    const starting = useGuidedTour.getState().start(steps, 0, false, true)
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      'guided-tour:person-3',
      JSON.stringify({ seen: [], autoShown: true }),
    )
    expect(useGuidedTour.getState().active).toBe(false)
    finishWrite()
    await starting
    expect(useGuidedTour.getState().active).toBe(true)
    await useGuidedTour.getState().skip()
    await useGuidedTour.getState().start(steps, 0, false, true)
    expect(useGuidedTour.getState().active).toBe(false)
  })

  test('si no puede guardar el indicador, no lanza automáticamente', async () => {
    await useGuidedTour.getState().hydrate('person-4')
    ;(AsyncStorage.setItem as jest.Mock).mockRejectedValueOnce(new Error('Storage unavailable'))
    await useGuidedTour.getState().start(steps, 0, false, true)
    expect(useGuidedTour.getState().active).toBe(false)
    expect(useGuidedTour.getState().autoAllowed).toBe(false)
  })
})
