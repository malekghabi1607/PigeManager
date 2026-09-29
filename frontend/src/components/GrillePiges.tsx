import type { Pige } from '../types/api'
import CasePige from './CasePige'

type GrillePigesProps = {
  piges: Pige[]
  selectedPigeId?: number
  onIncrement: (pige: Pige) => void
  onDecrement: (pige: Pige) => void
}

function GrillePiges({ piges, selectedPigeId, onIncrement, onDecrement }: GrillePigesProps) {
  const columnCount = Math.max(...piges.map((pige) => pige.position_colonne), 1)
  const rowCount = Math.max(...piges.map((pige) => pige.position_ligne), 1)

  return (
    <div
      className="pige-grid"
      style={{
        gridTemplateColumns: `repeat(${columnCount}, minmax(var(--cell-width), 1fr))`,
        gridTemplateRows: `repeat(${rowCount}, var(--cell-height))`,
      }}
    >
      {piges.map((pige) => (
        <CasePige
          key={pige.id}
          pige={pige}
          isSelected={pige.id === selectedPigeId}
          onIncrement={onIncrement}
          onDecrement={onDecrement}
        />
      ))}
    </div>
  )
}

export default GrillePiges
