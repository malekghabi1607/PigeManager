import { useEffect, useRef, useState } from 'react'
import { deleteCoffret } from '../services/api'
import type { Coffret } from '../types/api'
import { afficherNomCoffret } from '../utils/rechercheCoffret'
import { Button, StateMessage } from './ui'

type SuppressionCoffretDialogProps = {
  coffret: Coffret
  open: boolean
  onClose: () => void
  onSupprime: (coffret: Coffret) => void
}

function SuppressionCoffretDialog({ coffret, open, onClose, onSupprime }: SuppressionCoffretDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [erreur, setErreur] = useState<string>()
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open && !dialog.open) {
      setErreur(undefined)
      dialog.showModal()
    } else if (!open && dialog.open) {
      dialog.close()
    }
  }, [open])

  const supprimer = async () => {
    setErreur(undefined)
    setIsDeleting(true)
    try {
      await deleteCoffret(coffret.id)
      onSupprime(coffret)
    } catch (caughtError) {
      setErreur(caughtError instanceof Error ? caughtError.message : 'Impossible de supprimer le coffret.')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <dialog ref={dialogRef} className="modal" onClose={onClose} aria-labelledby="suppression-coffret-titre">
      <div className="modal-form">
        <h2 id="suppression-coffret-titre">Supprimer le coffret ?</h2>
        <p className="modal-text">
          <strong>{afficherNomCoffret(coffret.nom)}</strong> et ses {coffret.total_piges} piges seront supprimés
          définitivement. Un coffret déjà contrôlé ou commandé ne peut pas être supprimé.
        </p>
        <StateMessage variant="error">{erreur}</StateMessage>
        <div className="modal-actions">
          <Button variant="secondary" onClick={onClose}>Annuler</Button>
          <Button variant="danger" onClick={supprimer} disabled={isDeleting}>
            {isDeleting ? 'Suppression…' : 'Supprimer'}
          </Button>
        </div>
      </div>
    </dialog>
  )
}

export default SuppressionCoffretDialog
