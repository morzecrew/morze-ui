# Changelog

Notable changes to `@morze/ui`. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the kit follows
[semantic versioning](https://semver.org/) — with the 0.x caveat that a minor
bump may still carry a breaking change, each one listed under **Breaking**.

This file starts at 0.4.0. Everything below it was reconstructed afterwards
from `FIXES.md` and the git history, and one stretch could not be recovered at
all — see [0.2.5 – 0.3.7](#025--037). That gap is the reason the file exists:
between 0.2.0 and 0.3.7 the package went out eleven times, with real API
changes among them, and the only record left is six commits that say
`bump x.y.z`.

## [Unreleased]

### Fixed

- **Two column ids that differ only by punctuation shared one width** (G-12).
  `cssSafe` let `_` through *and* used it as the replacement for everything
  else, so `a.b` and `a_b` both became `a_b`: one custom property, one width,
  and dragging either column resized both. The escaping is injective now.
- **The first-load placeholder had no table under it** (G-14). It was one cell
  spanning the full width with a single bar in it, which announced a list and
  then jumped into a grid the moment the rows arrived. It draws a cell per
  column, pinned columns included.

### Changed

- **The page aurora is a fixed layer rather than `background-attachment:
  fixed`** (K-12). The keyword makes the compositor re-rasterise the
  background against the viewport on every scroll frame, which is expensive
  beside the glass layer's backdrop-filters, and iOS ignores it outright.
  `.mz-root` paints its colour and halo on a fixed `::before`; the sidebar
  layout keeps painting on the element and merely drops the keyword, because
  the layer version needed a stacking context to sit behind its own
  background — and a stacking context is a backdrop root in Chrome, which cost
  the rail its frost. Verified by screenshot: the halo's footprint and the
  page are within 0.02% of the old rendering.

  A host that overrode `background` on `.mz-root` itself now has to override
  it on `.mz-root::before`; `--mz-bg` is unaffected and remains the knob.

## [0.4.0] — 2026-09-12

The P1 half of the 2026-09 review (`docs/review-2026-09.md`). Every entry below
has a longer write-up in `FIXES.md` under the finding's id.

### Breaking

- **`onRowClick` no longer fires for a click that started on a control inside a
  cell** — a link, button, field, label or anything with a widget role (G-02).
  A delete button used to raise its confirmation dialog *and* open the record
  behind it, and every host worked around it with `stopPropagation` in every
  action cell. A host that relied on the old bubbling calls `onRowClick`
  itself from the control. `onRowDoubleClick` and `onRowContextMenu` follow the
  same rule.
- **Six tokens removed** (V-11): `--mz-bg-rgb`, `--mz-surface-rgb`,
  `--mz-elevated-rgb`, `--mz-primary-soft`, `--mz-primary-glow`,
  `--mz-radius-xl`. All six were published and read by nothing, so a host that
  overrode them was already seeing no effect. `--mz-face-fill` and
  `--mz-face-fill-hover` stay as deliberate aliases.

### Added

- **`DatePicker` and `DateRangePicker`** (K-11, G-08) — the `Calendar` behind a
  field, on the select trigger's own recipe, with a clear button and `presets`
  on the range. `toISODate` / `fromISODate` are the bridge to the `YYYY-MM-DD`
  a backend speaks, and they read the local calendar.
- **DataTable — a height for the scroller**: `maxHeight`, `height`, `fill`
  (D-05). `stickyHeader` has defaulted to `true` since 0.1.0 and did nothing
  without one of these: sticky resolves against the scroller, and the scroller
  grew with its content and never scrolled.
- **DataTable — `frame="plain"`** (V-08), for a table already inside a `Card`,
  where the two borders doubled up.
- **DataTable — global search**: `search`, whose value lives in `query.search`,
  resets the page and reaches the URL through `useTableQuery` as `q` (G-04).
- **DataTable — a summary row**: `summary` plus `column.footer(rows)` (G-05),
  sticky to the bottom of the scroller the way the header is sticky to the top.
- **DataTable — controlled expansion**: `expanded`, `onExpandedChange`,
  `defaultExpanded`, `expandOnRowClick`, and an expand-all control in the
  header (G-03).
- **DataTable — column style and sort hooks**: `className`, `headerClassName`,
  `sortDescFirst` (G-05).
- **DataTable — `onRowDoubleClick`, `onRowContextMenu`**.
- **DataTable — richer filters** (D-07, G-08): `text` takes
  `ops: ['contains' | 'equals' | 'startsWith']` and sends the choice as
  `value.op`; `select` takes `searchable` and offers All / None;
  `number-range` finally draws its `unit`; `date-range` takes `presets` and
  puts the kit's own `Calendar` under the two typed fields.
- **DataTable — `filterTrigger`** (V-07): the funnel appears under the pointer,
  under the keyboard, and whenever its column is filtering. `"always"` restores
  the old unconditional row; touch keeps it unconditional either way.
- **DataTable — `editable.canEdit(row)`** (D-11), the per-row veto.
- **DataTable — `unsize(id)` and a stamped layout** (G-07). A hand-dragged
  column is excluded from auto-fit permanently by design, and nothing undid it;
  the Columns list now grows an "auto width" button on exactly those columns.
  The stored layout is written as `{ v: 1, …layout }` and a payload stamped
  with anything else is dropped rather than half-read; an unstamped one is
  adopted as-is, so nothing is lost on the way up.
- **DataTable — `useTableQuery` takes `serializeFilters` / `parseFilters`**
  (D-04), for a compact URL and for a `custom` value `JSON.stringify` cannot
  express.
- **DataTable — a11y state** (G-09): `aria-busy` during a refetch,
  `aria-rowcount` over the whole result set, the selection count in a live
  region.
- **`TableHead` — `sortable`, `sorted`, `onSort`, `sortLabel`** (V-06): the
  sort control the hand-laid table was missing, drawn the way the grid draws
  it.
- **Sizes and props across the kit** (K-01…K-06): `SelectTrigger` `size="lg"`,
  `RadioGroupItem` `size`, `Textarea` `inputSize`, `Dialog` `size`, `Sheet`
  `size` and `SheetBody`, `Alert` `live`, `SidebarProvider` `shortcut`,
  `ToggleGroupItem`'s own `tone`, `Progress` `indeterminate`, `AvatarGroup`
  `max`.
- **Tokens**: `--mz-wash-hover` / `--mz-wash-press`, `--mz-glow` / `-soft` /
  `-panel`, `--mz-duration-fast`, and the shared table header set
  (`--mz-th-bg`, `--mz-th-color`, `--mz-th-font-size`, `--mz-row-hover`,
  `--mz-row-selected`).

### Changed

- **One hover language, by resting surface** (V-03). A control is filled,
  raised or flat, and the hover belongs to the surface rather than to the
  component. `Toggle` with no variant is flat and now lights up exactly like
  `ghost` — it used to take the raised face and the 24% rim, which is a
  *secondary button's resting state*. `Toggle outline` raises its face.
  `SelectTrigger` stopped picking up a tone rim on hover, which had made it the
  one control in a form row answering the pointer in colour. The switch, off,
  got the tone rim its checkbox and radio siblings already had.
- **Growth is a button's** (V-03): a free-standing `Toggle` grows on hover like
  one; an item inside a segmented or joined group does not, because a swelling
  item climbs over its neighbour. The slider thumb still grows under pressure
  and is documented as the exception.
- **One glow, one wash, two durations, one press depth** (V-04, V-05). The ten
  spellings of the convex glow collapsed into three tokens by size; the flat
  wash went from six percentages to one; transitions from five durations to
  two; the press dip from `.98` / `.94` / `1.06` to one `--mz-press-scale`.
- **`Table` and `DataTable` draw one header and one row** (V-06). They were
  12px label-cased on `--mz-well` against 14px inherited on the frosted well,
  with rows lighting up at 3.5% against a 4.5% mix of a different colour.
- **Twenty hardcoded `--mz-primary-rgb` reads now follow `--mz-tone-rgb`**
  (V-10) — the table's chips and count, the sidebar badge and sub-item, the
  active sort arrow, the resizer, the card and accordion hovers. `.mz-dt`,
  `.mz-card`, `.mz-sidebar` and `.mz-accordion-trigger` joined the toned roots.
- **`onLoadMore` is handed the page to fetch**: `onLoadMore({ nextPage })`
  (G-11). It took no arguments, and since the table does not increment
  `query.page` — the pager owns that field — every host kept a counter of its
  own.
- **`Sheet` body padding** (V-09): the header and footer had 20px and the
  middle had none, so content ran into the panel edge. `SheetBody` is the
  scrolling middle.

### Tooling

- **This file** (K-09). It starts here because the eleven releases before it
  left nothing behind but `bump x.y.z`; the gap is spelled out at
  [0.2.5 – 0.3.7](#025--037).
- **Conventional commits** (K-09): documented in the README, with an opt-in,
  zero-dependency `commit-msg` hook behind `npm run hooks`.
- **A browser runner** (K-10): `npm run test:browser` runs
  `tests/data-table.browser.test.tsx` in a real Chrome, against the real
  stylesheet. It guards the two defects that depend on a layout engine and
  were previously guarded by their comments alone — the ResizeObserver freeze
  and the redistribute-on-hide half of auto-fit — both verified by
  reintroducing the original bug and watching the test fail. `vitest` moves to
  5.0.0, which is what the playwright provider requires; the existing suite
  needed no changes.

### Fixed

- **`headerTitle` did nothing on a sortable column** (D-08) — `title` was taken
  by the sort hint there, which is exactly the column readers ask about.
- **A right-aligned header was pushed away from its own numbers** (D-10).
- **A refused inline save was invisible** (D-11): the text editor put the
  message in a `title` attribute, which no screen reader announces, and the
  select editor rolled back in silence. Both render it now, under `aria-live`.
- **Chips and the pager ignored the locale** (D-12): raw ISO dates and
  ungrouped numbers beside a grouped `total`, so a Russian table read
  "1–25 из 13 659". An ISO day is also parsed on the local calendar now, rather
  than through UTC midnight, which moved the first of a month to the last of
  the previous one west of Greenwich.
- **Checkboxes that behaved like radios** (D-13): a `multiple: false` select
  and a `boolean` filter drew checkboxes inside `role="radiogroup"`. Both are
  `RadioGroup` now.
- **A long badge was sliced mid-glyph** rather than cut with an ellipsis
  (V-12), and the idle sort stack was drawn heavier than the sorted arrow it
  is the absence of.
- **The calendar caption capitalised every word**: `text-transform: capitalize`
  turned Russian "сентябрь 2026 г." into "Сентябрь 2026 Г.".

## [0.3.8] — 2026-09-12

The P0 half of the 2026-09 review (PR #1). Each has a full write-up in
`FIXES.md`.

### Fixed

- **Load-more went quiet after a query change** (D-01). `askedAt` remembered
  `data.length` at the time of the request and never reset, so a filter whose
  first page happened to be as long as the rows already on screen — which a
  first page nearly always is — left neither the observer nor the button
  willing to ask again.
- **Auto-fit did nothing under a controlled `layout`** (D-02). The fit wrote
  into internal state the controlled branch does not read, so a host that owned
  the layout got no auto-fit at all. Fitted widths now live in an overlay over
  the controlled layout, for the columns the fit still governs.
- **The table submitted a surrounding `<form>`** (D-03): fourteen internal
  `<Button>`s without `type="button"`.
- **`useTableQuery` clobbered the router's history state and wrote the URL on
  mount** (D-04). `replaceState(null, …)` destroys what Next.js App Router and
  React Router keep there, and `encode` always wrote `size`, so the address bar
  changed before the reader had touched anything.
- **Duplicate ids in the date-range filter** (D-06): `mz-dt-from` /
  `mz-dt-to` were fixed strings, so two date filters on a page shared them.
- **`aria-sort` on every header** (D-09), including columns that cannot sort —
  to assistive tech `none` means "sortable, not sorted yet".
- **Two focus rings on `SelectTrigger`** (V-02).

### Changed

- **Every tone names the label colour that goes with its fill** (V-01):
  `--mz-primary-fg` … `--mz-info-fg`, read through `--mz-tone-fg`, in place of
  the literal `#fff` every filled control painted. The shipped value stays
  white on all six tones — a decision recorded in `FIXES.md` — so this changes
  nothing visually and gives a host with a pale tone one edit per tone instead
  of an override per component.

## 0.2.5 – 0.3.7

**No record.** Eleven releases (0.2.5 through 0.3.7) went out between
2026-08-26 and 2026-09-10, carrying real API changes among them — the tone
system, the glass layer, the flattened fills, the night ramp, `Calendar`,
`Sidebar`, `Chart`, the locale bundles' second half. The git history for the
stretch is six commits reading `bump x.y.z`, and nothing else was written down
at the time.

Where a change of that period is load-bearing, `FIXES.md` describes it and the
design notes live in the CSS comments; what is lost is which version each one
landed in. This file exists so that stops happening.

## [0.2.4] — 2026-08-26

### Fixed

- **A `custom` filter could grow the popover off the screen.** The panel is now
  a flex column bounded by the height Radix measured for it, with the body
  taking the overflow, so a tall host widget can no longer bury the Apply and
  Reset buttons.

## [0.2.2]

### Fixed

- **The column filter was the one child left untranslated.** `DataTable`
  rendered `ColumnFilter` without handing `labels` down, so a host that passed
  a locale bundle got a translated table everywhere except the header filter.

## [0.2.1]

### Fixed

- **Auto-fit never redistributed after a column was hidden or moved** — the
  remaining columns kept their old widths and the slack stayed at the right
  edge.
- **The layout was persisted from inside a state updater**, so React running
  the updater twice for one commit — which StrictMode always does — wrote the
  layout twice and reported one user action to the host twice.

## [0.2.0] — 2026-08-25

### Fixed

- **The scroll observer and React re-rendered each other until the tab locked.**
  The edge-shadow effect wrote a fresh state object on every observer tick, and
  any cell that reflowed during the resulting render fed the observer again.
  The tab froze hard: no console output, no DevTools, and hot reload could not
  recover it, which made a fixed build look just as broken until the tab was
  closed.

### Added

- **DataTable** — `rowClassName` and `rowProps`; `pageSizeOptions={false}` for
  a backend that fixes the page size; `onLoadMore` with a footer inside the
  table's own scroller, so an infinite scroll works from the inside;
  `filter: { type: 'custom' }`, which renders a host widget inside the kit's
  popover and takes part in `query.filters`.
- **Locale bundles** — `@morze/ui/locales/ru` and `/en`, with a test that a new
  label has to be translated rather than silently drift.

## [0.1.0] — 2026-08-25

First release. The kit as migrated into eis-frontend: 274 import sites across
95 files, 20 vendored shadcn components deleted, the app shell moved onto
`Sidebar` and the v2 search table onto `DataTable`.
