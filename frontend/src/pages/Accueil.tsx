import { useMemo, useState } from 'react'
import coffretImage from '../assets/coffret.svg'
import type { Coffret } from '../types/api'
import { Button, PageHeader, StateMessage } from '../components/ui'

type AccueilProps = {
  coffrets: Coffret[]
  isLoading: boolean
  error?: string
  onSelectCoffret: (coffret: Coffret) => void
  onOpenHistorique: () => void
}

function Accueil({ coffrets, isLoading, error, onSelectCoffret, onOpenHistorique }: AccueilProps) {
  const [search, setSearch] = useState('')
  const filteredCoffrets = useMemo(
    () => coffrets.filter((coffret) => coffret.nom.toLowerCase().includes(search.toLowerCase())),
    [coffrets, search],
  )

  return (
    <main className="screen">
      <PageHeader
        eyebrow="PigeControl"
        title="Selection du coffret"
        right={<Button variant="secondary" onClick={onOpenHistorique}>Historique</Button>}
      />

      <StateMessage>{isLoading ? 'Chargement des coffrets...' : undefined}</StateMessage>
      <StateMessage variant="error">{error}</StateMessage>

      <div className="search-bar">
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Rechercher un coffret..."
        />
        <span>⌕</span>
      </div>

      <div className="coffret-list">
        {filteredCoffrets.map((coffret) => (
          <article className="coffret-card" key={coffret.id}>
            <img src={coffretImage} alt="" />
            <div>
              <h2>{coffret.nom}</h2>
              <p>{coffret.total_piges} pieces</p>
            </div>
            <Button variant="secondary" onClick={() => onSelectCoffret(coffret)}>
              Ouvrir
            </Button>
          </article>
        ))}
      </div>
    </main>
  )
}

export default Accueil
