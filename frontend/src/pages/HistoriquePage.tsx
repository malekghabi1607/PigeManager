import { useEffect, useMemo, useState } from 'react'
import { Button, PageHeader, StateMessage } from '../components/ui'
import { getHistorique } from '../services/api'
import type { HistoriqueControle } from '../types/api'

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

const heureFormat = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' })
const jourFormat = new Intl.DateTimeFormat('fr-FR', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
})

const afficherCode = (code: string) => code.replace(',', '.')
const cleUtilisateur = (nom: string) => nom.trim().toLowerCase()
const afficherNom = (nom: string) => nom.charAt(0).toUpperCase() + nom.slice(1)

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
  return afficherNom(jourFormat.format(date))
}

function construirePassages(historique: HistoriqueControle[]): Passage[] {
  const chronologique = [...historique].sort((a, b) => a.id - b.id)
  const derniereValeur = new Map<string, number>()
  const passageOuvert = new Map<string, Passage>()
  const passages: Passage[] = []

  for (const controle of chronologique) {
    const date = new Date(controle.date)
    const clePige = `${controle.coffret_nom}|${controle.code_pige}`
    const avant = derniereValeur.get(clePige) ?? 0
    derniereValeur.set(clePige, controle.quantite_manquante)

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
      passage.piges.set(controle.code_pige, {
        code: controle.code_pige,
        avant,
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
    ['Coffret', 'Controleur', 'Date', 'Pige', 'Avant', 'Apres'],
    ...trierPiges(passage.piges.values()).map((ligne) => [
      passage.coffret,
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

function CartePassage({ passage }: { passage: Passage }) {
  const [ouvert, setOuvert] = useState(false)
  const piges = trierPiges(passage.piges.values())
  const aCommander = piges.filter((ligne) => ligne.apres > 0)
  const remisesOk = piges.filter((ligne) => ligne.apres === 0 && ligne.avant > 0)
  const totalPieces = aCommander.reduce((sum, ligne) => sum + ligne.apres, 0)
  const debut = heureFormat.format(passage.debut)
  const fin = heureFormat.format(passage.fin)

  return (
    <article className="passage-card">
      <header className="passage-header">
        <h3>{passage.coffret}</h3>
        <span className="passage-meta">
          {debut === fin ? debut : `${debut} → ${fin}`} · {passage.utilisateur}
        </span>
      </header>

      <p className="passage-summary">
        {aCommander.length > 0 ? (
          <>
            <strong>{aCommander.length}</strong> pige{aCommander.length > 1 ? 's' : ''} a commander ·{' '}
            <strong>{totalPieces}</strong> piece{totalPieces > 1 ? 's' : ''}
          </>
        ) : (
          'Rien a commander'
        )}
        {remisesOk.length > 0 && (
          <> · <span className="passage-ok">{remisesOk.length} remise{remisesOk.length > 1 ? 's' : ''} a OK</span></>
        )}
      </p>

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
      </div>

      <div className="passage-actions">
        <Button variant="secondary" onClick={() => setOuvert((valeur) => !valeur)}>
          {ouvert ? '▾ Masquer le detail' : '▸ Voir le detail'}
        </Button>
        <Button variant="secondary" onClick={() => exporterPassage(passage)}>
          Exporter Excel
        </Button>
      </div>

      {ouvert && (
        <table className="passage-detail">
          <thead>
            <tr>
              <th>Pige</th>
              <th>Avant</th>
              <th>Apres</th>
              <th>Modifications</th>
            </tr>
          </thead>
          <tbody>
            {piges.map((ligne) => (
              <tr key={ligne.code}>
                <td><strong>{afficherCode(ligne.code)}</strong></td>
                <td>{ligne.avant}</td>
                <td>{ligne.apres === 0 ? <span className="passage-ok">OK</span> : <strong>{ligne.apres}</strong>}</td>
                <td>{ligne.modifications}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </article>
  )
}

function HistoriquePage({ onBack }: HistoriquePageProps) {
  const [historique, setHistorique] = useState<HistoriqueControle[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string>()

  useEffect(() => {
    getHistorique()
      .then(setHistorique)
      .catch(() => setError("Impossible de charger l'historique."))
      .finally(() => setIsLoading(false))
  }, [])

  const passages = useMemo(() => construirePassages(historique), [historique])
  const parJour = useMemo(() => {
    const groupes: { jour: string; passages: Passage[] }[] = []
    for (const passage of passages) {
      const jour = libelleJour(passage.fin)
      const dernier = groupes[groupes.length - 1]
      if (dernier?.jour === jour) {
        dernier.passages.push(passage)
      } else {
        groupes.push({ jour, passages: [passage] })
      }
    }
    return groupes
  }, [passages])

  return (
    <main className="screen">
      <PageHeader
        eyebrow="Controle"
        title="Historique des controles"
        left={<Button variant="secondary" onClick={onBack}>Retour</Button>}
        right={<span className="count-badge">{passages.length}</span>}
      />

      <StateMessage>{isLoading ? "Chargement de l'historique..." : undefined}</StateMessage>
      <StateMessage variant="error">{error}</StateMessage>

      {!isLoading && historique.length === 0 && (
        <StateMessage variant="success">Aucun controle enregistre.</StateMessage>
      )}

      <div className="history-list">
        {parJour.map((groupe) => (
          <section key={groupe.jour}>
            <h2 className="history-day-title">
              {groupe.jour}
              <span>{groupe.passages.length} controle{groupe.passages.length > 1 ? 's' : ''}</span>
            </h2>
            {groupe.passages.map((passage) => (
              <CartePassage key={passage.id} passage={passage} />
            ))}
          </section>
        ))}
      </div>
    </main>
  )
}

export default HistoriquePage
