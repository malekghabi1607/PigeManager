import { useState } from 'react'
import { Button, PageHeader, StateMessage } from '../components/ui'
import { definirJeton, envoyerCodeAtelier } from '../services/api'

type CodePageProps = {
  message?: string
  onValide: () => void
}

function CodePage({ message, onValide }: CodePageProps) {
  const [code, setCode] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string>()

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!code.trim()) {
      setError('Saisissez le code atelier.')
      return
    }

    setIsLoading(true)
    setError(undefined)

    try {
      const { jeton } = await envoyerCodeAtelier(code.trim())
      definirJeton(jeton)
      onValide()
    } catch (caughtError) {
      setCode('')
      setError(caughtError instanceof Error ? caughtError.message : 'Impossible de vérifier le code.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <main className="screen">
      <PageHeader eyebrow="PigeControl" title="Code atelier" />
      <form className="login-panel" onSubmit={handleSubmit}>
        <input
          value={code}
          onChange={(event) => setCode(event.target.value)}
          type="password"
          inputMode="numeric"
          placeholder="Code atelier"
          aria-label="Code atelier"
          autoComplete="current-password"
          autoFocus
        />

        <Button variant="primary" type="submit" disabled={isLoading}>
          {isLoading ? 'Vérification...' : 'Valider'}
        </Button>
      </form>
      <StateMessage variant="error">{error ?? message}</StateMessage>
    </main>
  )
}

export default CodePage
