import { useState } from 'react'
import { Button, PageHeader, StateMessage } from '../components/ui'
import { connectUtilisateur } from '../services/api'
import type { Utilisateur } from '../types/api'

type ConnexionPageProps = {
  onConnected: (utilisateur: Utilisateur) => void
}

function ConnexionPage({ onConnected }: ConnexionPageProps) {
  const [nom, setNom] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string>()

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!nom.trim()) {
      setError('Saisissez le nom du controleur.')
      return
    }

    setIsLoading(true)
    setError(undefined)

    try {
      const utilisateur = await connectUtilisateur({ nom })
      onConnected(utilisateur)
    } catch {
      setError("Impossible de connecter l'utilisateur.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <main className="screen">
      <PageHeader eyebrow="PigeControl" title="Connexion atelier" />
      <form className="login-panel" onSubmit={handleSubmit}>
        <input
          value={nom}
          onChange={(event) => setNom(event.target.value)}
          placeholder="Votre nom"
          aria-label="Votre nom"
          autoComplete="name"
        />

        <Button variant="primary" type="submit" disabled={isLoading}>
          {isLoading ? 'Connexion...' : 'Commencer'}
        </Button>
      </form>
      <StateMessage variant="error">{error}</StateMessage>
    </main>
  )
}

export default ConnexionPage
