import * as Haptics from 'expo-haptics'

import { feedback } from '@/services/feedback'

jest.mock('expo-haptics', () => ({
  NotificationFeedbackType: { Success: 'success', Warning: 'warning' },
  notificationAsync: jest.fn(),
  selectionAsync: jest.fn(),
}))

const notify = Haptics.notificationAsync as jest.Mock
const select = Haptics.selectionAsync as jest.Mock

beforeEach(() => {
  notify.mockReset().mockResolvedValue(undefined)
  select.mockReset().mockResolvedValue(undefined)
})

it('confirma solo tras un éxito o una advertencia solicitada', async () => {
  await feedback.success()
  await feedback.warning()
  await feedback.selection()
  expect(notify).toHaveBeenNthCalledWith(1, Haptics.NotificationFeedbackType.Success)
  expect(notify).toHaveBeenNthCalledWith(2, Haptics.NotificationFeedbackType.Warning)
  expect(select).toHaveBeenCalledTimes(1)
})

it('nunca falla cuando el dispositivo no ofrece vibración', async () => {
  notify.mockRejectedValue(new Error('sin motor háptico'))
  select.mockRejectedValue(new Error('sin motor háptico'))
  await expect(feedback.success()).resolves.toBeUndefined()
  await expect(feedback.warning()).resolves.toBeUndefined()
  await expect(feedback.selection()).resolves.toBeUndefined()
})
