import { render } from '@testing-library/react-native'

import { ProgressTracker } from '../ProgressTracker'

test('un reporte enviado anuncia la validación como paso siguiente', async () => {
  const screen = await render(<ProgressTracker status="reporte_enviado" />)

  expect(screen.getByText('Actual: Reporte enviado · Siguiente: Validación')).toBeTruthy()
})

test('un reporte validado anuncia la aprobación como paso siguiente', async () => {
  const screen = await render(<ProgressTracker status="validado" />)

  expect(screen.getByText('Actual: Validada · Siguiente: Aprobación')).toBeTruthy()
})
