import { useEffect, useRef, useState } from 'react'
import { createCoffret } from '../services/api'
import type { CoffretCree } from '../types/api'
import { afficherNomCoffret } from '../utils/rechercheCoffret'
import { Button, StateMessage } from './ui'

const COLONNES_PAR_DEFAUT = 12
const MAX_COLONNES = 20
const MAX_PIGES = 500

type AjoutCoffretDialogProps = {
  open: boolean
  onClose: () => void
  onCree: (coffret: CoffretCree) => void
}

// "14,5" ou "14.50" -> 14.5 ; au plus 2 decimales, sinon undefined.
function lireNumero(saisie: string): number | undefined {
  const valeur = saisie.trim().replace(',', '.')
  return /^\d+(\.\d{1,2})?$/.test(valeur) ? Number(valeur) : undefined
}

const formatCode = (valeur: number) => valeur.toFixed(2).replace('.', ',')

function AjoutCoffretDialog({ open, onClose, onCree }: AjoutCoffretDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [debut, setDebut] = useState('')
  const [fin, setFin] = useState('')
  const [colonnes, setColonnes] = useState(String(COLONNES_PAR_DEFAUT))
  const [nomSaisi, setNomSaisi] = useState<string>()
  const [erreur, setErreur] = useState<string>()
  const [avertissements, setAvertissements] = useState<string[]>([])
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open && !dialog.open) {
      setDebut('')
      setFin('')
      setColonnes(String(COLONNES_PAR_DEFAUT))
      setNomSaisi(undefined)
      setErreur(undefined)
      setAvertissements([])
      dialog.showModal()
    } else if (!open && dialog.open) {
      dialog.close()
    }
  }, [open])

  const valeurDebut = lireNumero(debut)
  const valeurFin = lireNumero(fin)
  const valeurColonnes = /^\d+$/.test(colonnes.trim()) ? Number(colonnes) : undefined
  const plageValide = valeurDebut !== undefined && valeurFin !== undefined && valeurDebut > 0 && valeurDebut < valeurFin
  const nomAuto = plageValide ? `COFFRET PIGES ${formatCode(valeurDebut)} À ${formatCode(valeurFin)}` : ''
  const nom = nomSaisi ?? afficherNomCoffret(nomAuto)
  const nombrePiges = plageValide ? Math.round((valeurFin - valeurDebut) * 100) + 1 : 0
  const nombreLignes = valeurColonnes ? Math.ceil(nombrePiges / valeurColonnes) : 0
  const estCree = avertissements.length > 0

  const verifier = (): string | undefined => {
    if (valeurDebut === undefined || valeurFin === undefined) {
      return 'Saisissez deux numéros, avec au plus 2 décimales (ex. : 14,25).'
    }
    if (!plageValide) return 'Le premier numéro doit être plus petit que le dernier.'
    if (!valeurColonnes || valeurColonnes > MAX_COLONNES) {
      return `Le nombre de colonnes doit être compris entre 1 et ${MAX_COLONNES}.`
    }
    if (nombrePiges > MAX_PIGES) return `Un coffret contient au plus ${MAX_PIGES} piges (ici ${nombrePiges}).`
    return undefined
  }

  const creer = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const probleme = verifier()
    if (probleme || valeurDebut === undefined || valeurFin === undefined || !valeurColonnes) {
      setErreur(probleme)
      return
    }
    setErreur(undefined)
    setIsSaving(true)
    try {
      const coffret = await createCoffret({
        code_debut: valeurDebut,
        code_fin: valeurFin,
        colonnes: valeurColonnes,
        // Sans modification, le serveur genere lui-meme le nom.
        nom: nomSaisi?.trim() || undefined,
      })
      onCree(coffret)
      if (coffret.avertissements.length > 0) {
        setAvertissements(coffret.avertissements)
      } else {
        onClose()
      }
    } catch (caughtError) {
      setErreur(caughtError instanceof Error ? caughtError.message : 'Impossible de créer le coffret.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <dialog ref={dialogRef} className="modal" onClose={onClose} aria-labelledby="ajout-coffret-titre">
      <form className="modal-form" onSubmit={creer}>
        <h2 id="ajout-coffret-titre">Ajouter un coffret</h2>

        {estCree ? (
          <>
            <p className="modal-success">Coffret créé.</p>
            <div className="modal-warning" role="status">
              {avertissements.map((texte) => <p key={texte}>{texte}</p>)}
            </div>
            <div className="modal-actions">
              <Button variant="primary" onClick={onClose}>Fermer</Button>
            </div>
          </>
        ) : (
          <>
            <div className="modal-row">
              <label>
                Premier numéro
                <input value={debut} onChange={(event) => setDebut(event.target.value)} inputMode="decimal" placeholder="14,00" autoFocus />
              </label>
              <label>
                Dernier numéro
                <input value={fin} onChange={(event) => setFin(event.target.value)} inputMode="decimal" placeholder="14,50" />
              </label>
              <label>
                Colonnes
                <input value={colonnes} onChange={(event) => setColonnes(event.target.value)} inputMode="numeric" />
              </label>
            </div>
            <label>
              Nom du coffret
              <input
                value={nom}
                onChange={(event) => setNomSaisi(event.target.value)}
                placeholder="Rempli automatiquement"
                maxLength={100}
              />
            </label>

            <p className="modal-preview">
              {plageValide
                ? <><strong>{nombrePiges}</strong> piges, de {formatCode(valeurDebut)} à {formatCode(valeurFin)}{nombreLignes > 0 && <>, sur <strong>{nombreLignes}</strong> ligne{nombreLignes > 1 ? 's' : ''}</>}</>
                : 'Saisissez le premier et le dernier numéro.'}
            </p>

            <StateMessage variant="error">{erreur}</StateMessage>

            <div className="modal-actions">
              <Button variant="secondary" onClick={onClose}>Annuler</Button>
              <Button variant="primary" type="submit" disabled={isSaving}>
                {isSaving ? 'Création…' : 'Créer'}
              </Button>
            </div>
          </>
        )}
      </form>
    </dialog>
  )
}

export default AjoutCoffretDialog
