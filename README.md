# @morze/ui

Morze UI — a React component kit shaped like **shadcn/ui (latest)** on **Radix**
primitives, wearing the convex look from the Morze landing: a 135° gradient, a
hairline rim, an inset highlight on top and a tone glow underneath.

![Morze UI components](docs/screenshot.png)

```
background-color: rgb(tone);
background-image: linear-gradient(135deg, rgba(255,255,255,.07), rgba(0,0,0,.14));
border: 1px solid rgba(255,255,255,.18);
box-shadow: 0 3px 10px -4px rgba(tone,.4),
            inset 0 1px 0 rgba(255,255,255,.35),
            inset 0 -1px 0 rgba(0,0,0,.2);
```

That recipe is applied to **every active element**: buttons, toggles,
checkboxes, radios, switches, sliders, tabs, the select trigger, badges and the
active navigation item.

## Install

```bash
npm i @morze/ui
```

`react` and `react-dom` **19** are peer dependencies: like shadcn after its
React 19 rewrite, components take `ref` as a plain prop and use no `forwardRef`.
Tailwind is **not required** — the package ships compiled CSS.

```tsx
// once, at the app root
import '@morze/ui/styles.css'

import { Button, Switch, MorzeThemeProvider } from '@morze/ui'

export default function App() {
  return (
    <MorzeThemeProvider defaultTheme="dark">
      <Button dot>Submit request</Button>
      <Switch defaultChecked />
    </MorzeThemeProvider>
  )
}
```

Tokens only, without components: `import '@morze/ui/tokens.css'`.

**In a Tailwind v4 host, import the kit into a layer.** The kit ships plain,
unlayered CSS, and unlayered CSS beats layered CSS regardless of source order —
imported naively, `.mz-btn--primary` outranks every utility passed through
`className`:

```css
/* Layer order first — @layer statements may precede @import. */
@layer theme, base, components, morze-ui, utilities;

@import 'tailwindcss';
@import '@morze/ui/styles.css' layer(morze-ui);
```

The kit then wins over the host's preflight, and a `className` on a component
still wins over the kit. Note that `cn` is plain `clsx`, not `tailwind-merge`:
conflicting classes are not de-duplicated, they are resolved by that cascade.

## Themes

Dark is the default, light is opt-in through an attribute (or the
`.mz-theme-light` / `.mz-theme-dark` classes if attributes are inconvenient):

```html
<html data-mz-theme="light">
```

`MorzeThemeProvider` does that for you, remembers the choice in `localStorage`
and understands `system`:

```tsx
const { resolvedTheme, setTheme } = useMorzeTheme()
setTheme('light') // 'dark' | 'light' | 'system'
```

The first render is always `defaultTheme`; the stored preference is applied in
an effect after mount, so server and client markup agree and hydration does not
break. Storage access is wrapped in try/catch — with site data blocked the
theme simply does not persist.

The provider renders a wrapper with the `mz-root` class (background and text
colour from the tokens). By default `data-mz-theme` is written to `<html>`, so
portalled dialogs and menus follow the theme too. `target="element"` scopes the
theme to the wrapper instead.

## Tones

Every active component accepts `tone`, which re-points the gradient, the glow
and the focus ring:

```tsx
<Button tone="accent">Save</Button>
<Switch tone="success" defaultChecked />
<Badge tone="danger" dot>Live</Badge>
<Progress value={40} tone="warning" />
```

`primary` (violet) · `accent`/`success` (emerald) · `danger` · `warning` ·
`info`. A tone is the `--mz-tone-rgb` custom property, so a one-off value works
too: `style={{ '--mz-tone-rgb': '255, 100, 130' }}` (channels separated by
commas — the value is substituted into `rgb()`/`rgba()`).

## Shape and type

The default shape is **rectangular**: one small radius for controls, a slightly
larger one for surfaces.

| Token | Value | Used by |
| --- | --- | --- |
| `--mz-radius-sm` | `6px` | items inside containers: menu items, tabs, checkbox |
| `--mz-radius` | `8px` | buttons, inputs, select, toggles, badges, alerts |
| `--mz-radius-lg` | `12px` | cards, dialogs, popovers, menus |
| `--mz-radius-pill` | `999px` | only what is round by meaning: radio, indicator dots |

Fully square corners: `--mz-radius: 0; --mz-radius-sm: 0; --mz-radius-lg: 0`.

