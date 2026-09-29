type QuantiteSelectorProps = {
  value: number
  max?: number
  onChange: (value: number) => void
}

function QuantiteSelector({ value, max = 20, onChange }: QuantiteSelectorProps) {
  const decrement = () => onChange(Math.max(0, value - 1))
  const increment = () => onChange(Math.min(max, value + 1))

  return (
    <div className="quantity-control" aria-label="Selection quantite manquante">
      <button type="button" className="icon-button" onClick={decrement} aria-label="Diminuer">
        -
      </button>
      <output className="quantity-value">{value}</output>
      <button type="button" className="icon-button" onClick={increment} aria-label="Augmenter">
        +
      </button>
    </div>
  )
}

export default QuantiteSelector

