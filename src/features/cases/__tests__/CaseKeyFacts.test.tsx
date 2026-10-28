import { render } from '@testing-library/react-native'

import { CaseKeyFacts } from '../components/CaseKeyFacts'

test('muestra prioridad, plazo y responsable de la solicitud', async () => {
  const screen = await render(
    <CaseKeyFacts
      priority="alta"
      dueAt="2025-10-21T10:00:00Z"
      overdueStage="resolucion"
      assigneeName="Luis Pérez"
    />,
  )
  expect(screen.getByTestId('case-key-facts')).toBeTruthy()
  expect(screen.getByText('Alta')).toBeTruthy()
  expect(screen.getByText('Luis Pérez')).toBeTruthy()
  expect(screen.getByText(/21 oct 2025/)).toBeTruthy()
  expect(screen.getByText('Luis Pérez').props.numberOfLines).toBe(1)
  expect(screen.getByText('21 oct 2025').props.numberOfLines).toBe(1)
})

test('explica cuando todavía no hay plazo o responsable', async () => {
  const screen = await render(<CaseKeyFacts priority="media" />)
  expect(screen.getByText('Sin plazo')).toBeTruthy()
  expect(screen.getByText('Sin asignar')).toBeTruthy()
})
