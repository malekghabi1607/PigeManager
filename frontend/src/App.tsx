import { useEffect, useState } from 'react'
import './App.css'
import AppShell from './components/AppShell'
import FullscreenButton from './components/FullscreenButton'
import Accueil from './pages/Accueil'
import BesoinPage from './pages/BesoinPage'
import CoffretPage from './pages/CoffretPage'
import ConnexionPage from './pages/ConnexionPage'
import HistoriquePage from './pages/HistoriquePage'
import { getCoffrets } from './services/api'
import type { Coffret, Utilisateur } from './types/api'

type View = 'accueil' | 'coffret' | 'besoins' | 'historique'

function App() {
  const [view, setView] = useState<View>('accueil')
  const [coffrets, setCoffrets] = useState<Coffret[]>([])
  const [selectedCoffret, setSelectedCoffret] = useState<Coffret>()
  const [utilisateur, setUtilisateur] = useState<Utilisateur>()
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string>()

  useEffect(() => {
    getCoffrets()
      .then(setCoffrets)
      .catch(() => setError("Impossible de joindre l'API PigeControl."))
      .finally(() => setIsLoading(false))
  }, [])

  const navigate = (nextView: View) => {
    setView(nextView === 'coffret' && !selectedCoffret ? 'accueil' : nextView)
  }

  const openCoffret = (coffret: Coffret) => {
    setSelectedCoffret(coffret)
    setView('coffret')
  }

  if (!utilisateur) {
    return (
      <>
        <div className="fullscreen-floating">
          <FullscreenButton />
        </div>
        <ConnexionPage onConnected={setUtilisateur} />
      </>
    )
  }

  if (view === 'besoins') {
    return (
      <>
        <AppShell activeView={view} utilisateur={utilisateur} onNavigate={navigate}>
          <BesoinPage
            utilisateur={utilisateur}
            onBack={() => setView(selectedCoffret ? 'coffret' : 'accueil')}
          />
        </AppShell>
      </>
    )
  }

  if (view === 'historique') {
    return (
      <>
        <AppShell activeView={view} utilisateur={utilisateur} onNavigate={navigate}>
          <HistoriquePage onBack={() => setView('accueil')} />
        </AppShell>
      </>
    )
  }

  if (view === 'coffret' && selectedCoffret) {
    return (
      <>
        <AppShell activeView={view} utilisateur={utilisateur} onNavigate={navigate}>
          <CoffretPage
            coffret={selectedCoffret}
            utilisateur={utilisateur}
            onBack={() => setView('accueil')}
            onOpenBesoins={() => setView('besoins')}
          />
        </AppShell>
      </>
    )
  }

  return (
    <>
      <AppShell activeView={view} utilisateur={utilisateur} onNavigate={navigate}>
        <Accueil
          coffrets={coffrets}
          isLoading={isLoading}
          error={error}
          onSelectCoffret={openCoffret}
          onOpenHistorique={() => setView('historique')}
        />
      </AppShell>
    </>
  )
}

export default App
