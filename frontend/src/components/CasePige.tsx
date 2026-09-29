import type { Pige } from '../types/api'

type CasePigeProps = {
  pige: Pige
  isSelected: boolean
  onIncrement: (pige: Pige) => void
  onDecrement: (pige: Pige) => void
}

function CasePige({ pige, isSelected, onIncrement, onDecrement }: CasePigeProps) {
  const displayCode = pige.code.replace(',', '.')
  const quantite = pige.quantite_manquante

  return (
    <div
      className={`pige-slot status-${pige.statut.toLowerCase()}${isSelected ? ' is-selected' : ''}`}
      style={{
        gridRow: pige.position_ligne,
        gridColumn: pige.position_colonne,
      }}
    >
      <button
        type="button"
        className="pige-cell"
        onClick={() => onIncrement(pige)}
        aria-label={`Pige ${displayCode}, ${quantite} a commander. Ajouter 1`}
      >
        <span className="pige-code">{displayCode}</span>
        {quantite > 0 && <span className="pige-stock">×{quantite}</span>}
      </button>
      {quantite > 0 && (
        <button
          type="button"
          className="pige-minus"
          onClick={() => onDecrement(pige)}
          aria-label={`Retirer 1 a la pige ${displayCode}`}
        >
          −
        </button>
      )}
    </div>
  )
}

export default CasePige
