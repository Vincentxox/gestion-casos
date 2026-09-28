import * as Haptics from 'expo-haptics'

async function notify(type: Haptics.NotificationFeedbackType): Promise<void> {
  try {
    await Haptics.notificationAsync(type)
  } catch {
    // La confirmación visual y la mutación nunca dependen del motor háptico.
  }
}

export const feedback = {
  success: () => notify(Haptics.NotificationFeedbackType.Success),
  warning: () => notify(Haptics.NotificationFeedbackType.Warning),
  selection: async (): Promise<void> => {
    try {
      await Haptics.selectionAsync()
    } catch {
      // Algunos dispositivos no disponen de vibración.
    }
  },
}
