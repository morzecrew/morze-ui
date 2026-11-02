'use client'

import * as React from 'react'

import { cn } from '../lib/utils'
import { InfoTip } from './info-tip'

/* --------------------------------------------------------------------------
   PageHeader and SectionHeader (N-10) — a title with its «?», a line under
   it, badges beside it and the actions on the right. The actions stay on the
   right edge when the row wraps: in erp-frontend a long description pushed
   them under itself and to the left, which is the bug this layout exists for.
   -------------------------------------------------------------------------- */

type HeaderProps = Omit<React.ComponentProps<'div'>, 'title'> & {
  title: React.ReactNode
  /** Behind an `InfoTip` beside the title. */
  info?: React.ReactNode
  /** Accessible name of the `InfoTip`. */
  infoLabel?: string
  /** One line under the title. */
  description?: React.ReactNode
  /** Badges and status beside the title. */
  meta?: React.ReactNode
  /** Buttons on the right. */
  actions?: React.ReactNode
  /** The heading element; `h1` for a page, `h2` for a section by default. */
  as?: 'h1' | 'h2' | 'h3' | 'h4'
}

function Header({
  kind,
  className,
  title,
  info,
  infoLabel,
  description,
  meta,
  actions,
  as,
  ...props
}: HeaderProps & { kind: 'page' | 'section' }) {
  const Heading = as ?? (kind === 'page' ? 'h1' : 'h2')
  return (
    <div data-slot={`${kind}-header`} className={cn('mz-header', `mz-header--${kind}`, className)} {...props}>
      <div className="mz-header__main">
        <div className="mz-header__title-row">
          <Heading className="mz-header__title">{title}</Heading>
          {info ? (
            <InfoTip label={infoLabel} about={typeof title === 'string' ? title : undefined}>
              {info}
            </InfoTip>
          ) : null}
          {meta}
        </div>
        {description ? <div className="mz-header__description">{description}</div> : null}
      </div>
      {actions ? <div className="mz-header__actions">{actions}</div> : null}
    </div>
  )
}

function PageHeader(props: HeaderProps) {
  return <Header kind="page" {...props} />
}

function SectionHeader(props: HeaderProps) {
  return <Header kind="section" {...props} />
}

export { PageHeader, SectionHeader }
export type { HeaderProps as PageHeaderProps, HeaderProps as SectionHeaderProps }