Fonts are **system stacks** — nothing is downloaded and the kit inherits the
host application's look. Control labels are plain sentence case.

```css
:root {
  --mz-primary-rgb: 120, 90, 250;   /* brand colour */
  --mz-font-sans: 'Inter', sans-serif;
  --mz-radius: 4px;                 /* tighter */
}
```

To bring back the landing's own look (pills plus mono caps):

```css
:root {
  --mz-radius-control: var(--mz-radius-pill);
  --mz-label-font: 'JetBrains Mono', ui-monospace, monospace;
  --mz-label-transform: uppercase;
  --mz-label-tracking: 0.08em;
}
```

## States

Hover **darkens the colour** and grows the element slightly **in place** —
nothing shifts position, and there is no shine sweep. Press darkens further and
shrinks a little.

```css
:root {
  --mz-hover-scale: 1.02;   /* growth on hover */
  --mz-press-scale: 0.98;   /* dip on press */
  --mz-hover-mix: 88%;      /* fill colour: 88% tone + 12% black */
  --mz-press-mix: 80%;
}
```

The tone fill is stored as a flat colour (`--mz-fill`) under a fixed sheen
gradient (`--mz-fill-sheen`), so `background-color` animates smoothly —
browsers do not interpolate gradients. Darkening goes through `color-mix()`;
where that is unsupported the element simply does not darken and everything
else still works.

Only **filled** surfaces darken: `primary`, `destructive`, a pressed toggle, the
active tab, a checked checkbox, radio or switch. Neutral variants (`secondary`,
`outline`, `ghost`) and unselected controls lighten instead — darkening would
sink them into the page.

## Customisation

Everything is driven by custom properties; override them after importing the
styles. The main groups: surfaces (`--mz-bg`, `--mz-surface`, `--mz-elevated`),
borders, text, tones, the convex recipe (`--mz-convex-*`, `--mz-face*`,
`--mz-well*`), geometry (`--mz-radius*`), type (`--mz-font-*`, `--mz-label-*`),
motion and states (`--mz-ease`, `--mz-duration`, `--mz-hover-scale`,
`--mz-press-scale`, `--mz-hover-mix`, `--mz-press-mix`), focus (`--mz-ring-*`).

The full list lives in `dist/morze-ui-tokens.css`.

## Components

| Input and actions | Navigation and output | Overlays |
| --- | --- | --- |
| `Button` `Toggle` `ToggleGroup` | `Tabs` `Accordion` | `Dialog` |
| `Checkbox` `RadioGroup` `Switch` | `Card` `Alert` `Badge` | `DropdownMenu` |
| `Slider` `Input` `Textarea` | `Progress` `Avatar` | `Popover` |
| `Label` `Field` `Select` | `Separator` `Skeleton` `Spinner` | `Tooltip` |
| `DataTable` | `Sidebar` | `Sheet` |

The API mirrors shadcn/ui: same names, same sub-component composition,
`asChild`, a `data-slot` on every part — so examples from the shadcn docs work
with barely any edits.

What this kit adds on top:

- `Button` — `variant`: `primary` (default) `secondary` `outline` `ghost`
  `destructive` `link`; `size`: `xs` (28px) `sm` (34) `md` (40, default)
  `lg` (48) plus square `icon-xs` `icon-sm` `icon` `icon-lg`; `loading`,
  `dot` (a pulsing morse dot), `tone`. The `sm/md/lg` heights (34/40/48px) are
  shared by buttons, inputs and toggles, so controls line up in a row. With
  `asChild` the loading indicator is grafted inside the child element and the
  blocked state is expressed through `aria-disabled`, since a link has no
  `disabled`.
- `ToggleGroup` — `appearance`: `segmented` (a sunken well with the active item
  raised), `joined` (one continuous bar), `spaced`.
- `TabsList` — `variant`: `default` (well) or `line` (underline).
- `Checkbox` / `Switch` / `Avatar` — `size`: `sm` `md` `lg`.
- `Input` — the size prop is `inputSize` (`sm` `md` `lg`); the name differs from
  shadcn to avoid clashing with the native `size` attribute on `<input>`.
- `SelectTrigger` — `size`: `sm` `md` (no `lg`).
- `Card` — `interactive` adds the hover state; combined with `onClick` the card
  also gets `role="button"`, `tabIndex` and Enter/Space activation.
- `Spinner` — `label` (default `Loading`) is announced by screen readers;
  `label={null}` makes it purely decorative.
