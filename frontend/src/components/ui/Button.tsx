import type { ButtonHTMLAttributes, PropsWithChildren } from 'react'

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'coffret'

type ButtonProps = PropsWithChildren<
  ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: ButtonVariant
  }
>

const variantClassNames: Record<ButtonVariant, string> = {
  primary: 'primary-button',
  secondary: 'secondary-button',
  danger: 'danger-button',
  coffret: 'coffret-button',
}

function Button({ children, className, variant = 'primary', type = 'button', ...props }: ButtonProps) {
  const classes = [variantClassNames[variant], className].filter(Boolean).join(' ')

  return (
    <button type={type} className={classes} {...props}>
      {children}
    </button>
  )
}

export default Button

