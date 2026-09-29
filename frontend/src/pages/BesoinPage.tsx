import { useCallback, useEffect, useState } from 'react'
import QuantiteSelector from '../components/QuantiteSelector'
import { Button, PageHeader, StateMessage, useToast } from '../components/ui'
import { createControle, createExport, getBesoins, getExports, getExportUrl } from '../services/api'
import { useDebouncedSave } from '../hooks/useDebouncedSave'
import type { Besoin, ExportFormat, ExportLot, Utilisateur } from '../types/api'

const dateFormat = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'short', timeStyle: 'short' })

// Telecharge le fichier sans ouvrir d'onglet (pas bloque par le navigateur).
async function telecharger(lotId: number, format: ExportFormat) {
  const response = await fetch(getExportUrl(lotId, format))
  if (!response.ok) {
    throw new Error('Impossible de telecharger le fichier.')
  }
  const url = URL.createObjectURL(await response.blob())
  const lien = document.createElement('a')
  lien.href = url
  lien.download = `pigecontrol_commande_${lotId}.${format === 'excel' ? 'xlsx' : 'pdf'}`
  lien.click()
  URL.revokeObjectURL(url)
}

type BesoinPageProps = {
  utilisateur: Utilisateur
  onBack: () => void
}

function BesoinPage({ utilisateur, onBack }: BesoinPageProps) {
  const [besoins, setBesoins] = useState<Besoin[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string>()
  const { toastElement, showToast } = useToast()
  const [exports, setExports] = useState<ExportLot[]>([])
  const [isExporting, setIsExporting] = useState(false)

  const loadBesoins = useCallback(() => {
    return getBesoins()
      .then(setBesoins)
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
      const pieces = lot.lignes.reduce((sum, ligne) => sum + ligne.quantite, 0)
      showToast(`Commande n°${lot.id} exportee : ${lot.lignes.length} piges, ${pieces} pieces.`)
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
      showToast(caughtError instanceof Error ? caughtError.message : "Impossible de modifier la quantite.", 'error')
      await loadBesoins()
    }
  }, [loadBesoins, showToast, utilisateur.id])

  const { schedule, isSaving } = useDebouncedSave(saveQuantity)

  // A 0, la ligne reste visible (grisee) pour pouvoir remonter avec + en cas d'erreur.
  const updateBesoinQuantity = (besoin: Besoin, value: number) => {
    const nextValue = Math.min(99, Math.max(0, value))
    setBesoins((currentBesoins) =>
      currentBesoins.map((currentBesoin) =>
        currentBesoin.pige_id === besoin.pige_id
          ? { ...currentBesoin, quantite_a_commander: nextValue }
          : currentBesoin,
      ),
    )
    schedule(besoin.pige_id, besoin.quantite_deja_commandee + nextValue)
  }

  const activeBesoins = besoins.filter((besoin) => besoin.quantite_a_commander > 0)
  const totalQuantite = activeBesoins.reduce((sum, besoin) => sum + besoin.quantite_a_commander, 0)

  return (
    <main className="screen">
      <PageHeader
        eyebrow="Reapprovisionnement"
        title="Pieces a commander"
        left={<Button variant="secondary" onClick={onBack}>Retour</Button>}
        right={<span className="count-badge">{activeBesoins.length}</span>}
      />

      <StateMessage>{isLoading ? 'Chargement des besoins...' : undefined}</StateMessage>
      <StateMessage variant="error">{error}</StateMessage>

      {!isLoading && activeBesoins.length === 0 && (
        <StateMessage variant="success">Aucune nouvelle piece a commander.</StateMessage>
      )}

      {besoins.length > 0 && (
      <section className="table-panel">
        <table>
          <thead>
            <tr>
              <th>Coffret</th>
              <th>Code pige</th>
              <th>Quantite a commander</th>
            </tr>
          </thead>
          <tbody>
            {besoins.map((besoin) => (
              <tr key={besoin.pige_id} className={besoin.quantite_a_commander === 0 ? 'is-cleared' : undefined}>
                <td>{besoin.coffret_nom}</td>
                <td>
                  <strong>{besoin.code.replace(',', '.')}</strong>
                  {besoin.quantite_deja_commandee > 0 && (
                    <span className="deja-commande">+{besoin.quantite_deja_commandee} deja exportee{besoin.quantite_deja_commandee > 1 ? 's' : ''}</span>
                  )}
                </td>
                <td>
                  <div className="table-quantity">
                    <QuantiteSelector
                      value={besoin.quantite_a_commander}
                      max={99}
                      onChange={(value) => updateBesoinQuantity(besoin, value)}
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
          {activeBesoins.length > 0 && (
            <tfoot>
              <tr>
                <td colSpan={2}>Total</td>
                <td><strong>{totalQuantite}</strong> pieces</td>
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
          disabled={activeBesoins.length === 0 || isSaving || isExporting}
          onClick={() => exporter('excel')}
        >
          Exporter Excel
        </Button>
        <Button
          variant="danger"
          disabled={activeBesoins.length === 0 || isSaving || isExporting}
          onClick={() => exporter('pdf')}
        >
          Exporter PDF
        </Button>
      </div>
      <p className="export-hint">
        Apres l'export, ces pieces passent dans « Exports precedents » et la liste repart a zero.
      </p>

      {exports.length > 0 && (
        <section className="exports-list">
          <h2 className="history-day-title">
            Exports precedents
            <span>{exports.length} export{exports.length > 1 ? 's' : ''}</span>
          </h2>
          {exports.map((lot) => {
            const pieces = lot.lignes.reduce((sum, ligne) => sum + ligne.quantite, 0)
            return (
              <article className="passage-card" key={lot.id}>
                <header className="passage-header">
                  <h3>Commande n°{lot.id}</h3>
                  <span className="passage-meta">
                    {dateFormat.format(new Date(lot.date))} · {lot.utilisateur_nom}
                  </span>
                </header>
                <p className="passage-summary">
                  <strong>{lot.lignes.length}</strong> pige{lot.lignes.length > 1 ? 's' : ''} ·{' '}
                  <strong>{pieces}</strong> piece{pieces > 1 ? 's' : ''}
                </p>
                <div className="passage-chips">
                  {lot.lignes.map((ligne) => (
                    <span className="pige-chip" key={ligne.pige_id} title={ligne.coffret_nom}>
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