- `Badge` — `variant`: `solid` `soft` `outline`, plus `dot`.
- `Field` / `FieldHint` / `FieldError` — form scaffolding.

```tsx
<ToggleGroup type="single" defaultValue="week" appearance="segmented">
  <ToggleGroupItem value="day">Day</ToggleGroupItem>
  <ToggleGroupItem value="week">Week</ToggleGroupItem>
</ToggleGroup>
```

## Sidebar

A navigation column: it collapses into an icon rail, turns into a sliding sheet
on narrow screens and remembers its state between sessions.

```tsx
<SidebarProvider>
  <Sidebar collapsible="icon">
    <SidebarHeader>
      <Logo className="mz-sidebar-hide-collapsed" />
      <b className="mz-sidebar-hide-collapsed">Morze ERP</b>
      <SidebarTrigger className="mz-sidebar-push" />
    </SidebarHeader>
    <SidebarContent>
      <SidebarGroup>
        <SidebarGroupLabel>Work</SidebarGroupLabel>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton isActive tooltip="Orders">
              <OrdersIcon />
              <span>Orders</span>
            </SidebarMenuButton>
            <SidebarMenuBadge>12</SidebarMenuBadge>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarGroup>
    </SidebarContent>
    <SidebarFooter>…</SidebarFooter>
  </Sidebar>

  <SidebarInset>
    {/* the top bar stays on the page background, next to the navigation */}
    <header>…</header>
    <SidebarPanel>{children}</SidebarPanel>
  </SidebarInset>
</SidebarProvider>
```

- **Collapsing** — `collapsible`: `icon` (an icon rail, the default),
  `offcanvas` (slides away entirely), `none`. Toggled by `SidebarTrigger` or
  **⌘/Ctrl + B**. There is also an optional `SidebarRail` — an invisible strip
  along the panel edge that toggles it on click; it is not rendered by default,
  add it if you want that gesture.
- **The rail** hides labels; items with a `tooltip` prop show theirs on the
  right instead. Anything that only makes sense at full width (a wordmark, a
  user name) is marked with `mz-sidebar-hide-collapsed`, otherwise the rail
  clips it. That class is declared with `!important` — it has to beat an inline
  `display` on a logo or an avatar. To push an element to the far end of the
  header use `mz-sidebar-push` rather than an inline `margin-left: auto`: in the
  rail it switches off, otherwise the button drifts off the axis the menu items
  below sit on.
- **Mobile** — below `mobileBreakpoint` (768px) the panel renders as a `Sheet`
  over the content; a rail would eat what little width is left.
- **State** lives in `localStorage` (`storageKey`, `null` disables it). The first
  render is always `defaultOpen` and the stored value lands in an effect, so SSR
  and hydration agree. It can also be driven from outside via `open` /
  `onOpenChange`.
- **Variants** — `variant`:
  - `inset` (default) — the navigation sits directly on the page background and
    the raised surface is the content inside `SidebarPanel`: only the corner
    facing the navigation is rounded, the other three sides are flush with the
    window, and the shadow is cast back towards the sidebar. Put the top bar and
    breadcrumbs in `SidebarInset` **above** the panel, not inside it.
  - `sidebar` — the navigation gets its own surface and border.
  - `floating` — the navigation lifts off the edge as a separate card.

  The side is `side="left" | "right"` (the panel's rounded corner mirrors
  itself). The panel's radius and padding are `--mz-sidebar-panel-radius` and
  `--mz-sidebar-panel-pad`. The `mz-sidebar-layout--grid` class on
  `SidebarProvider` adds a 48px grid to the background.

`SidebarTrigger` lives in the panel's own header: with `collapsible="icon"`
(the default) the sidebar never disappears completely — the rail stays, and so
does the button.

The exception is **mobile and `offcanvas`**, where the panel leaves together
with everything inside it, so a second trigger is needed outside. To avoid two
buttons on desktop, render it conditionally:

```tsx
function MobileTrigger() {
  const { isMobile } = useSidebar()
  return isMobile ? <SidebarTrigger /> : null
}
```

The default height is `100dvh`. When the sidebar lives inside a panel rather
than owning the page, set `--mz-sidebar-h: 100%` on `SidebarProvider`.

**`Sheet`** is exported separately — a dialog anchored to an edge of the screen
(`side`: `top | right | bottom | left`), and what the mobile sidebar uses.

## DataTable

