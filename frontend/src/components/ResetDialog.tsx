import { useEffect, useRef, useState } from 'react'
import { getResetApercu, resetPiges } from '../services/api'
import type { ResetResultat } from '../types/api'
import { Button, StateMessage } from './ui'

type ResetDialogProps = {
  open: boolean
  utilisateurId: number
  onClose: () => void
  onReset: (resultat: ResetResultat) => void
}

const pluriel = (nombre: number, mot: string) => `${mot}${nombre > 1 ? 's' : ''}`

function ResetDialog({ open, utilisateurId, onClose, onReset }: ResetDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [apercu, setApercu] = useState<ResetResultat>()
  const [erreur, setErreur] = useState<string>()
  const [isResetting, setIsResetting] = useState(false)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open && !dialog.open) {
      setApercu(undefined)
      setErreur(undefined)
      dialog.showModal()
      getResetApercu()
        .then(setApercu)
        .catch((caughtError: Error) => setErreur(caughtError.message))
    } else if (!open && dialog.open) {
      dialog.close()
    }
  }, [open])

  const confirmer = async () => {
    setErreur(undefined)
    setIsResetting(true)
    try {
      onReset(await resetPiges(utilisateurId))
    } catch (caughtError) {
      setErreur(caughtError instanceof Error ? caughtError.message : 'Impossible de tout remettre à zéro.')
    } finally {
      setIsResetting(false)
    }
  }

  const rienAFaire = apercu !== undefined && apercu.piges === 0

  return (
    <dialog ref={dialogRef} className="modal" onClose={onClose} aria-labelledby="reset-titre">
      <div className="modal-form">
        <h2 id="reset-titre">Tout remettre à zéro ?</h2>
        <p className="modal-text">
          {apercu === undefined && !erreur && 'Calcul en cours…'}
          {rienAFaire && 'Toutes les piges sont déjà à 0.'}
          {apercu !== undefined && !rienAFaire && (
            <>
              <strong>{apercu.piges} {pluriel(apercu.piges, 'pige')} ({apercu.pieces} {pluriel(apercu.pieces, 'pièce')})</strong>{' '}
              seront remises à 0 dans tous les coffrets. La liste des pièces à commander repartira de zéro.
              L'historique est conservé.
            </>
          )}
        </p>
        <StateMessage variant="error">{erreur}</StateMessage>
        <div className="modal-actions">
          <Button variant="secondary" onClick={onClose}>Annuler</Button>
          <Button variant="danger" onClick={confirmer} disabled={!apercu || rienAFaire || isResetting}>
            {isResetting ? 'Remise à zéro…' : 'Tout remettre à zéro'}
          </Button>
        </div>
      </div>
    </dialog>
  )
}

export default ResetDialog
