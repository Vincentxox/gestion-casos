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
  started?: boolean
  hiddenOnHome?: boolean
  // Legacy fields are read only; skipping the old automatic tour never hides Home now.
  autoShown?: boolean
  skipped?: boolean
}

interface GuidedTourState {
  userId: string | null
  ready: boolean
  seen: string[]
  started: boolean
  hiddenOnHome: boolean
  steps: TutorialStep[]
  index: number
  active: boolean
  target: TourTargetId | null
  rect: TourRect | null
  hydrate: (userId: string | undefined) => Promise<void>
  start: (steps: TutorialStep[], index?: number, repeat?: boolean) => Promise<void>
  next: () => Promise<void>
  skip: () => Promise<void>
  hideOnHome: () => Promise<void>
  showOnHome: () => Promise<void>
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
  seen: [],
  started: false,
  hiddenOnHome: false,
  steps: [],
  index: 0,
  active: false,
  target: null,
  rect: null,
  async hydrate(userId) {
    if (!userId) {
      set({
        userId: null,
        ready: false,
        seen: [],
        started: false,
        hiddenOnHome: false,
        active: false,
      })
      return
    }
    if (get().userId === userId && get().ready) return
    set({
      userId,
      ready: false,
      active: false,
      seen: [],
      started: false,
      hiddenOnHome: false,
      rect: null,
    })
    try {
      const raw = await AsyncStorage.getItem(keyFor(userId))
      if (get().userId !== userId) return
      const parsed = raw ? (JSON.parse(raw) as SavedProgress) : null
      set({
        ready: true,
        seen: Array.isArray(parsed?.seen)
          ? parsed.seen.filter((id): id is string => typeof id === 'string')
          : [],
        started: Boolean(parsed?.started || parsed?.autoShown || parsed?.seen?.length),
        hiddenOnHome: Boolean(parsed?.hiddenOnHome),
      })
    } catch {
      if (get().userId === userId)
        set({ ready: true, seen: [], started: false, hiddenOnHome: false })
    }
  },
  async start(steps, index = 0, repeat = false) {
    const state = get()
    if (!state.ready || steps.length === 0) return
    const seen = repeat ? [] : state.seen.filter((id) => steps.some((step) => step.id === id))
    const nextIndex = Math.max(0, Math.min(index, steps.length - 1))
    await save(state.userId, { seen, started: true, hiddenOnHome: state.hiddenOnHome })
    if (get().userId !== state.userId) return
    set({
      steps,
      index: nextIndex,
      seen,
      started: true,
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
    await save(state.userId, { seen, started: state.started, hiddenOnHome: state.hiddenOnHome })
  },
  async skip() {
    set({ active: false, target: null, rect: null })
  },
  async hideOnHome() {
    const state = get()
    set({ hiddenOnHome: true })
    await save(state.userId, { seen: state.seen, started: state.started, hiddenOnHome: true })
  },
  async showOnHome() {
    const state = get()
    set({ hiddenOnHome: false })
    await save(state.userId, { seen: state.seen, started: state.started, hiddenOnHome: false })
  },
  setTarget(target) {
    set({ target, rect: null })
  },
  setRect(target, rect) {
    if (get().target === target) set({ rect })
  },
}))
