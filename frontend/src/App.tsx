import { useEffect, useState } from 'react'
import './App.css'
import AppShell from './components/AppShell'
import Accueil from './pages/Accueil'
import BesoinPage from './pages/BesoinPage'
import CoffretPage from './pages/CoffretPage'
import CodePage from './pages/CodePage'
import HistoriquePage from './pages/HistoriquePage'
import { StateMessage } from './components/ui'
import { aUnJeton, connectUtilisateur, getAuthStatut, getCoffrets, onSessionExpiree } from './services/api'
import type { Coffret, Utilisateur } from './types/api'
import { effacerStockage } from './utils/stockage'

type View = 'accueil' | 'coffret' | 'besoins' | 'historique'
// "verification" : on demande au serveur si un code atelier est exige.
type Acces = 'verification' | 'code' | 'ouvert'

// Le code atelier suffit pour entrer : tous les controles sont enregistres au nom de l'atelier.
const NOM_ATELIER = 'Atelier'

// Ancien stockage du nom du controleur (ecran du nom supprime).
effacerStockage('pigecontrol.utilisateur')

function App() {
  const [acces, setAcces] = useState<Acces>(aUnJeton() ? 'ouvert' : 'verification')
  const [messageAcces, setMessageAcces] = useState<string>()
  const [view, setView] = useState<View>('accueil')
  const [coffrets, setCoffrets] = useState<Coffret[]>([])
  const [selectedCoffret, setSelectedCoffret] = useState<Coffret>()
  const [utilisateur, setUtilisateur] = useState<Utilisateur>()
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string>()

  useEffect(() => {
    onSessionExpiree(() => {
      setMessageAcces('Session expirée, saisissez le code atelier.')
      setAcces('code')
    })
  }, [])

  useEffect(() => {
    if (acces !== 'verification') return
    getAuthStatut()
      .then(({ protection }) => setAcces(protection ? 'code' : 'ouvert'))
      .catch(() => {
        setMessageAcces("Impossible de joindre l'API PigeControl.")
        setAcces('code')
      })
  }, [acces])

  useEffect(() => {
    if (acces !== 'ouvert') return
    Promise.all([getCoffrets(), connectUtilisateur({ nom: NOM_ATELIER })])
      .then(([liste, atelier]) => {
        setCoffrets(liste)
        setUtilisateur(atelier)
      })
      .catch(() => setError("Impossible de joindre l'API PigeControl."))
      .finally(() => setIsLoading(false))
  }, [acces])

  const navigate = (nextView: View) => {
    setView(nextView === 'coffret' && !selectedCoffret ? 'accueil' : nextView)
  }

  const openCoffret = (coffret: Coffret) => {
    setSelectedCoffret(coffret)
    setView('coffret')
  }

  if (acces === 'verification') {
    return (
      <main className="screen">
        <StateMessage>Chargement...</StateMessage>
      </main>
    )
  }

  if (acces === 'code') {
    return (
      <CodePage
        message={messageAcces}
        onValide={() => {
          setMessageAcces(undefined)
          setError(undefined)
          setAcces('ouvert')
        }}
      />
    )
  }

  if (!utilisateur) {
    return (
      <main className="screen">
        <StateMessage>{error ? undefined : 'Chargement...'}</StateMessage>
        <StateMessage variant="error">{error}</StateMessage>
      </main>
    )
  }

  if (view === 'besoins') {
    return (
      <AppShell activeView={view} onNavigate={navigate}>
        <BesoinPage
          utilisateur={utilisateur}
          onBack={() => setView(selectedCoffret ? 'coffret' : 'accueil')}
        />
      </AppShell>
    )
  }

  if (view === 'historique') {
    return (
      <AppShell activeView={view} onNavigate={navigate}>
        <HistoriquePage onBack={() => setView('accueil')} />
      </AppShell>
    )
  }

  if (view === 'coffret' && selectedCoffret) {
    return (
      <AppShell activeView={view} onNavigate={navigate}>
        <CoffretPage
          coffret={selectedCoffret}
          utilisateur={utilisateur}
          onBack={() => setView('accueil')}
          onDeleted={(supprime) => {
            setCoffrets((current) => current.filter((item) => item.id !== supprime.id))
            setSelectedCoffret(undefined)
            setView('accueil')
          }}
        />
      </AppShell>
    )
  }

  return (
    <AppShell activeView={view} onNavigate={navigate}>
      <Accueil
        coffrets={coffrets}
        utilisateur={utilisateur}
        isLoading={isLoading}
        error={error}
        onSelectCoffret={openCoffret}
        onCoffretCree={(coffret) => setCoffrets((current) => [...current, coffret])}
      />
    </AppShell>
  )
}

export default App