A table for server-driven data: it never sorts or filters anything itself, it
collects state and hands it over as a single object. One user action, one
request.

```tsx
const { query, setQuery } = useTableQuery({
  initial: { sort: [{ id: 'date', dir: 'desc' }], pageSize: 25 },
  urlKey: 'orders.',            // filters and sorting in the query string
})
const { rows, total, loading, error } = useOrders(query)

const columns: DataTableColumn<Order>[] = [
  { id: 'number', header: '#', width: 120, sortable: true, pinned: 'left',
    cell: (row) => <b>{row.number}</b> },
  { id: 'client', header: 'Client', sortable: true,
    filter: { type: 'select', options: clients } },
  { id: 'sum', header: 'Total', align: 'right', sortable: true,
    accessor: (row) => formatMoney(row.sum),
    filter: { type: 'number-range', step: 10_000 } },
]

<DataTable
  columns={columns} data={rows} total={total} rowKey={(row) => row.id}
  loading={loading} error={error}
  query={query} onQueryChange={setQuery}
  persistKey="orders"                       // column widths, order, visibility
  selection={selection} onSelectionChange={setSelection}
  bulkActions={() => <Button size="sm">Export</Button>}
  renderExpanded={(row) => <OrderDetails id={row.id} />}
/>
```

What it does:

- **Sorting** — a header click cycles `asc → desc → off`, Shift adds the column
  to a composite sort (an ordered list reaches the backend).
- **Header filters** — `text`, `select`, `number-range`, `date-range`,
  `boolean`. A value is staged in the popover and committed on Apply: otherwise
  every keystroke would be a request. Active filters are echoed as chips above
  the table. `type: 'custom'` renders a widget of your own in the same popover —
  an async multiselect, a range slider — and it takes part in `query.filters`
  like the built-in ones:

  ```tsx
  filter: {
    type: 'custom',
    render: ({ value, commit }) => (
      <ClientPicker selected={value as string[]} onPick={(ids, names) => commit(ids, names)} />
    ),
    describe: (value) => `${(value as string[]).length} selected`,
  }
  ```

  The value reaches the backend untouched; `commit(value, label)` applies and
  closes, `onChange` only stages. `actions: false` drops the Apply/Reset footer
  for a widget that commits itself.
- **Default widths** — columns stretch to fill the container, so there is no
  dead space at the right edge. The maths runs off the declared `width` values
  (they act as proportions), re-runs when the container resizes and always
  produces the same result for the same width — resizing the window back and
  forth does not drift the layout. When even the declared widths do not fit,
  they are used as-is and horizontal scrolling kicks in. Turn it off with
  `autoFit={false}`, or per column with `flex: false` (handy for narrow icon or
  action columns). `minWidth` and `maxWidth` are honoured and the surplus is
  redistributed across the rest.
- **Mouse resize — spreadsheet style**: the column follows the cursor one to
  one, its neighbours do not move, spare space stays at the right, and the
  scrollbar appears when there is none left. Double-clicking the handle fits the
  column to its content; arrows on the focused handle resize from the keyboard.
  During a drag the width is written to a CSS custom property rather than to
  state — not a single row re-render per pixel of travel. A column touched by
  hand is excluded from auto-fit for good.
- **Pinned columns** left and right, a sticky header, and a hairline on the seam
  between the pinned and scrolling parts.
- **Row selection** — Shift selects a range, the header checkbox takes the page,
  and the floating bar can escalate to "all N matching" (in that mode a bulk
  action must travel with the query, not with a list of ids).
- **Columns** — visibility, order (drag and drop plus arrows for the keyboard)
  and pinning; all of it saved to `localStorage` under `persistKey`.
- **Expandable rows** and **inline cell editing** on double click, with
  optimistic saving and a rollback on failure.
- **States** — skeletons on the first load, a thin progress line when refetching
  over data already on screen, an empty result and an error with a retry.
- **Density** `compact | normal | relaxed`.
- **Row styling** — `rowClassName` tints a row by record state (a soft-deleted
  row painted red); `rowProps` adds `data-*`, `title` or a handler of your own.
  The table's own attributes win, so neither can break selection or expansion.
- **Load more instead of paging** — pass `onLoadMore` and the pager is replaced
  by a footer inside the table's own scroller, so an endless scroll works from
  the inside (a host cannot bolt a sentinel onto a scroller it does not own).
  `hasMore` defaults to `data.length < total`, `autoLoadMore={false}` waits for
  a click, and `pagination` brings the pager back if you want both. The table
  asks once per batch of rows: a host that answers with nothing new is not
  asked again.
