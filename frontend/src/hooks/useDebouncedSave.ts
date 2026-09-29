import { useCallback, useEffect, useRef, useState } from 'react'

type SaveFn = (pigeId: number, value: number) => Promise<void>

// Regroupe les clics rapides : une seule sauvegarde par pige, envoyee apres
// une courte pause, et les sauvegardes d'une meme pige partent dans l'ordre.
export function useDebouncedSave(save: SaveFn, delay = 500) {
  const saveRef = useRef(save)
  const timers = useRef(new Map<number, number>())
  const pending = useRef(new Map<number, number>())
  const chains = useRef(new Map<number, Promise<void>>())
  const [inFlight, setInFlight] = useState(0)
  const [waiting, setWaiting] = useState(0)

  useEffect(() => {
    saveRef.current = save
  }, [save])

  const run = useCallback((pigeId: number) => {
    const value = pending.current.get(pigeId)
    timers.current.delete(pigeId)
    pending.current.delete(pigeId)
    if (value === undefined) {
      return
    }
    setWaiting((count) => count - 1)
    setInFlight((count) => count + 1)
    const previous = chains.current.get(pigeId) ?? Promise.resolve()
    const next = previous
      .then(() => saveRef.current(pigeId, value))
      .catch(() => undefined)
      .finally(() => setInFlight((count) => count - 1))
    chains.current.set(pigeId, next)
  }, [])

  const schedule = useCallback((pigeId: number, value: number) => {
    if (!pending.current.has(pigeId)) {
      setWaiting((count) => count + 1)
    }
    pending.current.set(pigeId, value)
    window.clearTimeout(timers.current.get(pigeId))
    timers.current.set(pigeId, window.setTimeout(() => run(pigeId), delay))
  }, [delay, run])

  // En quittant la page, on envoie tout de suite ce qui reste en attente.
  useEffect(() => {
    const currentTimers = timers.current
    const currentPending = pending.current
    return () => {
      currentTimers.forEach((timer) => window.clearTimeout(timer))
      currentPending.forEach((value, pigeId) => {
        void saveRef.current(pigeId, value).catch(() => undefined)
      })
      currentPending.clear()
    }
  }, [])

  return { schedule, isSaving: inFlight > 0 || waiting > 0 }
}
