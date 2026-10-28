import {
  FAQ,
  getFaqFor,
  getGuidesFor,
  getTutorialFor,
  TUTORIAL_STEPS,
  TUTORIAL_TITLES,
} from '../helpContent'

describe('helpContent', () => {
  test('cada rol tiene pasos actuales y el auditor tiene cuatro', () => {
    for (const role of Object.keys(TUTORIAL_TITLES) as (keyof typeof TUTORIAL_TITLES)[]) {
      expect(TUTORIAL_STEPS[role]).toHaveLength(role === 'auditor' ? 4 : 5)
      expect(TUTORIAL_STEPS[role][0]?.target).toBe('home-attention')
    }
    expect(JSON.stringify(TUTORIAL_STEPS)).not.toMatch(
      /En Casos|En Administrar|indicadores en Inicio/,
    )
  })

  test('quien no tiene área no ve crear y las guías respetan el rol', () => {
    expect(getTutorialFor('solicitante', '', false).map((step) => step.id)).not.toContain('crear')
    expect(getGuidesFor('solicitante', '', false).map((guide) => guide.id)).not.toContain('crear')
    expect(getGuidesFor('auditor').map((guide) => guide.id)).toEqual(['indicadores'])
    expect(getGuidesFor('tecnico').map((guide) => guide.id)).toContain('trabajo')
  })

  test('preguntas según rol y búsqueda sin tildes ni mayúsculas', () => {
    expect(getFaqFor('tecnico').map((entry) => entry.id)).not.toContain('devolver')
    expect(getFaqFor('jefe_area').map((entry) => entry.id)).toContain('devolver')
    expect(getFaqFor('administrador')).toHaveLength(FAQ.length - 1)
    expect(getFaqFor('solicitante', 'INTERNET').map((entry) => entry.id)).toEqual(['sin-internet'])
    expect(getTutorialFor('tecnico', 'TRABAJOS').map((step) => step.id)).toEqual(['mis-trabajos'])
    expect(getGuidesFor('tecnico', 'fotos').map((guide) => guide.id)).toEqual(['crear', 'trabajo'])
    expect(getTutorialFor('auditor', '  ')).toEqual(TUTORIAL_STEPS.auditor)
  })
})
