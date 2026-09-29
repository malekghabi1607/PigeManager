import { useCallback, useEffect, useRef, useState } from 'react'

type SaveFn = (pigeId: number, value: number) => Promise<void>

// Regroupe les clics rapides : une seule sauvegarde par pige, envoyee apres
// une courte pause, et les sauvegardes d'une meme pige partent dans l'ordre.
export function useDebouncedSave(save: SaveFn, delay = 500) {
  const saveRef = useRef(save)
  const timers = useRef(new Map<number, number>())
  const pending = useRef(new Map<number, number>())
  const chains = useRef(new Map<number, Promise<void>>())
  const inFlightRef = useRef(0)
  const [inFlight, setInFlight] = useState(0)
  const [waiting, setWaiting] = useState(0)

  useEffect(() => {
    saveRef.current = save
  }, [save])

  const run = useCallback((pigeId: number) => {
    const value = pending.current.get(pigeId)
    window.clearTimeout(timers.current.get(pigeId))
    timers.current.delete(pigeId)
    pending.current.delete(pigeId)
    if (value === undefined) {
      return
    }
    setWaiting((count) => count - 1)
    inFlightRef.current += 1
    setInFlight((count) => count + 1)
    // Chaque sauvegarde attend la precedente de la meme pige : la derniere valeur arrive en dernier.
    const previous = chains.current.get(pigeId) ?? Promise.resolve()
    const next = previous
      .then(() => saveRef.current(pigeId, value))
      .catch(() => undefined)
      .finally(() => {
        inFlightRef.current -= 1
        setInFlight((count) => count - 1)
      })
    chains.current.set(pigeId, next)
  }, [])

  // Envoie tout de suite ce qui attend encore, sans sortir de la file de chaque pige.
  const flush = useCallback(() => {
    for (const pigeId of [...pending.current.keys()]) {
      run(pigeId)
    }
  }, [run])

  const schedule = useCallback((pigeId: number, value: number) => {
    if (!pending.current.has(pigeId)) {
      setWaiting((count) => count + 1)
    }
    pending.current.set(pigeId, value)
    window.clearTimeout(timers.current.get(pigeId))
    timers.current.set(pigeId, window.setTimeout(() => run(pigeId), delay))
  }, [delay, run])

  // En quittant la page (changement d'ecran, onglet ferme ou mis en arriere-plan),
  // les sauvegardes en attente partent tout de suite ; la requete garde keepalive.
  useEffect(() => {
    const quandCache = () => {
      if (document.visibilityState === 'hidden') {
        flush()
      }
    }
    // Previent seulement s'il reste quelque chose a enregistrer.
    const avantFermeture = (event: BeforeUnloadEvent) => {
      if (pending.current.size > 0 || inFlightRef.current > 0) {
        flush()
        event.preventDefault()
      }
    }
    window.addEventListener('pagehide', flush)
    document.addEventListener('visibilitychange', quandCache)
    window.addEventListener('beforeunload', avantFermeture)
    return () => {
      window.removeEventListener('pagehide', flush)
      document.removeEventListener('visibilitychange', quandCache)
      window.removeEventListener('beforeunload', avantFermeture)
      flush()
    }
  }, [flush])

  return { schedule, isSaving: inFlight > 0 || waiting > 0 }
}
