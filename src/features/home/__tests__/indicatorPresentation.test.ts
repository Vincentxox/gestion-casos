import { formatIndicatorDuration } from '../indicatorPresentation'

test('formatea horas promedio como días, horas y minutos', () => {
  expect(formatIndicatorDuration(3.4)).toBe('3 h 24 min')
  expect(formatIndicatorDuration(41)).toBe('1 d 17 h')
  expect(formatIndicatorDuration(18.6)).toBe('18 h 36 min')
  expect(formatIndicatorDuration(0.5)).toBe('30 min')
  expect(formatIndicatorDuration(0)).toBe('0 min')
  expect(formatIndicatorDuration(null)).toBe('—')
  expect(formatIndicatorDuration(NaN)).toBe('—')
  expect(formatIndicatorDuration(-1)).toBe('—')
})
