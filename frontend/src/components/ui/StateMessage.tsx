type StateMessageVariant = 'default' | 'error' | 'success'

type StateMessageProps = {
  children?: string
  variant?: StateMessageVariant
}

function StateMessage({ children, variant = 'default' }: StateMessageProps) {
  if (!children) {
    return null
  }

  return <p className={`state-message ${variant}`}>{children}</p>
}

export default StateMessage