- **The pager adapts** — `pageSizeOptions={false}`, or a single option, hides
  the rows-per-page select for a backend that fixes the page size.

Helpers for your own UI: `useTableQuery`, `useSavedViews`, `useColumnLayout`,
`useRowSelection`, plus the pure functions `toggleSort`, `setFilter`,
`serializeSort` / `parseSort`.

Cells already truncate: `.mz-dt__cell` is `overflow: hidden; text-overflow:
ellipsis; white-space: nowrap`. Carrying a `className="block truncate"` from a
shadcn table onto cell content is redundant — and a block-level child that
reflows during a render is exactly what used to feed the scroll observer into a
render loop (see `FIXES.md`).

A table stays a table: on narrow screens it scrolls horizontally with the first
column pinned, it does not reflow into cards.

## Localisation

Component strings default to English and every one of them can be replaced.
`Dialog`/`Sheet` take `closeLabel`, `Spinner` takes `label`, `Sidebar` takes
`mobileTitle` / `mobileDescription` and `SidebarTrigger` takes `label`.

`DataTable` has more strings than the rest, so it takes a partial `labels`
object — anything omitted falls back to the English default:

```tsx
import { DataTable, type DataTableLabels } from '@morze/ui'

const de: Partial<DataTableLabels> = {
  columns: 'Spalten',
  apply: 'Anwenden',
  reset: 'Zuruecksetzen',
  empty: 'Nichts gefunden',
  rowsPerPage: 'Zeilen pro Seite',
  selectedCount: (count) => `Ausgewaehlt: ${count}`,
  sortBy: (column) => `Nach "${column}" sortieren`,
}

<DataTable labels={de} locale="de-DE" … />
```

`locale` controls number formatting; without it the browser's locale is used.
The complete set of keys is `DataTableLabels`, with defaults in
`defaultDataTableLabels`.

Ready-made bundles ship behind their own entry points, so a non-English host
does not hand-carry ~50 strings — and does not silently drift as the kit adds
them:

```tsx
import { dataTable as ru, common } from '@morze/ui/locales/ru'

<DataTable labels={ru} locale="ru-RU" … />
<Dialog><DialogContent closeLabel={common.close}>…</DialogContent></Dialog>
```

`common` carries the strings the rest of the kit takes as individual props
(`close`, `loading`, `sidebarNavigation`, `sidebarSections`, `toggleSidebar`).
A bundle is plain data — no React, no styles — so it is safe to import from a
server component. `@morze/ui/locales/en` is the same shape for English, and
`MorzeLocale` types a language of your own.

## Accessibility and behaviour

- Behaviour, focus management, keyboard and ARIA come from Radix.
- Focus is drawn with an `outline` rather than a shadow, so it never fights the
  convex layers; width and offset are `--mz-ring-width` / `--mz-ring-offset`.
- `@media (prefers-reduced-motion: reduce)` disables animation and the growth.
- Classes are prefixed with `mz-` and variables with `--mz-`, so the kit does
  not collide with application styles (Tailwind included). The base layer has no
  descendant selectors: your own markup inside a `Card` or `Dialog` keeps its
  box model and typography.

## Next.js

The bundle is marked `"use client"` — import components into client parts and
add the CSS in `app/layout.tsx`.

## Development

```bash
npm install
npm run dev        # playground with every component (http://localhost:5250)
npm run typecheck
npm run test       # vitest: component behaviour plus CSS contracts
npm run build      # dist: ESM + CJS + .d.ts + morze-ui.css
```

`tests/smoke.test.tsx` covers component behaviour and accessibility,
`tests/css-contract.test.ts` covers the visual layer's contracts (cascade order
for tones, hover states, isolation from foreign markup, geometry). The second
file exists because regressions here are cascade regressions: a rule that lands
later in the bundle and quietly outranks an earlier one.

Layout: `src/components/*.tsx` for components (markup and API),
`src/styles/**` for the visual layer (`tokens.css` → `base.css` →
`components/*` → `tones.css`). JS is built with tsup, CSS with lightningcss
(`scripts/build-css.mjs`).

## Publishing

```bash
npm publish --access public
```

The `@morze` scope has to exist in the npm organisation (or point
`publishConfig` at a private registry).
