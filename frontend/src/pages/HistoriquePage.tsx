import { Fragment, useEffect, useMemo, useState } from 'react'
import { Button, IconeTelecharger, PageHeader, StateMessage } from '../components/ui'
import { getHistorique } from '../services/api'
import type { HistoriqueControle } from '../types/api'
import { afficherNomCoffret } from '../utils/rechercheCoffret'

type HistoriquePageProps = {
  onBack: () => void
}

type LignePige = {
  code: string
  avant: number
  apres: number
  modifications: number
}

// Un passage : un controleur sur un coffret, clics espaces de moins de PAUSE_MS.
type Passage = {
  id: number
  coffret: string
  utilisateur: string
  debut: Date
  fin: Date
  piges: Map<string, LignePige>
}

const PAUSE_MS = 10 * 60 * 1000
// On affiche d'abord une semaine, puis 30 jours de plus a chaque demande.
const JOURS_INITIAUX = 7
const JOURS_EN_PLUS = 30

const heureFormat = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' })
const jourFormat = new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: '2-digit' })

const afficherCode = (code: string) => code.replace(',', '.')
const cleUtilisateur = (nom: string) => nom.trim().toLowerCase()
const afficherNom = (nom: string) => nom.charAt(0).toUpperCase() + nom.slice(1)
const pluriel = (nombre: number, mot: string) => `${mot}${nombre > 1 ? 's' : ''}`

function libelleJour(date: Date) {
  const aujourdhui = new Date()
  const hier = new Date()
  hier.setDate(aujourdhui.getDate() - 1)
  if (date.toDateString() === aujourdhui.toDateString()) {
    return "Aujourd'hui"
  }
  if (date.toDateString() === hier.toDateString()) {
    return 'Hier'
  }
  return jourFormat.format(date)
}

function construirePassages(historique: HistoriqueControle[]): Passage[] {
  const chronologique = [...historique].sort((a, b) => a.id - b.id)
  const passageOuvert = new Map<string, Passage>()
  const passages: Passage[] = []

  for (const controle of chronologique) {
    const date = new Date(controle.date)
    const clePassage = `${controle.coffret_nom}|${cleUtilisateur(controle.utilisateur_nom)}`
    let passage = passageOuvert.get(clePassage)
    if (!passage || date.getTime() - passage.fin.getTime() > PAUSE_MS) {
      passage = {
        id: controle.id,
        coffret: controle.coffret_nom,
        utilisateur: afficherNom(cleUtilisateur(controle.utilisateur_nom)),
        debut: date,
        fin: date,
        piges: new Map(),
      }
      passageOuvert.set(clePassage, passage)
      passages.push(passage)
    }
    passage.fin = date

    const ligne = passage.piges.get(controle.code_pige)
    if (ligne) {
      ligne.apres = controle.quantite_manquante
      ligne.modifications += 1
    } else {
      // "Avant" vient du serveur : il reste juste meme si le controle precedent est plus ancien.
      passage.piges.set(controle.code_pige, {
        code: controle.code_pige,
        avant: controle.quantite_avant,
        apres: controle.quantite_manquante,
        modifications: 1,
      })
    }
  }

  return passages.reverse()
}

function trierPiges(piges: Iterable<LignePige>) {
  return [...piges].sort(
    (a, b) => Number(a.code.replace(',', '.')) - Number(b.code.replace(',', '.')),
  )
}

function exporterPassage(passage: Passage) {
  const lignes = [
    ['Coffret', 'Contrôleur', 'Date', 'Pige', 'Avant', 'Après'],
    ...trierPiges(passage.piges.values()).map((ligne) => [
      afficherNomCoffret(passage.coffret),
      passage.utilisateur,
      passage.fin.toLocaleString('fr-FR'),
      afficherCode(ligne.code),
      String(ligne.avant),
      String(ligne.apres),
    ]),
  ]
  const csv = lignes
    .map((ligne) => ligne.map((cellule) => `"${cellule.replace(/"/g, '""')}"`).join(';'))
    .join('\r\n')
  // BOM + ";" : Excel en francais ouvre le fichier directement avec les accents.
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const lien = document.createElement('a')
  lien.href = url
  lien.download = `controle_${passage.coffret.replace(/[^\w]+/g, '_')}_${passage.fin.toISOString().slice(0, 10)}.csv`
  lien.click()
  URL.revokeObjectURL(url)
}

