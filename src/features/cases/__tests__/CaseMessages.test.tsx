import { render } from '@testing-library/react-native'

import { CaseMessages, groupCaseMessages } from '../components/CaseMessages'
import type { CaseStatusHistoryRecord } from '../types'

const now = new Date(2026, 9, 25, 12)
const message = (
  id: number,
  actorId: string,
  createdAt: Date,
  action = 'mensaje',
): CaseStatusHistoryRecord => ({
  id,
  actorId,
  previousStatus: 'en_ejecucion',
  newStatus: 'en_ejecucion',
  action,
  actorName: actorId === 'me' ? 'Ana' : 'Luis',
  assigneeName: null,
  comment: `Texto ${id}`,
  createdAt: createdAt.toISOString(),
})

test('agrupa mensajes consecutivos por autor y día, con separadores al cambiar de fecha', () => {
  const events = [
    message(4, 'me', new Date(2026, 9, 25, 11)),
    message(3, 'me', new Date(2026, 9, 25, 10)),
    message(2, 'other', new Date(2026, 9, 24, 10)),
    message(1, 'other', new Date(2026, 9, 24, 9)),
  ]
  const groups = groupCaseMessages(events, now)
  expect(groups.map((group) => group.messages.map((entry) => entry.id))).toEqual([
    [1, 2],
    [3, 4],
  ])
  expect(groups.map((group) => group.dayLabel)).toEqual(['Ayer', 'Hoy'])
  expect(events.map((entry) => entry.id)).toEqual([4, 3, 2, 1])
})

test('los mensajes propios van juntos a la derecha y muestran solo la hora final', async () => {
  const screen = await render(
    <CaseMessages
      currentUserId="me"
      events={[
        message(2, 'me', new Date(2026, 9, 25, 11)),
        message(1, 'me', new Date(2026, 9, 25, 10)),
      ]}
    />,
  )
  expect(screen.getByTestId('case-message-1')).toBeTruthy()
  expect(screen.getByTestId('case-message-2')).toBeTruthy()
  expect(screen.queryByText('Ana')).toBeNull()
  expect(screen.getByText('11:00')).toBeTruthy()
})

test('el separador antiguo usa la fecha corta', () => {
  const groups = groupCaseMessages([message(1, 'other', new Date(2026, 9, 19, 9))], now)
  expect(groups[0]?.dayLabel).toBe('19 oct')
})
