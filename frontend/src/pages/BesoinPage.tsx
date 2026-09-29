import { Fragment, useCallback, useEffect, useState } from 'react'
import QuantiteSelector from '../components/QuantiteSelector'
import { Button, PageHeader, StateMessage, useToast } from '../components/ui'
import { createControle, createExport, getBesoinsGroupes, getExportFichier, getExports } from '../services/api'
import { useDebouncedSave } from '../hooks/useDebouncedSave'
import type { BesoinGroupe, ExportFormat, ExportLigne, ExportLot, Utilisateur } from '../types/api'
import { afficherNomCoffret } from '../utils/rechercheCoffret'

const dateFormat = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'short', timeStyle: 'short' })

// Telecharge le fichier sans ouvrir d'onglet (pas bloque par le navigateur).
async function telecharger(lotId: number, format: ExportFormat) {
  const fichier = await getExportFichier(lotId, format).catch(() => {
    throw new Error('Impossible de télécharger le fichier.')
  })
  const url = URL.createObjectURL(fichier)
  const lien = document.createElement('a')
  lien.href = url
  lien.download = `pigecontrol_commande_${lotId}.${format === 'excel' ? 'xlsx' : 'pdf'}`
  lien.click()
  URL.revokeObjectURL(url)
}

const valeurCode = (code: string) => Number(code.replace(',', '.'))
const pluriel = (nombre: number, mot: string) => `${mot}${nombre > 1 ? 's' : ''}`

// Une puce par code dans les exports precedents : quantites de tous les coffrets additionnees.
function lignesParCode(lignes: ExportLigne[]) {
  const parCode = new Map<string, { code: string; quantite: number; coffrets: string[] }>()
  for (const ligne of lignes) {
    const entree = parCode.get(ligne.code) ?? { code: ligne.code, quantite: 0, coffrets: [] }
    entree.quantite += ligne.quantite
    entree.coffrets.push(afficherNomCoffret(ligne.coffret_nom))
    parCode.set(ligne.code, entree)
  }
  // Premier numero du nom : "9,00 a 10,00" passe avant "10,00 a 10,50".
  const ordreCoffret = (nom: string) => valeurCode(nom.match(/\d+(?:,\d+)?/)?.[0] ?? '0')
  for (const entree of parCode.values()) {
    entree.coffrets.sort((a, b) => ordreCoffret(a) - ordreCoffret(b))
  }
  return [...parCode.values()].sort((a, b) => valeurCode(a.code) - valeurCode(b.code))
}

type BesoinPageProps = {
  utilisateur: Utilisateur
  onBack: () => void
}