// Une ligne par passage ; le detail (pieces et export) s'ouvre sous la ligne.
function LignePassage({ passage }: { passage: Passage }) {
  const [ouvert, setOuvert] = useState(false)
  const piges = trierPiges(passage.piges.values())
  const aCommander = piges.filter((ligne) => ligne.apres > 0)
  const remisesOk = piges.filter((ligne) => ligne.apres === 0 && ligne.avant > 0)
  const totalPieces = aCommander.reduce((sum, ligne) => sum + ligne.apres, 0)
  const basculer = () => setOuvert((valeur) => !valeur)

  return (
    <Fragment>
      <tr className={`ligne-cliquable${ouvert ? ' is-open' : ''}`} onClick={basculer}>
        <td className="cellule-date">
          {libelleJour(passage.fin)} <span>{heureFormat.format(passage.fin)}</span>
        </td>
        <td>{afficherNomCoffret(passage.coffret)}</td>
        <td>
          {aCommander.length > 0
            ? <><strong>{aCommander.length}</strong> <span className="cellule-note">({totalPieces} {pluriel(totalPieces, 'pièce')})</span></>
            : <span className="cellule-vide">—</span>}
        </td>
        <td>{remisesOk.length > 0 ? <span className="passage-ok">{remisesOk.length}</span> : <span className="cellule-vide">—</span>}</td>
        <td className="col-par">{passage.utilisateur}</td>
        <td className="cellule-fleche">
          <button type="button" className="fleche-button" aria-expanded={ouvert} aria-label="Voir le détail" onClick={(event) => { event.stopPropagation(); basculer() }}>
            {ouvert ? '▾' : '▸'}
          </button>
        </td>
      </tr>
      {ouvert && (
        <tr className="detail-row">
          <td colSpan={6}>
            <div className="detail-contenu">
              <div className="passage-chips">
                {aCommander.map((ligne) => (
                  <span className="pige-chip" key={ligne.code}>
                    {afficherCode(ligne.code)} <strong>×{ligne.apres}</strong>
                  </span>
                ))}
                {remisesOk.map((ligne) => (
                  <span className="pige-chip is-ok" key={ligne.code}>
                    {afficherCode(ligne.code)} ✓
                  </span>
                ))}
                {aCommander.length === 0 && remisesOk.length === 0 && <span className="cellule-note">Aucun changement.</span>}
              </div>
              <Button variant="secondary" className="bouton-petit" onClick={() => exporterPassage(passage)}>
                <IconeTelecharger /> Excel
              </Button>
            </div>
          </td>
        </tr>
      )}
    </Fragment>
  )
}

function HistoriquePage({ onBack }: HistoriquePageProps) {
  const [historique, setHistorique] = useState<HistoriqueControle[]>([])
  const [jours, setJours] = useState(JOURS_INITIAUX)
  const [plusAnciens, setPlusAnciens] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string>()

  useEffect(() => {
    getHistorique(jours)
      .then((resultat) => {
        setHistorique(resultat.controles)
        setPlusAnciens(resultat.plus_anciens)
      })
      .catch(() => setError("Impossible de charger l'historique."))
      .finally(() => setIsLoading(false))
  }, [jours])

  const voirPlus = () => {
    setIsLoading(true)
    setJours((valeur) => valeur + JOURS_EN_PLUS)
  }

  const passages = useMemo(() => construirePassages(historique), [historique])

  return (
    <main className="screen screen-fixe">
      <PageHeader
        eyebrow={`${jours} derniers jours`}
        title="Historique des contrôles"
        left={<Button variant="secondary" onClick={onBack}>Retour</Button>}
      />

      <StateMessage>{isLoading ? "Chargement de l'historique..." : undefined}</StateMessage>
      <StateMessage variant="error">{error}</StateMessage>

      {!isLoading && historique.length === 0 && (
        <StateMessage variant="success">Aucun contrôle sur cette période.</StateMessage>
      )}

      {passages.length > 0 && (
        // Seul le tableau defile ; ses titres de colonnes restent visibles.
        <section className="table-panel table-scroll historique-scroll">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Coffret</th>
                <th>À commander</th>
                <th>Remises à OK</th>
                <th className="col-par">Par</th>
                <th aria-label="Détail"></th>
              </tr>
            </thead>
            <tbody>
              {passages.map((passage) => (
                <LignePassage key={passage.id} passage={passage} />
              ))}
            </tbody>
          </table>
        </section>
      )}

      {plusAnciens && (
        <div className="history-more">
          <Button variant="secondary" onClick={voirPlus} disabled={isLoading}>
            Voir les {JOURS_EN_PLUS} jours précédents
          </Button>
        </div>
      )}
    </main>
  )
}

export default HistoriquePage
