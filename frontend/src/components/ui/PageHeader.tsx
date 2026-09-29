import type { ReactNode } from 'react'

type PageHeaderProps = {
  eyebrow: string
  title: string
  left?: ReactNode
  right?: ReactNode
}

function PageHeader({ eyebrow, title, left, right }: PageHeaderProps) {
  if (!left && !right) {
    return (
      <section className="page-heading">
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
      </section>
    )
  }

  return (
    <header className="toolbar">
      <div className="toolbar-left">{left}</div>
      <div className="toolbar-title">
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
      </div>
      <div className="toolbar-right">{right}</div>
    </header>
  )
}

export default PageHeader

