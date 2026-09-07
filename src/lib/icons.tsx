import * as React from 'react'

/**
 * Inline icons so the package has no icon dependency. Each one inherits
 * currentColor and is sized by CSS, matching lucide's 24x24 grid.
 */
type IconProps = React.SVGProps<SVGSVGElement>

function icon(path: React.ReactNode, extra?: Partial<IconProps>) {
  return function Icon(props: IconProps) {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        {...extra}
        {...props}
      >
        {path}
      </svg>
    )
  }
}

export const CheckIcon = icon(<path d="M20 6 9 17l-5-5" />)
export const MinusIcon = icon(<path d="M5 12h14" />)
export const XIcon = icon(<path d="M18 6 6 18M6 6l12 12" />)
export const ChevronDownIcon = icon(<path d="m6 9 6 6 6-6" />)
export const ChevronUpIcon = icon(<path d="m18 15-6-6-6 6" />)
export const ChevronRightIcon = icon(<path d="m9 18 6-6-6-6" />)
export const CircleIcon = icon(<circle cx="12" cy="12" r="10" />)
export const DotIcon = icon(<circle cx="12" cy="12" r="4" fill="currentColor" />)
/** Three dots — a collapsed breadcrumb, a row of tabs that did not fit. */
export const EllipsisIcon = icon(
  <>
    <circle cx="5" cy="12" r="1.5" fill="currentColor" stroke="none" />
    <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
    <circle cx="19" cy="12" r="1.5" fill="currentColor" stroke="none" />
  </>
)

export const SpinnerIcon = icon(
  <>
    <circle cx="12" cy="12" r="9" opacity="0.25" />
    <path d="M21 12a9 9 0 0 0-9-9" />
  </>
)

export const ChevronLeftIcon = icon(<path d="m15 18-6-6 6-6" />)
export const ChevronsLeftIcon = icon(
  <>
    <path d="m11 17-5-5 5-5" />
    <path d="m18 17-5-5 5-5" />
  </>
)
export const ChevronsRightIcon = icon(
  <>
    <path d="m13 17 5-5-5-5" />
    <path d="m6 17 5-5-5-5" />
  </>
)
export const ArrowUpIcon = icon(<path d="M12 19V5m-7 7 7-7 7 7" />)
export const ArrowDownIcon = icon(<path d="M12 5v14m7-7-7 7-7-7" />)
/**
 * The idle state of a sortable header: a chevron up over a chevron down, the
 * stack the EIS application uses. Centred on the 24 grid — the pair this
 * replaced sat around x=10 and hung visibly left of every header label.
 */
export const SortIcon = icon(
  <>
    <path d="m8 10 4-4 4 4" />
    <path d="m8 14 4 4 4-4" />
  </>
)
export const FilterIcon = icon(<path d="M4 5h16l-6.5 7.5V19l-3 2v-8.5L4 5Z" />)
export const ColumnsIcon = icon(
  <>
    <rect x="3" y="4" width="18" height="16" rx="2" />
    <path d="M9 4v16M15 4v16" />
  </>
)
export const GripIcon = icon(
  <>
    <circle cx="9" cy="7" r="1.4" fill="currentColor" />
    <circle cx="9" cy="12" r="1.4" fill="currentColor" />
    <circle cx="9" cy="17" r="1.4" fill="currentColor" />
    <circle cx="15" cy="7" r="1.4" fill="currentColor" />
    <circle cx="15" cy="12" r="1.4" fill="currentColor" />
    <circle cx="15" cy="17" r="1.4" fill="currentColor" />
  </>
)
/**
 * A pushpin seen head-on: a wide head, a waist, and the needle below it. The
 * outline this replaced tried to draw head and needle as one closed polygon
 * and self-intersected into a bowtie — unreadable at the 13px the column
 * manager renders it at.
 */
export const PinIcon = icon(
  <>
    <path d="M9 4h6v5l3 4v2H6v-2l3-4V4Z" />
    <path d="M8 4h8" />
    <path d="M12 15v5" />
  </>
)
export const EyeIcon = icon(
  <>
    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
    <circle cx="12" cy="12" r="3" />
  </>
)
export const EyeOffIcon = icon(
  <>
    <path d="M10.6 5.2A9.8 9.8 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3 3.9M6.2 6.2A17 17 0 0 0 2 12s3.5 7 10 7c1.9 0 3.5-.6 4.9-1.4" />
    <path d="m3 3 18 18" />
  </>
)
export const SearchIcon = icon(
  <>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </>
)
export const PlusIcon = icon(<path d="M12 5v14M5 12h14" />)
export const TrashIcon = icon(
  <>
    <path d="M4 7h16M10 11v6M14 11v6" />
    <path d="M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
  </>
)
export const InboxIcon = icon(
  <>
    <path d="M3 12h5l2 3h4l2-3h5" />
    <path d="M5.5 5h13l2.5 7v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-5l2.5-7Z" />
  </>
)
export const AlertIcon = icon(
  <>
    <path d="M12 9v4M12 17h.01" />
    <path d="M10.3 3.9 2.6 17a2 2 0 0 0 1.7 3h15.4a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
  </>
)
export const SaveIcon = icon(
  <>
    <path d="M5 4h11l4 4v12a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Z" />
    <path d="M8 4v5h7M8 21v-6h8v6" />
  </>
)
