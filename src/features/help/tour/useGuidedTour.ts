import AsyncStorage from '@react-native-async-storage/async-storage'
import { create } from 'zustand'

import type { TutorialStep, TourTargetId } from '../helpContent'

export interface TourRect {
  x: number
  y: number
  width: number
  height: number
}
interface SavedProgress {
  seen: string[]
  autoShown: boolean
}

interface GuidedTourState {
  userId: string | null
  ready: boolean
  autoAllowed: boolean
  seen: string[]
  autoShown: boolean
  steps: TutorialStep[]
  index: number
  active: boolean
  target: TourTargetId | null
  rect: TourRect | null
  hydrate: (userId: string | undefined) => Promise<void>
  start: (
    steps: TutorialStep[],
    index?: number,
    repeat?: boolean,
    automatic?: boolean,
  ) => Promise<void>
  next: () => Promise<void>
  skip: () => Promise<void>
  setTarget: (target: TourTargetId | null) => void
  setRect: (target: TourTargetId, rect: TourRect | null) => void
}

function keyFor(userId: string) {
  return `guided-tour:${userId}`
}

async function save(userId: string | null, value: SavedProgress) {
  if (!userId) return false
  try {
    await AsyncStorage.setItem(keyFor(userId), JSON.stringify(value))
    return true
  } catch {
    return false
  }
}

export const useGuidedTour = create<GuidedTourState>((set, get) => ({
  userId: null,
  ready: false,
  autoAllowed: false,
  seen: [],
  autoShown: false,
  steps: [],
  index: 0,
  active: false,
  target: null,
  rect: null,
  async hydrate(userId) {
    if (!userId) {
      set({ userId: null, ready: false, autoAllowed: false, seen: [], active: false })
      return
    }
    if (get().userId === userId && get().ready) return
    set({ userId, ready: false, autoAllowed: false, active: false, seen: [], rect: null })
    try {
      const raw = await AsyncStorage.getItem(keyFor(userId))
      if (get().userId !== userId) return
      const parsed = raw ? (JSON.parse(raw) as SavedProgress) : null
      set({
        ready: true,
        autoAllowed: true,
        seen: Array.isArray(parsed?.seen)
          ? parsed.seen.filter((id): id is string => typeof id === 'string')
          : [],
        autoShown: Boolean(parsed?.autoShown),
      })
    } catch {
      if (get().userId === userId)
        set({ ready: true, autoAllowed: false, seen: [], autoShown: true })
    }
  },
  async start(steps, index = 0, repeat = false, automatic = false) {
    const state = get()
    if (
      !state.ready ||
      steps.length === 0 ||
      (automatic && (!state.autoAllowed || state.autoShown))
    )
      return
    const seen = repeat ? [] : state.seen.filter((id) => steps.some((step) => step.id === id))
    const nextIndex = Math.max(0, Math.min(index, steps.length - 1))
    const autoShown = true
    // The flag is durable before the first automatic frame appears.
    const saved = await save(state.userId, { seen, autoShown })
    if (automatic && !saved) {
      set({ autoAllowed: false })
      return
    }
    if (get().userId !== state.userId) return
    set({
      steps,
      index: nextIndex,
      seen,
      autoShown,
      active: true,
      target: steps[nextIndex]!.target,
      rect: null,
    })
  },
  async next() {
    const state = get()
    if (!state.active) return
    const seen = [...new Set([...state.seen, state.steps[state.index]!.id])]
    const done = state.index === state.steps.length - 1
    set({
      seen,
      active: !done,
      index: done ? state.index : state.index + 1,
      target: done ? null : state.steps[state.index + 1]!.target,
      rect: null,
    })
    await save(state.userId, { seen, autoShown: state.autoShown })
  },
  async skip() {
    const state = get()
    set({ active: false, target: null, rect: null })
    await save(state.userId, { seen: state.seen, autoShown: state.autoShown })
  },
  setTarget(target) {
    set({ target, rect: null })
  },
  setRect(target, rect) {
    if (get().target === target) set({ rect })
  },
}))
