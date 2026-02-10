import { useEffect, useState } from 'react'
import { loadJson, saveJson } from './storage'

export function useLocalStorageState<T>(key: string, initial: T) {
  const [state, setState] = useState<T>(() => loadJson(key, initial))

  useEffect(() => {
    saveJson(key, state)
  }, [key, state])

  return [state, setState] as const
}


