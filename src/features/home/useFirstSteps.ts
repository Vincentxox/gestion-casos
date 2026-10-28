import AsyncStorage from '@react-native-async-storage/async-storage'
import { useEffect, useState } from 'react'

interface FirstStepsState {
  completed: string[]
  hidden: boolean
}

const EMPTY: FirstStepsState = { completed: [], hidden: false }

export function useFirstSteps(userId: string | undefined) {
  const [state, setState] = useState<FirstStepsState & { loaded: boolean; key: string | null }>({
    ...EMPTY,
    loaded: false,
    key: null,
  })
  const key = userId ? `home-first-steps:${userId}` : null
  const current = state.key === key ? state : { ...EMPTY, loaded: false }

  useEffect(() => {
    if (!key) return
    let active = true
    void AsyncStorage.getItem(key)
      .then((raw) => {
        if (!active) return
        const saved = raw ? (JSON.parse(raw) as Partial<FirstStepsState>) : EMPTY
        setState({
          completed: Array.isArray(saved.completed) ? saved.completed : [],
          hidden: saved.hidden === true,
          loaded: true,
          key,
        })
      })
      .catch(() => {
        if (active) setState({ ...EMPTY, loaded: true, key })
      })
    return () => {
      active = false
    }
  }, [key])

  function save(next: FirstStepsState) {
    setState({ ...next, loaded: true, key })
    if (key) void AsyncStorage.setItem(key, JSON.stringify(next)).catch(() => undefined)
  }

  return {
    ...current,
    complete: (step: string) => {
      if (!current.completed.includes(step))
        save({ completed: [...current.completed, step], hidden: current.hidden })
    },
    hide: () => save({ completed: current.completed, hidden: true }),
  }
}
