import type { TutorialStep } from '../helpContent'

export function getTourProgress(steps: TutorialStep[], seen: string[]) {
  const seenCount = steps.filter((step) => seen.includes(step.id)).length
  const nextIndex = steps.findIndex((step) => !seen.includes(step.id))
  return {
    seenCount,
    nextIndex,
    nextStep: steps[nextIndex],
    complete: steps.length > 0 && nextIndex === -1,
  }
}
