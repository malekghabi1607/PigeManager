import coffretImage from '../assets/coffret.svg'
import AjoutCoffretDialog from '../components/AjoutCoffretDialog'
import ResetDialog from '../components/ResetDialog'
import type { Coffret, Utilisateur } from '../types/api'
import { PageHeader, StateMessage, useToast } from '../components/ui'
import { afficherNomCoffret, decouperNomCoffret } from '../utils/rechercheCoffret'

type AccueilProps = {
  coffrets: Coffret[]
  utilisateur: Utilisateur
  isLoading: boolean
  error?: string
  onSelectCoffret: (coffret: Coffret) => void
  onCoffretCree: (coffret: Coffret) => void
  isAjoutOpen: boolean
  isResetOpen: boolean
  onFermerAjout: () => void
  onFermerReset: () => void
}

function Accueil({ coffrets, utilisateur, isLoading, error, onSelectCoffret, onCoffretCree,
  isAjoutOpen, isResetOpen, onFermerAjout, onFermerReset }: AccueilProps) {
  const { toastElement, showToast } = useToast()

  return (
    <main className="screen">
      <PageHeader title="Sélection du coffret" />

      <StateMessage>{isLoading ? 'Chargement des coffrets...' : undefined}</StateMessage>
      <StateMessage variant="error">{error}</StateMessage>

      <StateMessage>
        {!isLoading && !error && coffrets.length === 0 ? 'Aucun coffret disponible. Ajoutez un coffret pour commencer.' : undefined}
      </StateMessage>

      <div className="coffret-list">
        {coffrets.map((coffret) => {
          const { libelle, plage } = decouperNomCoffret(coffret.nom)
          return (
            <button
              type="button"
              className="coffret-card"
              key={coffret.id}
              title={afficherNomCoffret(coffret.nom)}
              aria-label={`Ouvrir ${afficherNomCoffret(coffret.nom)}, ${coffret.total_piges} pièces`}
              onClick={() => onSelectCoffret(coffret)}
            >
              <img src={coffretImage} alt="" />
              <span className="coffret-card-label">{libelle}</span>
              {plage && <strong className="coffret-card-title">{plage}</strong>}
              <span className="coffret-card-count">{coffret.total_piges} pièces</span>
            </button>
          )
        })}
      </div>

      <AjoutCoffretDialog
        open={isAjoutOpen}
        onClose={onFermerAjout}
        onCree={(coffret) => {
          onCoffretCree(coffret)
          showToast(`${afficherNomCoffret(coffret.nom)} créé : ${coffret.total_piges} piges.`)
        }}
      />
      <ResetDialog
        open={isResetOpen}
        utilisateurId={utilisateur.id}
        onClose={onFermerReset}
        onReset={(resultat) => {
          onFermerReset()
          showToast(`${resultat.piges} ${resultat.piges > 1 ? 'piges remises' : 'pige remise'} à zéro.`)
        }}
      />
      {toastElement}
    </main>
  )
}

export default Accueil
