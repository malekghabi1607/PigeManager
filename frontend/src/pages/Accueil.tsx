import { useMemo, useState } from 'react'
import coffretImage from '../assets/coffret.svg'
import type { Coffret } from '../types/api'
import { PageHeader, StateMessage } from '../components/ui'
import { nomCourtCoffret, rechercherCoffrets } from '../utils/rechercheCoffret'

type AccueilProps = {
  coffrets: Coffret[]
  isLoading: boolean
  error?: string
  onSelectCoffret: (coffret: Coffret) => void
}

function Accueil({ coffrets, isLoading, error, onSelectCoffret }: AccueilProps) {
  const [search, setSearch] = useState('')
  const filteredCoffrets = useMemo(
    () => rechercherCoffrets(coffrets, search),
    [coffrets, search],
  )

  return (
    <main className="screen">
      <PageHeader
        eyebrow="PigeControl"
        title="Selection du coffret"
      />

      <StateMessage>{isLoading ? 'Chargement des coffrets...' : undefined}</StateMessage>
      <StateMessage variant="error">{error}</StateMessage>

      <div className="search-bar">
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          aria-label="Rechercher un coffret par nom, numéro ou plage"
          placeholder="Ex. : 1 à 2, 10 à 10.5, 12.34…"
        />
        <span>⌕</span>
      </div>

      <StateMessage>
        {!isLoading && !error && filteredCoffrets.length === 0 ? 'Aucun coffret ne correspond à votre recherche.' : undefined}
      </StateMessage>

      <div className="coffret-list">
        {filteredCoffrets.map((coffret) => (
          <button
            type="button"
            className="coffret-card"
            key={coffret.id}
            title={coffret.nom}
            aria-label={`Ouvrir ${coffret.nom}, ${coffret.total_piges} pièces`}
            onClick={() => onSelectCoffret(coffret)}
          >
            <img src={coffretImage} alt="" />
            <strong className="coffret-card-title">{nomCourtCoffret(coffret.nom)}</strong>
            <span className="coffret-card-count">{coffret.total_piges} pièces</span>
          </button>
        ))}
      </div>
    </main>
  )
}

export default Accueil