function BesoinPage({ utilisateur, onBack }: BesoinPageProps) {
  const [groupes, setGroupes] = useState<BesoinGroupe[]>([])
  const [ouverts, setOuverts] = useState<Set<string>>(new Set())
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string>()
  const { toastElement, showToast } = useToast()
  const [exports, setExports] = useState<ExportLot[]>([])
  const [isExporting, setIsExporting] = useState(false)

  const loadBesoins = useCallback(() => {
    return getBesoinsGroupes()
      .then(setGroupes)
      .catch(() => setError('Impossible de charger les besoins.'))
      .finally(() => setIsLoading(false))
  }, [])

  const loadExports = useCallback(() => {
    return getExports()
      .then(setExports)
      .catch(() => setError('Impossible de charger les exports.'))
  }, [])

  useEffect(() => {
    loadBesoins()
    loadExports()
  }, [loadBesoins, loadExports])

  const exporter = async (format: ExportFormat) => {
    setIsExporting(true)
    try {
      const lot = await createExport(utilisateur.id)
      const codes = lignesParCode(lot.lignes).length
      const pieces = lot.lignes.reduce((sum, ligne) => sum + ligne.quantite, 0)
      showToast(`Commande n°${lot.id} exportée : ${codes} ${pluriel(codes, 'pige')}, ${pieces} ${pluriel(pieces, 'pièce')}.`)
      await Promise.all([loadBesoins(), loadExports()])
      await telecharger(lot.id, format)
    } catch (caughtError) {
      showToast(caughtError instanceof Error ? caughtError.message : "Impossible d'exporter.", 'error')
    } finally {
      setIsExporting(false)
    }
  }

  const retelecharger = (lotId: number, format: ExportFormat) => {
    telecharger(lotId, format).catch((caughtError: Error) => showToast(caughtError.message, 'error'))
  }

  const saveQuantity = useCallback(async (pigeId: number, value: number) => {
    try {
      await createControle({
        pige_id: pigeId,
        utilisateur_id: utilisateur.id,
        quantite_manquante: value,
      })
    } catch (caughtError) {
      showToast(caughtError instanceof Error ? caughtError.message : 'Impossible de modifier la quantité.', 'error')
      await loadBesoins()
    }
  }, [loadBesoins, showToast, utilisateur.id])

  const { schedule, isSaving } = useDebouncedSave(saveQuantity)

  // Modifie la quantite d'une pige (donc d'un coffret) et recalcule le total de son code.
  // A 0, la ligne reste visible (grisee) pour pouvoir remonter avec + en cas d'erreur.
  const updateQuantite = (pigeId: number, dejaCommandee: number, value: number) => {
    const nextValue = Math.min(99, Math.max(0, value))
    setGroupes((current) =>
      current.map((groupe) => {
        if (!groupe.detail.some((detail) => detail.pige_id === pigeId)) {
          return groupe
        }
        const detail = groupe.detail.map((item) =>
          item.pige_id === pigeId ? { ...item, quantite_a_commander: nextValue } : item,
        )
        return { ...groupe, detail, quantite_a_commander: detail.reduce((sum, item) => sum + item.quantite_a_commander, 0) }
      }),
    )
    schedule(pigeId, dejaCommandee + nextValue)
  }

  const basculerDetail = (code: string) => {
    setOuverts((current) => {
      const next = new Set(current)
      if (next.has(code)) {
        next.delete(code)
      } else {
        next.add(code)
      }
      return next
    })
  }

  const groupesActifs = groupes.filter((groupe) => groupe.quantite_a_commander > 0)
  const totalQuantite = groupesActifs.reduce((sum, groupe) => sum + groupe.quantite_a_commander, 0)

  const dejaExportee = (quantite: number) =>
    quantite > 0 && <span className="deja-commande">+{quantite} déjà {pluriel(quantite, 'exportée')}</span>

  return (
    <main className="screen">
      <PageHeader
        eyebrow="Réapprovisionnement"
        title="Pièces à commander"
        left={<Button variant="secondary" onClick={onBack}>Retour</Button>}
        right={<span className="count-badge">{groupesActifs.length}</span>}
      />

      <StateMessage>{isLoading ? 'Chargement des besoins...' : undefined}</StateMessage>
      <StateMessage variant="error">{error}</StateMessage>

      {!isLoading && groupesActifs.length === 0 && (
        <StateMessage variant="success">Aucune nouvelle pièce à commander.</StateMessage>
      )}

      {groupes.length > 0 && (
      <section className="table-panel">
        <table>
          <thead>
            <tr>
              <th>Code pige</th>
              <th>Coffret</th>
              <th>Quantité à commander</th>
            </tr>
          </thead>
          <tbody>
            {groupes.map((groupe) => {
              const plusieurs = groupe.detail.length > 1
              const ouvert = plusieurs && ouverts.has(groupe.code)
              const [seul] = groupe.detail
              return (
                <Fragment key={groupe.code}>
                  <tr className={groupe.quantite_a_commander === 0 ? 'is-cleared' : undefined}>
                    <td>
                      <strong>{groupe.code.replace(',', '.')}</strong>
                      {dejaExportee(groupe.quantite_deja_commandee)}
                    </td>
                    <td>
                      {plusieurs ? (
                        <button
                          type="button"
                          className="detail-toggle"
                          aria-expanded={ouvert}
                          onClick={() => basculerDetail(groupe.code)}
                        >
                          {groupe.detail.length} coffrets · {ouvert ? 'Masquer' : 'Détail'}
                        </button>
                      ) : (
                        afficherNomCoffret(seul.coffret_nom)
                      )}
                    </td>
                    <td>
                      {plusieurs ? (
                        <strong className="table-total">{groupe.quantite_a_commander}</strong>
                      ) : (
                        <div className="table-quantity">
                          <QuantiteSelector
                            value={seul.quantite_a_commander}
                            max={99}
                            onChange={(value) => updateQuantite(seul.pige_id, seul.quantite_deja_commandee, value)}
                          />
                        </div>
                      )}
                    </td>
                  </tr>
                  {ouvert && groupe.detail.map((detail) => (
                    <tr key={detail.pige_id} className={`detail-row${detail.quantite_a_commander === 0 ? ' is-cleared' : ''}`}>
                      <td></td>
                      <td>
                        {afficherNomCoffret(detail.coffret_nom)}
                        {dejaExportee(detail.quantite_deja_commandee)}
                      </td>
                      <td>
                        <div className="table-quantity">
                          <QuantiteSelector
                            value={detail.quantite_a_commander}
                            max={99}
                            onChange={(value) => updateQuantite(detail.pige_id, detail.quantite_deja_commandee, value)}
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </Fragment>
              )
            })}
          </tbody>
          {groupesActifs.length > 0 && (
            <tfoot>
              <tr>
                <td colSpan={2}>Total</td>
                <td><strong>{totalQuantite}</strong> {pluriel(totalQuantite, 'pièce')}</td>
              </tr>
            </tfoot>
          )}
        </table>
        {isSaving && <p className="autosave-status is-saving">Sauvegarde...</p>}
      </section>
      )}

      <div className="export-actions">
        <Button
          variant="primary"
          disabled={groupesActifs.length === 0 || isSaving || isExporting}
          onClick={() => exporter('excel')}
        >
          Exporter Excel
        </Button>
        <Button
          variant="danger"
          disabled={groupesActifs.length === 0 || isSaving || isExporting}
          onClick={() => exporter('pdf')}
        >
          Exporter PDF
        </Button>
      </div>
      <p className="export-hint">
        Après l'export, ces pièces passent dans « Exports précédents » et la liste repart à zéro.
      </p>

      {exports.length > 0 && (
        <section className="exports-list">
          <h2 className="history-day-title">
            Exports précédents
            <span>{exports.length} {pluriel(exports.length, 'export')}</span>
          </h2>
          {exports.map((lot) => {
            const lignes = lignesParCode(lot.lignes)
            const pieces = lignes.reduce((sum, ligne) => sum + ligne.quantite, 0)
            return (
              <article className="passage-card" key={lot.id}>
                <header className="passage-header">
                  <h3>Commande n°{lot.id}</h3>
                  <span className="passage-meta">
                    {dateFormat.format(new Date(lot.date))} · {lot.utilisateur_nom}
                  </span>
                </header>
                <p className="passage-summary">
                  <strong>{lignes.length}</strong> {pluriel(lignes.length, 'pige')} ·{' '}
                  <strong>{pieces}</strong> {pluriel(pieces, 'pièce')}
                </p>
                <div className="passage-chips">
                  {lignes.map((ligne) => (
                    <span className="pige-chip" key={ligne.code} title={ligne.coffrets.join(', ')}>
                      {ligne.code.replace(',', '.')} <strong>×{ligne.quantite}</strong>
                    </span>
                  ))}
                </div>
                <div className="passage-actions">
                  <Button variant="secondary" onClick={() => retelecharger(lot.id, 'excel')}>Excel</Button>
                  <Button variant="secondary" onClick={() => retelecharger(lot.id, 'pdf')}>PDF</Button>
                </div>
              </article>
            )
          })}
        </section>
      )}
      {toastElement}
    </main>
  )
}

export default BesoinPage
