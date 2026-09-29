import { useEffect, useState } from 'react'
import './App.css'
import AppShell from './components/AppShell'
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

  const changeUtilisateur = () => {
    setUtilisateur(undefined)
    setView('accueil')
  }

  if (!utilisateur) {
    return <ConnexionPage onConnected={setUtilisateur} />
  }

  if (view === 'besoins') {
    return (
      <>
        <AppShell activeView={view} utilisateur={utilisateur} onNavigate={navigate} onChangeUtilisateur={changeUtilisateur}>
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
        <AppShell activeView={view} utilisateur={utilisateur} onNavigate={navigate} onChangeUtilisateur={changeUtilisateur}>
          <HistoriquePage onBack={() => setView('accueil')} />
        </AppShell>
      </>
    )
  }

  if (view === 'coffret' && selectedCoffret) {
    return (
      <>
        <AppShell activeView={view} utilisateur={utilisateur} onNavigate={navigate} onChangeUtilisateur={changeUtilisateur}>
          <CoffretPage
            coffret={selectedCoffret}
            utilisateur={utilisateur}
            onBack={() => setView('accueil')}
          />
        </AppShell>
      </>
    )
  }

  return (
    <>
      <AppShell activeView={view} utilisateur={utilisateur} onNavigate={navigate} onChangeUtilisateur={changeUtilisateur}>
        <Accueil
          coffrets={coffrets}
          isLoading={isLoading}
          error={error}
          onSelectCoffret={openCoffret}
        />
      </AppShell>
    </>
  )
}

export default App
