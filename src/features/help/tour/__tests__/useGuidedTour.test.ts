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
      seen: [],
      started: false,
      hiddenOnHome: false,
      steps: [],
      index: 0,
      active: false,
      target: null,
      rect: null,
    })
  })

  test('lee el avance viejo sin usar skipped para ocultar Inicio', async () => {
    ;(AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(
      JSON.stringify({ seen: ['inicio'], autoShown: true, skipped: true }),
    )
    await useGuidedTour.getState().hydrate('person-1')
    expect(AsyncStorage.getItem).toHaveBeenCalledWith('guided-tour:person-1')
    expect(useGuidedTour.getState().seen).toEqual(['inicio'])
    expect(useGuidedTour.getState().started).toBe(true)
    expect(useGuidedTour.getState().hiddenOnHome).toBe(false)
    await useGuidedTour.getState().start(steps, 1)
    await useGuidedTour.getState().next()
    expect(useGuidedTour.getState().seen).toEqual(['inicio', 'avisos'])
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      'guided-tour:person-1',
      JSON.stringify({ seen: ['inicio', 'avisos'], started: true, hiddenOnHome: false }),
    )
    await useGuidedTour.getState().skip()
    expect(useGuidedTour.getState().active).toBe(false)
    expect(useGuidedTour.getState().hiddenOnHome).toBe(false)
  })

  test('una cuenta nueva solo empieza al tocar, y Saltar conserva el progreso', async () => {
    await useGuidedTour.getState().hydrate('person-2')
    expect(useGuidedTour.getState()).toMatchObject({
      ready: true,
      active: false,
      started: false,
      hiddenOnHome: false,
    })
    await useGuidedTour.getState().start(steps)
    expect(useGuidedTour.getState()).toMatchObject({ active: true, started: true })
    await useGuidedTour.getState().next()
    await useGuidedTour.getState().skip()
    expect(useGuidedTour.getState()).toMatchObject({
      active: false,
      seen: [steps[0]!.id],
      hiddenOnHome: false,
    })
  })

  test('Ocultar y Deshacer guardan una clave nueva sin perder el avance', async () => {
    await useGuidedTour.getState().hydrate('person-3')
    await useGuidedTour.getState().start(steps)
    await useGuidedTour.getState().next()
    await useGuidedTour.getState().hideOnHome()
    expect(useGuidedTour.getState()).toMatchObject({
      hiddenOnHome: true,
      seen: [steps[0]!.id],
    })
    expect(AsyncStorage.setItem).toHaveBeenLastCalledWith(
      'guided-tour:person-3',
      JSON.stringify({ seen: [steps[0]!.id], started: true, hiddenOnHome: true }),
    )
    await useGuidedTour.getState().showOnHome()
    expect(useGuidedTour.getState().hiddenOnHome).toBe(false)
    expect(AsyncStorage.setItem).toHaveBeenLastCalledWith(
      'guided-tour:person-3',
      JSON.stringify({ seen: [steps[0]!.id], started: true, hiddenOnHome: false }),
    )
  })

  test('un fallo de lectura no inicia el recorrido y aún permite iniciarlo manualmente', async () => {
    ;(AsyncStorage.getItem as jest.Mock).mockRejectedValueOnce(new Error('Storage unavailable'))
    await useGuidedTour.getState().hydrate('person-4')
    expect(useGuidedTour.getState().active).toBe(false)
    await useGuidedTour.getState().start(steps)
    expect(useGuidedTour.getState().active).toBe(true)
  })

  test('si falla el guardado, el recorrido iniciado a mano sigue disponible', async () => {
    await useGuidedTour.getState().hydrate('person-5')
    ;(AsyncStorage.setItem as jest.Mock).mockRejectedValueOnce(new Error('Storage unavailable'))
    await useGuidedTour.getState().start(steps)
    expect(useGuidedTour.getState().active).toBe(true)
  })
})
