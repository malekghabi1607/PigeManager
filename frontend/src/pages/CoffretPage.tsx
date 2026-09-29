import { useCallback, useEffect, useMemo, useState } from 'react'
import GrillePiges from '../components/GrillePiges'
import { Button, PageHeader, StateMessage, useToast } from '../components/ui'
import { createControle, getPigesByCoffret } from '../services/api'
import { useDebouncedSave } from '../hooks/useDebouncedSave'
import type { Coffret, Pige, Utilisateur } from '../types/api'

const MAX_QUANTITE = 99

type CoffretPageProps = {
  coffret: Coffret
  utilisateur: Utilisateur
  onBack: () => void
}

function CoffretPage({ coffret, utilisateur, onBack }: CoffretPageProps) {
  const [piges, setPiges] = useState<Pige[]>([])
  const [selectedPigeId, setSelectedPigeId] = useState<number>()
  const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string>()
  const { toastElement, showToast } = useToast()

  const loadPiges = useCallback((showLoading = true) => {
    return getPigesByCoffret(coffret.id)
      .then((data) => {
        setPiges(data)
      })
      .catch(() => setError("Impossible de charger les piges du coffret."))
      .finally(() => {
        if (showLoading) {
          setIsLoading(false)
        }
      })
  }, [coffret.id])

  useEffect(() => {
    loadPiges()
  }, [loadPiges, utilisateur.id])

  const stats = useMemo(() => {
    const aCommander = piges.filter((pige) => pige.quantite_manquante > 0)
    return {
      total: piges.length,
      ok: piges.length - aCommander.length,
      aCommander: aCommander.length,
      quantite: aCommander.reduce((sum, pige) => sum + pige.quantite_manquante, 0),
    }
  }, [piges])

  const getStatus = (quantiteManquante: number, quantiteInitiale: number): Pige['statut'] => {
    if (quantiteManquante <= 0) {
      return 'PRESENTE'
    }
    if (quantiteManquante >= quantiteInitiale) {
      return 'MANQUANTE'
    }
    return 'INSUFFISANTE'
  }

  const saveQuantity = useCallback(async (pigeId: number, value: number) => {
    try {
      await createControle({
        pige_id: pigeId,
        utilisateur_id: utilisateur.id,
        quantite_manquante: value,
      })
    } catch (caughtError) {
      showToast(caughtError instanceof Error ? caughtError.message : "Impossible de sauvegarder la quantite.", 'error')
      await loadPiges(false)
    }
  }, [loadPiges, showToast, utilisateur.id])

  const { schedule, isSaving } = useDebouncedSave(saveQuantity)

  const changeQuantity = (pige: Pige, delta: number) => {
    const nextQuantity = Math.min(MAX_QUANTITE, Math.max(0, pige.quantite_manquante + delta))
    if (nextQuantity === pige.quantite_manquante) {
      return
    }
    setSelectedPigeId(pige.id)
    setPiges((currentPiges) =>
      currentPiges.map((currentPige) =>
        currentPige.id === pige.id
          ? {
              ...currentPige,
              quantite_manquante: nextQuantity,
              statut: getStatus(nextQuantity, currentPige.quantite_initiale),
            }
          : currentPige,
      ),
    )
    schedule(pige.id, nextQuantity)
  }

  return (
    <main className="screen">
      <PageHeader
        eyebrow="Coffret"
        title={coffret.nom}
        left={<Button variant="secondary" onClick={onBack}>Retour</Button>}
      />

      <StateMessage>{isLoading ? 'Chargement de la grille...' : undefined}</StateMessage>
      <StateMessage variant="error">{error}</StateMessage>

      {!isLoading && (
        <section className="control-layout">
          <aside className="stats-panel">
            <article>
              <span>Piges</span>
              <strong>{stats.total}</strong>
            </article>
            <article>
              <span>OK</span>
              <strong className="ok">{stats.ok}</strong>
            </article>
            <article>
              <span>Piges a commander</span>
              <strong className="bad">{stats.aCommander}</strong>
            </article>
            <article>
              <span>Quantite totale</span>
              <strong className="warn">{stats.quantite}</strong>
            </article>
          </aside>

          <div className="grid-panel">
            <p className="grid-hint">Touchez une case pour ajouter 1 a commander. Le bouton − retire 1.</p>
            <GrillePiges
              piges={piges}
              selectedPigeId={selectedPigeId}
              onIncrement={(pige) => changeQuantity(pige, 1)}
              onDecrement={(pige) => changeQuantity(pige, -1)}
            />
            <p className={`autosave-status${isSaving ? ' is-saving' : ''}`}>
              {isSaving ? 'Sauvegarde...' : 'Tout est enregistre'}
            </p>
            <div className="status-legend" aria-label="Legende des statuts">
              <span><i className="legend-dot present"></i>OK</span>
              <span><i className="legend-dot missing"></i>A commander (le chiffre = quantite)</span>
            </div>
          </div>
        </section>
      )}
      {toastElement}
    </main>
  )
}

export default CoffretPage
