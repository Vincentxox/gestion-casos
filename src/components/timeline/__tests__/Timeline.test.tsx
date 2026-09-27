import { render } from '@testing-library/react-native'

import type { CaseStatusHistoryRecord } from '@/features/cases/types'
import { Timeline } from '../Timeline'

test('el historial del reporte usa verbos propios y conserva el motivo de devolución', async () => {
  const actions = [
    ['enviar_reporte', 'reporte_enviado'],
    ['validar_reporte', 'validado'],
    ['devolver_reporte', 'en_ejecucion'],
    ['aprobar_reporte', 'aprobado'],
  ] as const
  const events = actions.map(([action, newStatus], index): CaseStatusHistoryRecord => ({
    id: index + 1,
    previousStatus: null,
    newStatus,
    action,
    actorName: 'Ana',
    assigneeName: null,
    comment: action === 'devolver_reporte' ? 'Falta detalle' : null,
    createdAt: '2026-09-26T12:00:00Z',
  }))
  const screen = await render(<Timeline events={events} />)

  for (const verb of [
    'firmó y envió el reporte',
    'firmó la validación técnica',
    'devolvió el reporte',
    'firmó la conformidad',
  ]) {
    expect(screen.getByText(`Ana ${verb}`)).toBeTruthy()
  }
  expect(screen.getByText('Falta detalle')).toBeTruthy()
  expect(screen.queryByText(/cambió el estado a/)).toBeNull()
})
