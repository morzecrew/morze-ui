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

What erp-frontend still had to work around on top of 0.5.0 (issues #3 – #12),
what a UX audit of a BI app built on it found (#13 – #25), and what that app
ran into after it (#26 – #41) — one entry per issue.

### Breaking

- **A tone is `--mz-tone`, a colour, not `--mz-tone-rgb`, a triplet** (#5). A
  one-off tone set inline as `--mz-tone-rgb: 255, 100, 130` no longer reaches
  anything; write `--mz-tone: rgb(255 100 130)` (or any colour) instead.
- **`--mz-text-rgb` is gone** (#5). The translucent text cuts — a field's hover
  rim, the scrollbar thumb, the skeleton shimmer, the chart's cursor — are cut
  from `--mz-text` itself. A host that set both keeps the right result from
  `--mz-text` alone; one that set only the triplet sets `--mz-text`.

### Added

- **`Button` — `wrap`** (#8). The label may break over lines and the button
  grows to fit; `buttonVariants({ wrap: true })` carries it onto anything
  styled as a button. erp put the padding back by hand on a trigger that
  lists the chosen records (`h-auto min-h-10 py-2 whitespace-normal`).
- **`DialogContent` — `position="top"`** (#7), passed through by
  `CommandDialog`. The panel is pinned `--mz-dialog-top` (16px, the gutter
  `size="full"` leaves) below the top of the viewport and grows downward to the
  bottom gutter, with an entrance of its own that does not dip below the top.
  A centred search panel jumped up and down under the reader's typing, so erp
  built its global search from its own overlay and panel, and re-did the
  backdrop click and the close button with them. Focus trapping, Escape and
  `aria-modal` are the centred dialog's.
- **Surface classes are public API** (#6): `mz-panel`, `mz-dialog-overlay`,
  `mz-input`, `mz-focusable` and `mz-sr-only` are documented in the README
  (*Surface classes*), and from here on a rename of any of them is listed under
  **Breaking**. `panelClass`, `overlayClass` and `inputVariants({ size })` name
  them in code, the way `buttonVariants` already did; `Input` and `Dialog`
  draw from the same helpers. erp composed its global search from
  `mz-dialog-overlay` and `mz-panel`, and a field-like trigger from
  `mz-input mz-focusable`, with nothing saying either was safe to use.
- **`--mz-sidebar-width`** (#9) — the room the sidebar currently takes: the
  panel, the icon rail, `0px` off-canvas or on mobile, plus the margin round a
  floating panel. `SidebarProvider` sets it on its wrapper (as an expression
  over `--mz-sidebar-w` / `--mz-sidebar-w-icon`) and on `<html>` (resolved, for
  portalled content), and removes it from `<html>` on unmount. erp read
  `useSidebar()` and wrote the variable itself, with `16rem` / `3.5rem`
  hardcoded.
- **`@morze/ui/testing`** (#10) — `setupJsdom()` installs inert
  `ResizeObserver`, `IntersectionObserver`, `matchMedia`, `scrollIntoView` and
  pointer-capture stand-ins wherever the environment has none, and returns the
  teardown; `@morze/ui/testing/setup` does it on import, for `setupFiles`. erp
  carried its own copy of these stubs in three test files.
- **`MorzeThemeProvider` can be driven by the application** (#3). `theme`
  makes it controlled — no state, no storage, `setTheme` only calls
  `onThemeChange` — and `attribute="class"` makes it write a `dark` / `light`
  class on `<html>` instead of `data-mz-theme`. The palettes match that class
  on the root element too, so an app on `next-themes` (or Tailwind's class
  strategy) gets the kit's palette from the class next-themes' own pre-paint
  script sets. erp copied the resolved theme into `data-mz-theme` from a bridge
  component and duplicated next-themes' storage read in an inline script in
  `index.html`; neither is needed now.
- **`MorzeLocaleProvider`** (#12) installs a language once for the whole app:
  `<MorzeLocaleProvider locale={ru} tag="ru-RU">`. `Combobox`, `MultiSelect`,
  `Calendar`, `DatePicker`, `DateRangePicker`, `DataTable` (with its pager,
  filters, column manager and cell editor), `Toaster`, `Sidebar`,
  `SidebarTrigger` / `SidebarRail`, `Dialog` / `Sheet`, `Spinner`,
  `BreadcrumbEllipsis`, `TabsList`, `NumberInput` and `CommandDialog` read
  their strings — and the date and number widgets their BCP 47 tag — from it.
  A component's own `labels` / `locale` still win key by key, a nested
  provider overrides only what it names, and an app without one stays English.
  `useMorzeLocale()` exposes the bundle and tag in force. erp passed `common`
  to three components by hand, and its five `Combobox` instances overrode
  `search` and `empty` only — so Russian users saw "Loading" and "The options
  could not be loaded".
- **`--mz-<tone>-text` and `.mz-text-<tone>`** (#15) — each tone as a text
  colour, per theme, and the helper class for a host's own markup. Soft
  badges, active tabs and nav items, links, menu checks, the table's chips and
  sort arrows and every error line read it (through `--mz-tone-text`) instead
  of the fill colour, which measured 2.45:1 (emerald) to 4.30:1 (violet) on a
  soft badge's wash.
- **`tests/contrast.test.ts`** (#14) resolves the tokens the way the browser
  does — `var()` through the theme block, `color-mix()` in sRGB — and holds
  every text / ground pair the kit draws to 4.5:1: the three text steps on
  every ramp step, each tone's label on its fill, each tone's text on the page
  and on its own wash.
- **Numeric columns** (#17): `numeric: true` on a `DataTableColumn` (it implies
  right alignment) and `numeric` on `TableHead` / `TableCell`. Both set
  `font-variant-numeric: tabular-nums`, as does any right-aligned grid cell —
  only the footer, the pager and the chart tooltip had it, and Golos Text sets
  proportional digits, so a right-aligned column of 300 figures did not line
  up.
- **Chart — a series keyed in the shape it is drawn** (#21). A `ChartConfig`
  entry takes `indicator: 'dot' | 'line' | 'dashed'` and `opacity`, used by
  both `ChartLegendContent` (which only ever drew a dot) and
  `ChartTooltipContent` (where it overrides the tooltip's own `indicator`). The
  line key is 12×2px.
- **A type scale** (#13): `--mz-text-xs` … `--mz-text-xl` (12, 13, 14, 16,
  18px) with a `--mz-leading-*` for each (16, 18, 20, 24, 24px). Every size the
  kit sets reads a step — there were ninety-odd `font-size` literals across
  eight sizes, so a compact or large-text UI was ninety overrides — and the
  titles and the label take the step's leading. `--mz-th-font-size` and the
  table's `--mz-dt-font` point at the scale. The only literals left are glyphs
  sized to their box: an avatar's initials and the sort-order digit.
- **Density for the whole kit** (#20): `MorzeThemeProvider density="compact" |
  "comfortable"` writes `data-mz-density`, which switches `--mz-control-h-xs`
  … `--mz-control-h-lg`, `--mz-row-h`, `--mz-nav-item-h`, `--mz-card-pad` and
  `--mz-card-gap`. Buttons, inputs, select-like triggers, toggles, tabs, the
  sidebar and navigation rows, cards and the table's row read them; the
  defaults are today's sizes. A button's vertical padding is derived from its
  step, so it lands on the step in every density (checked in Chrome by
  `tests/density.browser.test.tsx`). `--mz-card-title-size` and
  `--mz-card-title-weight` set the card title. Only `DataTable` had a density
  before, so a dense app mixed 34 and 40px controls in one toolbar.
- **`@morze/ui/fonts.css`** (#24) — Golos Text, self-hosted and opt-in: one
  variable woff2 per script (Latin, Latin Extended, Cyrillic, Cyrillic
  Extended; weights 400–900), `font-display: swap`, under the family name
  `--mz-font-sans` already asks for. The files and their licence (SIL OFL 1.1)
  ship in `dist/fonts/`, copied from `@fontsource-variable/golos-text` at
  build time. The token named a face the package never shipped, so a host
  that forgot to load it got the OS's face without a word. `MorzeThemeProvider`
  now also warns once in development when the first family in the stack is
  not available.
- **`themeScript()`** (#26), from `@morze/ui/theme-script` (no `"use client"`,
  so a server component can call it) and the main entry: the provider's theme
  logic as an inline head script — the same storage key, `system` resolution
  and attribute — so the first frame is right before the bundle loads. Hosts
  hand-wrote this script and kept it in step with the provider by hand.
- **`Card` — `asChild` and `pressed`** (#32, #35). `asChild` draws the card
  onto its only child, so a card that opens a page is the router link itself —
  one box, link semantics, the hover and focus ring on the focused element —
  instead of a link wrapped round a `div`. `pressed` marks a chosen card with
  the tone rim (`[aria-pressed=true]` / `[data-state=on]`), and announces
  `aria-pressed` on a clickable one.
- **DataTable — `toolbarEnd`** (#28), content at the end of the toolbar row,
  before the Columns button; and the start group now grows, so a host action
  in `toolbar` can be pushed to the end with an auto margin.
- **DataTable — `scrollerRef` and `initialScroll`** (#29). `scrollerRef` is the
  table's scrolling element, which hosts reached with
  `querySelector('.mz-dt__scroller')`; `initialScroll="end"` opens a table
  wider than its box at its last columns — once, before paint, the right way
  round in RTL.

### Changed

- **Button sizes are a floor, not a fixed height** (#8). `xs` … `lg` set
  `min-height` (28/34/40/48px) and vertical padding that adds up to under it,
  instead of `height` with side padding only. A one-line button measures what
  it did; `height: auto` no longer collapses a wrapping one to a single line.
  A host that *shrank* a button with a smaller `height` than its size now
  picks the smaller `size` (or sets `min-height` too). The `icon-*` sizes stay
  square and fixed.
- **A `dark` / `light` class on `<html>` selects the palette** (#3). A host
  that had `class="light"` on `<html>` for its own reasons, and nothing else,
  used to get the dark palette and now gets the light one. Where the class
  and `data-mz-theme` disagree on `<html>`, light wins; a host that wants the
  kit dark under a light page uses `target="element"`. The selector weighs
  what `[data-mz-theme]` does, so token overrides written against `.light` /
  `.dark` still win.
- **Every translucent tone is cut from one colour** (#5). Glows, washes, rims
  and the halo were `rgba(var(--mz-*-rgb), a)`, which forced a re-skinning host
  to state each colour twice per theme — once as the colour, once as a
  hand-converted `R, G, B` triplet — with nothing keeping the two in step. They
  are `color-mix(in srgb, var(--mz-primary) a%, transparent)` now (the same
  colour, in the same space), and each theme declares `--mz-primary`,
  `--mz-accent`, `--mz-success`, `--mz-danger`, `--mz-warning` and
  `--mz-info`. Set the colour in any syntax and everything follows; the
  `--mz-*-rgb` triplets still carry the defaults, so a theme written against
  them keeps working.
- **`MorzeCommonLabels` has four more keys** (#12): `increase` / `decrease`
  (`NumberInput`'s steppers) and `commandPalette` /
  `commandPaletteDescription` (`CommandDialog`'s accessible name), so the last
  English defaults are in the bundles too. A language typed against
  `MorzeLocale` fails to compile until it has them — which is the point of the
  type.
- **The label on a tone's fill follows how light the fill is** (#16). White on
  every tone measured 3.04:1 on the dark primary — every primary button and
  active nav item — and 1.67:1 on the amber. Dark-theme fills now carry
  `--mz-on-fill`, a brand-leaning near-black (5.8:1 and up); light keeps white
  on the violet and the red and takes the dark label on the emerald, amber and
  blue. The light danger is a step deeper (`212, 48, 79`), the one fill
  neither label cleared. A host that re-pointed a tone re-checks its `-fg`.
- **`SidebarTrigger` picks its icon by what a press does** (#22): a chevron to
  fold an open panel, a panel icon to open a collapsed one, a menu on a phone.
  It was always a left chevron, which on a phone — where it is the only way
  into the navigation — reads as "back". `icon` overrides it, and the trigger
  reports `aria-expanded` on the desktop.
- **DataTable — one page, no buttons** (#23). With nowhere to go, the pager
  keeps the count and drops "1 / 1" and the four disabled buttons that sat
  under a three-row table. `pagination="always"` keeps them;
  `DataTablePagination` takes the same choice as `nav="auto" | "always"`.
- **11px and 15px are off the scale** (#13). What was 11px — counters in a
  table chip and a sidebar badge, the calendar's weekday and week-number
  headings, a menu label, a key cap — is 12px; the large controls and the
  15px titles (popover, empty state, number field) are 16px. The card title
  takes a 24px line, the alert title 20px.
- **DataTable auto-fit shrinks before it scrolls** (#25). When the declared
  widths are wider than the box, the flexible columns now give way in
  proportion, each down to its `minWidth` or — without one — to what its header
  needs (measured: padding, caption, sort arrow, filter button), and the table
  scrolls only past that. A six-column table declared at 1060px used to scroll
  in a 970px box under three short rows. `autoFit="grow-only"` is the old
  behaviour; `useColumnLayout().fitTo(width, { shrink, headerMin })` takes the
  same choice.
- **Glass is opt-in on the table and the chart tooltip** (#41). Sticky and
  pinned `DataTable` header cells and the summary row ran a backdrop-filter
  each — a few dozen layers on a wide statement — and the chart tooltip, which
  follows the pointer, was frosted too; together they made Chromium on a GPU
  stop painting whole regions of the page until a reload. `--mz-th-bg` is now
  the solid `--mz-surface-2` (both tables), and the tooltip draws on
  `--mz-elevated`. `DataTable glass` and `ChartTooltipContent glass` put the
  frost back (`--mz-th-glass` is the header's frosted fill). Dialogs, menus,
  sheets and the sidebar keep their glass.

### Fixed

- **A vertical `ScrollArea` lets its content truncate** (#4). Radix wraps the
  content in an inline `display: table; min-width: 100%` box, which grows to
  its widest child — so a long title pushed the list wider instead of ending
  in "…", and erp reached past the kit with `[&>div]:block!`. A vertical area
  now sets that box back to `block`. `ScrollArea` takes `orientation`
  (`vertical` | `horizontal` | `both`); left out, it is `both` when a
  horizontal `ScrollBar` is among the children and `vertical` otherwise, so
  an existing two-way area keeps scrolling sideways.
- **`Select`, `Combobox`, `MultiSelect` and the date fields have an error
  state** (#11). `.mz-input[aria-invalid=true]` turned an input's rim danger,
  but the select trigger had no such rule, and `Combobox` / `MultiSelect` /
  `DatePicker` / `DateRangePicker` took a fixed list of props with no way to
  put the attribute on their trigger at all — a missing required choice looked
  exactly like a valid one, and erp drew a ring on a wrapper instead. The
  trigger now draws `aria-invalid="true"` the way an input does (danger rim,
  danger focus glow), and the four fields forward `aria-invalid` and
  `aria-describedby` to it, so `FormControl` reaches them too.
- **The kit mounts in jsdom** (#10). `TabsList`'s overflow and `DataTable`'s
  fit, edge shadows and window constructed a `ResizeObserver` unguarded, and
  `useIsMobile` / the `system` theme called `matchMedia` — so a jsdom test
  threw before its first assertion. Each call is guarded now; without the API
  the component simply stops re-measuring.
- **A wrapped `Label` no longer draws over itself** (#18). It had
  `line-height: 1`, a 13px box for 13px text, so a second line landed on the
  first; it is 18px now. Its weight is `--mz-label-weight` (500) rather than
  600, which competed with the headings above a form. `Field`'s gap is 6px,
  so the space a reader sees under the label is the 8px it was.
- **The sidebar's group label is 12px in the dim text** (#19), not 11px in the
  muted one: 11px is under the floor every reference system keeps, and the
  muted grey measured 3.64:1 on the light rail.
- **The muted text passes AA in both themes** (#14). Light was 4.33:1 on a card
  and 3.64:1 on the page under the sidebar; it is cut from `#6a6a6a` now
  (5.46 / 4.59:1). Dark passed on the page but fell to 4.19:1 on an elevated
  panel — a dialog, a menu — and moves from `#808080` to `#8a8a8a` (4.68:1).
- **`MorzeThemeProvider` no longer flashes dark** (#26). With `system` it
  resolved to `'dark'` first and wrote that to `<html>` in an effect after
  paint — over whatever a pre-paint script had set — before it asked
  `matchMedia`; a stored `light` was overwritten by the default the same way.
  The stored and system theme now settle in layout effects, and the value
  written to `<html>` is computed from storage and `matchMedia` directly, so
  it is right on the first write. Without `matchMedia`, `system` keeps what
  `<html>` already says.
- **A height on `CardContent` holds** (#34): `flex: 1` is a 0% basis, which in
  the card's column threw the height away, so a chart in a
  `ResponsiveContainer` collapsed; it is `1 1 auto` now.
- **A long caption in a narrow right-aligned header is cut at its end** (#38).
  The label now shrinks below its text, ends in an ellipsis and does not take
  the column's `text-align: end`, and the right-aligned header row is
  `safe flex-end` where supported, so it can never spill past the cell's
  start. A plain (unsortable) header carries its full caption in `title`.
  The report's «зращено» did not reproduce in headless Chrome; these close the
  routes by which it can happen.
- **DataTable — a changed column set keeps the host's order** (#39). When the
  `columns` ids changed (months instead of weeks), the layout kept the order of
  the ids it had seen and put the new ones last, so months landed after the
  forecast weeks. An order nobody touched now follows `columns`; a user's or a
  saved order is kept, and new columns join it after their neighbour in
  `columns` instead of at the end.

## [0.5.0] — 2026-09-13

The P2 half of the 2026-09 review (`docs/review-2026-09.md`), which closes it:
every finding in that document is now either shipped or recorded as a decision.
Every entry below has a longer write-up in `FIXES.md` under the finding's id.

### Added

- **`Combobox` and `MultiSelect`** (K-11) — a searchable list on the select
  trigger's own recipe, with `options` for a list you hold and `loadOptions`
  for one the backend filters. `Select` had no search in it, so every list
  longer than a screen was somebody's own widget; eis-frontend pushed an async
  multiselect through the table's `custom` filter. The async side debounces,
  gates on `minChars`, keeps the labels of values the current answer no longer
  contains, and ignores an older request that answers after a newer one. The
  multi-select collapses its chips into "+N", takes All / None over what the
  search has narrowed to, and drops the last chip on Backspace in an empty box.
- **DataTable — a keyboard** (G-01). A clickable row is now a tab stop and
  answers Enter; that half is always on. `keyboard` goes further and makes the
  body a grid: one roving tab stop over the cells, arrows to move it,
  `Home`/`End` and Ctrl with them, `PageUp`/`PageDown` by ten rows, Space to
  tick a row, Enter or `F2` to open an editable cell, and Escape to leave one —
  back into the cell it came from. It is opt-in because it sets `role="grid"`,
  which changes how a screen reader announces the whole table; controls inside
  cells stay tabbable either way.
- **DataTable — `aria-rowindex`** on every row, counted from the top of the
  result set. `aria-rowcount` on its own says "13 659 rows" over a page
  numbered 1–25, so a reader on page 3 was told they were at the top.
- **Locale bundles — `combobox` and `datePicker`**. Both fields draw strings of
  their own and had no entry in `ru` / `en`, which left a Russian host
  hand-carrying labels for the two newest components. `MorzeLocale` carries the
  two keys, so a host typing its own language against it is told about them.
- **DataTable — `virtualize`** (G-06). Only the rows in view are drawn, plus a
  margin, so a thousand-row list costs the browser and React what a screenful
  costs. It needs a scroller height, assumes the density's row height
  (`{ rowHeight, overscan }` overrides), and steps aside while a detail panel is
  open. Rows are not memoised: a column's `cell` is a fresh closure per render
  of the host, so a memoised row re-renders anyway.
- **DataTable — a searchable column list** (G-10). Past eight columns the
  Columns popover grows a search box, and show-all / hide-all act on what the
  search narrowed to. The grip is now the touch handle for reordering — touch
  never fires a `dragstart`, so the drag was mouse-only until now — and
  `useColumnLayout` gained `setHidden(ids)` for the bulk write a loop over
  `toggleHidden` cannot do under a controlled `layout`.
- **`Command` / `CommandDialog`** (K-11) — the ⌘K palette: its own shortcut,
  filtering over each item's `value` and `keywords`, groups that hide when
  empty, Enter running the highlighted item through its own click.
- **`ContextMenu`** (K-11) — the right-click menu, same parts and trim as
  `DropdownMenu`; `onRowContextMenu` finally has somewhere to go.
- **`Collapsible`, `NumberInput`, `Empty`, `Kbd` / `KbdSequence`** (K-11). The
  number field is a text input that knows it holds a number — `inputMode`,
  `role="spinbutton"`, arrows, steppers off the tab order, a `unit`, and a
  parser that takes a comma for a decimal point. `KbdSequence keys={['mod','k']}`
  prints ⌘K on Apple hardware and Ctrl+K elsewhere, after mount, so hydration
  stays quiet.

### Changed

- **A control can be off and still explain itself** (K-07). `aria-disabled` no
  longer carries `pointer-events: none`, so a tooltip over a button that is off
  finally opens; `Button` refuses the click, the submit and the bubbling
  itself. `disabled` is unchanged and keeps `pointer-events: none` — that is
  what lets a tooltip on a wrapper around the button work.
- **The table is written in inline start and end** (G-13). Pins, the pinned
  seam, the resize handle, the inline editor's message and `align: 'right'`
  now follow the writing direction, and the resize drag and its arrow keys
  reverse with it. `pinned: 'left'` keeps its name and means the start. The
  scroller's own attributes are renamed with it: `data-scrolled-left` /
  `data-scrolled-right` are now `data-scrolled-start` / `data-scrolled-end`.
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

### Fixed

- **Two column ids that differ only by punctuation shared one width** (G-12).
  `cssSafe` let `_` through *and* used it as the replacement for everything
  else, so `a.b` and `a_b` both became `a_b`: one custom property, one width,
  and dragging either column resized both. The escaping is injective now.
- **The first-load placeholder had no table under it** (G-14). It was one cell
  spanning the full width with a single bar in it, which announced a list and
  then jumped into a grid the moment the rows arrived. It draws a cell per
  column, pinned columns included.

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
