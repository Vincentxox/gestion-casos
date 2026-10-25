import { render } from '@testing-library/react-native'
import { CaseTracking } from '../components/CaseTracking'
import type { TrackingStep } from '../caseTracking'

jest.mock('@/components/ui/Icon', () => ({
  Icon: ({ name }: { name: string }) => {
    const { Text } = jest.requireActual<typeof import('react-native')>('react-native')
    return <Text testID={`icon-${name}`}>{name}</Text>
  },
}))

test('rechazada, cancelada y hecha no dependen solo del color', async () => {
  const steps: TrackingStep[] = [
    { key: 'solicitada', label: 'Solicitada', state: 'done', detail: 'Hecha' },
    { key: 'rechazado', label: 'Rechazada', state: 'danger', detail: 'Rechazada' },
    { key: 'cancelado', label: 'Cancelada', state: 'cancelled', detail: 'Cancelada' },
  ]
  const screen = await render(
    <CaseTracking steps={steps} events={[]} description="Descripción" location="Lugar" />,
  )
  expect(screen.getByTestId('icon-checkmark')).toBeTruthy()
  expect(screen.getByTestId('icon-close')).toBeTruthy()
  expect(screen.getByTestId('icon-remove')).toBeTruthy()
})

test('el paso actual alinea «Desde hoy» junto al título', async () => {
  const today = new Date()
  today.setHours(7, 35, 0, 0)
  const event = {
    id: 1,
    action: 'iniciar',
    previousStatus: 'asignado',
    newStatus: 'en_ejecucion',
    actorName: 'Luis',
    assigneeName: 'Luis',
    comment: null,
    createdAt: today.toISOString(),
  } as const
  const steps: TrackingStep[] = [
    { key: 'en_ejecucion', label: 'En ejecución', state: 'current', detail: '', event },
  ]
  const screen = await render(
    <CaseTracking steps={steps} events={[]} description="Descripción" location="Lugar" />,
  )
  expect(screen.getByText('En ejecución').parent).toBe(screen.getByText('Desde hoy 07:35').parent)
})
