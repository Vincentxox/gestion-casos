import { FAQ, getFaqFor, getTutorialFor, TUTORIAL_STEPS, TUTORIAL_TITLES } from '../helpContent'

describe('helpContent', () => {
  test('cada rol tiene título y pasos de recorrido', () => {
    for (const role of Object.keys(TUTORIAL_TITLES) as (keyof typeof TUTORIAL_TITLES)[]) {
      expect(TUTORIAL_STEPS[role].length).toBeGreaterThanOrEqual(3)
    }
  })

  test('muestra solo las preguntas que aplican al rol', () => {
    const technician = getFaqFor('tecnico').map((entry) => entry.id)
    expect(technician).not.toContain('devolver')
    expect(technician).not.toContain('cancelar')
    expect(getFaqFor('jefe_area').map((entry) => entry.id)).toContain('devolver')
    expect(getFaqFor('administrador')).toHaveLength(FAQ.length)
  })

  test('busca sin distinguir acentos ni mayúsculas', () => {
    expect(getFaqFor('solicitante', 'INTERNET').map((entry) => entry.id)).toEqual(['sin-internet'])
    expect(getFaqFor('solicitante', 'que es en espera').map((entry) => entry.id)).toContain(
      'espera',
    )
    expect(getTutorialFor('tecnico', 'fotos').map((step) => step.id)).toEqual(['recursos'])
    expect(getTutorialFor('tecnico', 'zzz')).toEqual([])
    expect(getTutorialFor('auditor', '  ')).toEqual(TUTORIAL_STEPS.auditor)
  })
})
