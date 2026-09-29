import { useEffect, useState } from 'react'

function FullscreenButton() {
  const [isFullscreen, setIsFullscreen] = useState(Boolean(document.fullscreenElement))
  const [error, setError] = useState<string>()

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement))
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [])

  const toggleFullscreen = async () => {
    setError(undefined)

    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen()
      } else {
        await document.documentElement.requestFullscreen()
      }
    } catch {
      setError("Plein ecran indisponible sur cette tablette.")
    }
  }

  return (
    <div className="fullscreen-control">
      <button type="button" className="fullscreen-button" onClick={toggleFullscreen}>
        {isFullscreen ? 'Quitter plein ecran' : 'Plein ecran'}
      </button>
      {error && <span className="fullscreen-error">{error}</span>}
    </div>
  )
}

export default FullscreenButton

