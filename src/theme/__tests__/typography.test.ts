import { typography } from '../tokens'

describe('tipografía compartida', () => {
  test('desactiva las ligaduras comunes en todos los niveles de texto', () => {
    for (const style of Object.values(typography)) {
      expect(style.fontVariant).toContain('no-common-ligatures')
    }
  })
})
