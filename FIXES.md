# Fixes and integration notes

A running log of defects found and gaps identified while putting the kit to work
in real applications. Every entry records what broke, why it broke, and what was
done about it — so the next person hitting the same symptom does not have to
bisect it a second time.

Sources so far:

- **eis-frontend** (`morze-crm-frontend`), migrated off local shadcn components
  onto `@morze/ui@0.1.0` in August 2026: 274 import sites across 95 files, 20
  vendored shadcn components deleted, plus the app shell moved onto `Sidebar`
  and the v2 search table onto `DataTable`.

---

## Fixed

### DataTable — the scroll observer and React re-render each other until the tab locks

- **Found in** 0.1.0, integrating `DataTable` into eis-frontend.
- **Status** fixed in `src/components/data-table/data-table.tsx`. **Released in
  0.2.0** — 0.1.0 on npm still carries the bug.

**Symptom.** The tab freezes hard the moment the table paints. Not slow — locked:
the renderer stops answering, DevTools cannot attach, screenshots time out, and
nothing reaches the console (the main thread never yields, so no error is ever
printed). Hot reload does not recover it either, because a frozen renderer cannot
apply an HMR update — which makes this deceptively hard to bisect, since a fixed
build looks just as broken until the tab is closed and reopened.

**Cause.** The edge-shadow effect wrote a fresh object on every observer tick:

```ts
const update = () => {
  const max = scroller.scrollWidth - scroller.clientWidth
  setScrolled({ left: scroller.scrollLeft > 1, right: scroller.scrollLeft < max - 1 })
}
const observer = new ResizeObserver(update)
```

`Object.is` never matches a new object, so **every** `ResizeObserver` callback was
a real state change and forced a re-render. That is harmless as long as the
re-render leaves the scroller's box alone. It is not harmless when any cell's
content reflows during that render: the reflow resizes the scroller, the observer
fires again, React re-renders again, and the two drive each other with no exit.

**Trigger in practice.** A block-level child inside a cell — here a link rendered
as `<a className="block truncate">` in a table of 13 659 organizations. Inline
content in the same cell was fine. This is why the bug looks data-dependent and
column-dependent, and why it did not show up in the playground.

**Fix.** Bail out when the value has not actually changed:

```ts
const update = () => {
  const max = scroller.scrollWidth - scroller.clientWidth
  const left = scroller.scrollLeft > 1
  const right = scroller.scrollLeft < max - 1
  // A fresh object here would be a new state on every observer tick, and any
  // cell whose content reflows during that render feeds the observer again —
  // the two then re-render each other until the tab locks up.
  setScrolled((current) =>
    current.left === left && current.right === right ? current : { left, right }
  )
}
```

**How it was confirmed.** The published `dist/index.js` in the host's
`node_modules` was patched by hand with the guard above; the page went from a
locked tab to a fully working table (13 659 rows, sorting, pager, column
manager). The patch was then reverted and the fix applied at source. `tsc
--noEmit` clean, all 68 package tests pass.

**Rule this generalises to.** Any `setState` driven by a `ResizeObserver`,
`IntersectionObserver`, or `scroll` handler in this package must be
identity-stable — return the previous state when nothing changed. The sibling
auto-fit effect already does this the other way, via a `lastFitWidth` ref guard;
that one was not affected.

**Regression test.** Not covered yet. happy-dom has no layout engine, so
`ResizeObserver` and `scrollWidth` cannot reproduce the loop; a real regression
test needs a browser runner. Until then the guard is the whole defence — do not
"simplify" it back into a plain `setScrolled({...})`.

---

### DataTable — auto-fit never redistributed after a column was hidden or moved

- **Found in** 0.2.0, reviewing the kit after the eis-frontend integration.
- **Status** fixed in `src/components/data-table/data-table.tsx`. **Released in 0.2.1.**

**Symptom.** Hiding a column left every remaining column at its old width and
handed the freed space to the trailing filler cell, so the table grew a dead
strip at the right edge that got wider with each column hidden. Measured in the
playground: hiding one of ten columns took the filler from 2px to 206px while
`Client` stayed at 272px. Showing the column again did not undo it.

**Cause.** The auto-fit effect already listed `layout.hidden` and `layout.order`
in its dependencies, so it did re-subscribe and call `run()` — but `run()` starts
with

```ts
if (Math.abs(available - lastFitWidth.current) < 1) return
```

and hiding a column does not change the container. The guard meant for the
observer swallowed the one case the dependencies existed to catch.

**Second defect in the same guard.** A single "last width" cannot break a
two-step cycle. If fitting to A makes a scrollbar appear the next measurement is
B, and fitting to B makes it disappear again: both steps differ from the one
immediately before, so the guard passes the whole cycle through every time — the
opposite of what its comment claimed.

**Fix.** The guard now keeps the widths it recently fitted to, with timestamps,
instead of only the last one — a width already fitted inside `FIT_CYCLE_MS` is
refused, which breaks a 2-cycle while still allowing a genuine resize back to an
earlier width once the entry expires. The history is cleared when the effect
re-subscribes, so hide/show/reorder re-fits. The dependencies now compare
`hidden` and `order` **by value** (`join('\0')`), because `merge` hands back
fresh arrays on every layout change and re-subscribing on a width change would
clear the very history that width change has to be caught by.

**How it was confirmed.** In the playground, hiding `Manager` now takes the
remaining columns from `[163, 272, 204, 191, 204, 177, 436]` to
`[186, 311, 218, 233, 202, 497]` with the filler still at 2px and no horizontal
overflow; showing it again restores the original widths exactly. Six sort clicks
plus a page change leave the widths stable — no drift, no runaway fitting.

**Regression test.** The redistribute-on-hide half needs a browser runner, like
the freeze above: happy-dom has no layout engine, so `clientWidth` is always 0
and the effect never fits.

---

### DataTable — the layout was persisted from inside a state updater

- **Found in** 0.2.0, reviewing the kit after the eis-frontend integration.
- **Status** fixed in `src/components/data-table/use-column-layout.ts`.
  **Released in 0.2.1.**

**Symptom.** One resize, hide, pin or reorder wrote `localStorage` twice and
called the host's `onLayoutChange` twice. Under `StrictMode` — which every
Vite/Next dev setup turns on — this was every single time.

**Cause.** `update()` did its work inside the updater passed to `setInternal`:

```ts
setInternal((current) => {
  const next = patch(base)
  writeStored(persistKey, next)   // side effect
  onLayoutChange?.(next)          // side effect
  return next
})
```

React may invoke a state updater more than once for one commit, and under
StrictMode it deliberately always does. An updater has to be pure. Worse, the
host callback ran during React's render phase, so a host that sets state from
`onLayoutChange` was updating another component mid-render.

**Fix.** The next layout is derived outside the updater, from a ref that mirrors
the committed one and is assigned eagerly so two calls in the same tick still
build on each other. `setInternal` is then called with a plain value and the two
side effects run after it — which is what `useSavedViews.persist` in the same
file already did.

`onLayoutChange` also moved into a ref, so `update` — and the `fitTo` the table
hands to a `ResizeObserver` as an effect dependency — keep a stable identity even
when the host passes a fresh arrow on every render.

**Regression test.** `tests/data-table.test.tsx` renders the hook inside
`StrictMode` and asserts one `onLayoutChange` call and one `setItem` per change;
both fail against the old implementation. A third test covers two updates in the
same tick, and a fourth pins down that auto-fit still neither persists nor
reports.

---

### DataTable — the column filter was the one child left untranslated

- **Found in** 0.2.1, wiring eis-frontend's tables onto the kit's column filters.
- **Status** fixed in `src/components/data-table/data-table.tsx`. **Released in 0.2.2**
  — verified in eis-frontend: the header filter now reads `Фильтр: ИНН`, with
  `Да`/`Нет` and `Сбросить`/`Применить` behind it.

**Symptom.** A host that passes `labels` got a translated table everywhere except
the header filter: the trigger read `Filter: Краткое название`, and the popover
behind it kept `Contains…`, `Apply`, `Reset`, `from`/`to` and `Yes`/`No` in
English. Sorting, the pager and the column manager were all correctly
translated, which made it read like a gap in the locale bundle rather than a
wiring bug — the `ru` bundle has `filterFor` and always did.

**Cause.** `DataTable` rendered the filter without handing the labels down:

```tsx
<ColumnFilter columnLabel={label} def={column.filter} value={…} onApply={…} />
```

`ColumnFilter` then called `resolveLabels(undefined)` and got the English
defaults. Its siblings did not have the problem — `ColumnManager` and
`DataTablePagination` are both given `labels={labelsProp}` a few lines away — so
this was an oversight, not a decision.

**Fix.** Pass `labels={labelsProp}`, like every other child.

**Regression test.** `tests/data-table.test.tsx` renders a table with Russian
labels, opens the header filter and asserts the placeholder and both footer
buttons came through translated; it fails against the old code.

---

### DataTable — a `custom` filter could grow the popover off the screen

- **Found in** 0.2.3, integrating an async multiselect as a column filter.
- **Status** fixed in `column-filter.tsx` and `data-table.css`. **Not released.**

**Symptom.** A host widget with a long list pushed the filter popover past the
bottom of the window, and the Apply/Reset row went with it — the panel was
408px of visible box over 1099px of content, with nothing clipping or scrolling.

**Cause.** `.mz-dt__filter-panel` set only `width` and `padding`. The built-in
filters are short, and the one list among them — `.mz-dt__filter-options` —
caps itself at `13rem`, so nothing in the kit ever tested an unbounded body.
`custom` exists precisely to render content the kit knows nothing about, and it
had no guard at all.

**Fix.** The panel is now a flex column bounded by
`var(--radix-popper-available-height, 60vh)` — the space Radix actually measured
for it — and `FilterBody` is wrapped in `.mz-dt__filter-body`, which takes the
overflow. The column name and the actions stay put while the body scrolls, so a
tall widget can never bury the buttons. `min-height: 0` on the body is what lets
it shrink below its content instead of pushing the panel open.

**Not the same bug as the host's.** The overflow that surfaced this was in
eis-frontend: its widget used a Radix `ScrollArea` under a `max-h-64` parent, and
that component scrolls on an inner viewport sized `height: 100%`, which has
nothing to resolve against when the parent sets only `max-height` — the viewport
grew to full content height. A native `overflow-y: auto` container needs no
definite height and fixed it. The kit change is the guard that would have kept a
host mistake inside the popover.

---

### DataTable — load-more went quiet after a query change

- **Found in** 0.3.7, reviewing the kit (2026-09 review, D-01).
- **Status** fixed in `src/components/data-table/data-table.tsx`. **Not released.**

**Symptom.** In load-more mode, change a filter whose first page is as long as
the rows already on screen — and a first page nearly always is a full one — and
neither the footer scrolling into view nor the button ever asks for more again.

**Cause.** The batch guard remembered the row count of the last request
(`askedAt`) and never let go of it: with the new result set at the same length,
`askedAt === data.length` held and every request was treated as a duplicate.

**Fix.** The guard is reset when the query changes (sort, filters and page size,
compared by value) and when the row count drops below the count it was armed
at. The IntersectionObserver is re-subscribed on a query change too, so a footer
the new result set left in view is reported again.

**Regression test.** `tests/data-table.test.tsx`, "load more across query
changes": fails on the old code with one call instead of two, and still asserts
that re-renders under one query ask only once.

---

### DataTable — auto-fit did nothing under a controlled `layout`

- **Found in** 0.3.7, reviewing the kit (D-02).
- **Status** fixed in `src/components/data-table/use-column-layout.ts`. **Not released.**

**Symptom.** A host that passes `layout` (and echoes `onLayoutChange`) got the
declared column widths and a dead strip at the right edge; nothing it did
brought the fit back.

**Cause.** `fitTo` wrote its result into the hook's internal state with
`persist: false`, and the controlled branch computes the layout from the prop
alone — it never reads the internal state, and the host was deliberately not
told. On the uncontrolled branch the same design had a quieter defect: the
fitted widths sat in the internal layout, so the next user action wrote them
into `localStorage` and a saved layout depended on the last window it happened
to be fitted in.

**Fix.** Fitted widths live in their own overlay, laid over whichever layout is
in force for the columns the fit still governs (not `sized`, not `flex: false`).
They are never stored and never reported, which is what the original comment
promised. `fitTo` now has a stable identity — it reads the layout and the column
map through refs — so the table's ResizeObserver effect no longer re-subscribes
on every render and the fit-cycle history it keeps survives. `reset()` bumps a
`fitEpoch` the table watches, because after a reset every column is flexible
again and nothing about the container would otherwise trigger a fit.

**Regression test.** `tests/data-table.test.tsx`, "auto-fit with a controlled
layout" (fails on the old code) and "auto-fit inside the table", which supplies
a scroller width to happy-dom and walks mount → keyboard resize → reset.

---

### DataTable — its buttons submitted a surrounding form

- **Found in** 0.3.7, reviewing the kit (D-03).
- **Status** fixed across `src/components/data-table/*.tsx`. **Not released.**

**Symptom.** A table inside a `<form>` — a filter form around a list is common —
submitted that form from the pager arrows, Apply and Reset in a header filter,
the column manager, the bulk bar, load-more and retry.

**Cause.** Fourteen internal `<Button>`s had no `type`, and a button's default
type is `submit`. `Button` itself does not set one, matching shadcn.

**Fix.** `type="button"` on every internal use. Whether `Button` should default
to `type="button"` when it is not slotted is a 1.0 question, recorded in the
review.

**Regression test.** `tests/data-table.test.tsx`, "inside a form".

---

### DataTable — `useTableQuery` clobbered the router's history state

- **Found in** 0.3.7, reviewing the kit (D-04).
- **Status** fixed in `src/components/data-table/use-table-query.ts`. **Not released.**

**Symptom.** With a `urlKey`, the back button misbehaved under Next.js App
Router and React Router, and the address bar changed on mount before the reader
had touched anything (`?orders.size=10` in the playground).

**Cause.** Every write went through `history.replaceState(null, …)`, which
throws away the state object those routers keep there (Next.js its tree, React
Router its index). And `encode` always wrote `size`, so the first write-back
after mount already differed from the URL.

**Fix.** The state object is passed through untouched. Only what differs from
the initial query is written, so an untouched table leaves the URL alone and a
shared link carries choices rather than defaults; a sort the reader cleared is
written as an empty value, since an absent key stands for the default. Page and
size from a hand-edited URL are clamped. The write-back skips the commit in
which the URL is first read, so it cannot strip the parameters it is about to
decode. `initial` is compared by value, so an inline object no longer rebuilds
`reset` and the popstate subscription on every render.

**Regression test.** `tests/table-query.test.tsx`, seven cases.

---

### Smaller ones from the same review

- **Date-range filter ids** (D-06): `mz-dt-from` / `mz-dt-to` were fixed strings,
  so two date filters on a page shared them. Now `React.useId()`.
- **`aria-sort` on every header** (D-09): a non-sortable column claimed
  `aria-sort="none"`, which to assistive tech means "sortable, not sorted yet".
  The attribute is now only on sortable columns.
- **Labels on tone fills** (V-01): every filled control painted its label
  `#fff`, and in the dark theme that is 1.7:1 on `warning`, 1.9:1 on `accent`
  and 2.1:1 on `info`. Each tone now names its label colour (`--mz-primary-fg`
  … `--mz-info-fg`, read through `--mz-tone-fg`): white on primary and danger,
  the night's ink on the other four. `danger` keeps white at 2.8:1 dark /
  4.2:1 light and dark `primary` sits at 3.0:1 — those are palette decisions,
  left to the review's P1.
- **Two focus rings on `SelectTrigger`** (V-02): it carried `mz-focusable`
  (the outline) on top of its own field glow. The class is gone; the trigger
  focuses the way `Input` does.

---

## Closed gaps

Not bugs — things the kit did not do, found where a host needed them, and since
built. All of it shipped in **0.2.0**; 0.1.0 on npm carries none of it.

### DataTable — row-level styling hook

`DataTableProps` exposed `onRowClick` and nothing else about a row, so a host
that tints rows by record state (a soft-deleted row painted red) could not
express it at all.

Shipped as two props in `data-table.tsx`:

```tsx
rowClassName={(row) => (row.deletedAt ? 'row--deleted' : undefined)}
rowProps={(row) => ({ 'data-status': row.status, title: row.name })}
```

The table's own attributes are applied after the host's, so neither hook can
break selection, expansion or the pinned-column seam; `className` is merged and
a host `onClick` runs before `onRowClick`. `rowClassName` also lands on the
expanded detail row — it belongs to the same record — while `rowProps` does not.

### DataTable — the pager no longer insists on a rows-per-page select

`DataTablePagination` rendered it unconditionally, so a host whose backend fixes
the page size showed a control that could not do anything.

`pageSizeOptions` now takes `false`, and a single option hides the select too —
the same reasoning, expressed by the data. The rest of the pager stays: the page
count and the arrows still mean something.

### DataTable — load more / infinite scroll

Pagination was the only mode, and because the table owns its scroller a host
could not even bolt a sentinel onto the bottom; eis-frontend kept a "load more"
button outside the table.

`onLoadMore` now puts the table in load-more mode: the pager is replaced by a
footer **inside** the scroller — the element an `IntersectionObserver` has to be
rooted at — and rows are appended instead of replaced. `hasMore` defaults to
`data.length < total`, `autoLoadMore={false}` waits for a click, `pagination`
brings the pager back for a host that wants both.

Two things the implementation is careful about:

- The observer touches no state at all — it calls the host's callback through a
  ref. Anything else would be the loop above with a different observer.
- One request per batch of rows, guarded by the row count the last request was
  made at. A host that answers with nothing new is not asked again, so a
  mis-wired `hasMore` cannot turn into a request storm.

### DataTable — column filters are open to extension

`ColumnFilterDef` was a closed set of five types. A host with its own widgets
(async multiselect, range slider, presence toggle) could only smuggle one into
`column.header`, where it took no part in `query.filters`.

There is now a sixth type that hands the popover body over:

```tsx
filter: {
  type: 'custom',
  render: ({ value, commit }) => <ClientPicker selected={value} onPick={commit} />,
  describe: (value) => `${value.length} selected`,
}
```

The value travels into `query.filters` as `{ type: 'custom', value, label }` and
reaches the backend untouched — its shape is the host's business. Activeness is
structural (`undefined`, `''` and `[]` mean no constraint), the chip text comes
from `describe` or from the label the widget supplied, and `actions: false`
drops the Apply/Reset footer for a widget that commits itself.

### DataTable — the redundant `block truncate` is documented

`.mz-dt__cell` already truncates, and a block-level child was what triggered the
freeze above. The README now says so in the DataTable section, next to the
warning about what such a child used to do.

### Localisation — locale bundles

`DataTableLabels` defaulted to English and a non-English host supplied all ~50
strings by hand; eis-frontend carried a full Russian block inline.

Bundles now ship behind their own entry points:

```tsx
import { dataTable as ru, common } from '@morze/ui/locales/ru'

<DataTable labels={ru} locale="ru-RU" … />
```

`common` carries the strings the rest of the kit takes as individual props
(`close`, `loading`, `sidebarNavigation`, `sidebarSections`, `toggleSidebar`).
A bundle is plain data — no React, no styles, importable from a server
component — and `MorzeLocale` types a language of your own. `tests/locales.test.ts`
asserts a bundle covers every key and leaves nothing in English, which is what
stops the drift the copy-pasted block had.

---

## Known gaps

Nothing open from the integrations so far. What is still missing is browser
coverage for everything that depends on layout: the freeze above, and the
redistribute-on-hide half of the auto-fit fix. happy-dom has no layout engine —
`clientWidth` is always 0, so the effect never fits and the loop never
reproduces. Both are verified by hand in the playground and guarded only by
their comments until there is a browser runner.

---

## Integration notes for host apps

Things that are not defects but cost time to work out the first time.

### Tailwind hosts: put the kit in a cascade layer

The kit ships plain, unlayered CSS. Tailwind v4 puts everything in layers, and
**unlayered CSS beats layered CSS regardless of source order** — so imported
naively, `.mz-btn--primary` wins over every utility a host passes through
`className`. Import the kit into a layer between `components` and `utilities`:

```css
/* Layer order first — @layer statements may precede @import. */
@layer theme, base, components, morze-ui, utilities;

@import 'tailwindcss';
@import '@morze/ui/styles.css' layer(morze-ui);
```

The kit's look then wins over the host's preflight, and a `className` on a
component still wins over the kit. Verify after building: the emitted CSS should
show `@layer` blocks in the order `theme → base → components → morze-ui →
utilities`.

Related: `cn` is plain `clsx`, not `tailwind-merge`. Conflicting classes are not
de-duplicated — they are resolved by the cascade, which is exactly why the layer
order above matters.

### Theme bridging

The theme is `data-mz-theme` on `<html>` (or the `.mz-theme-light` /
`.mz-theme-dark` classes). A host that already has a theme switcher should drive
both from one source rather than mounting `MorzeThemeProvider` alongside it. With
`next-themes` that is a one-line change, because its `attribute` takes an array:

```tsx
<ThemeProvider attribute={['class', 'data-mz-theme']} defaultTheme="light" />
```

The values line up (`light` / `dark`), portalled dialogs and menus follow, and
the host keeps a single switcher.

### Use the kit's TooltipProvider, not the host's

The kit imports from the unified `radix-ui` package. A host's provider from
`@radix-ui/react-tooltip` is a *different module instance* with a different
context, so the kit cannot see it. Nothing breaks visibly — the kit's `Tooltip`
notices there is no provider and quietly creates its own — but the host's
`delayDuration` and `skipDelayDuration` grouping are silently dropped. Import
`TooltipProvider` from `@morze/ui` at the app root.

### API differences from shadcn

The kit is shadcn-shaped, so most of a migration is a straight import rewrite.
These are the ones that need edits — worth keeping current, as it doubles as the
migration checklist:

| shadcn | @morze/ui | Note |
| --- | --- | --- |
| `<Button variant="default">` | `variant="primary"` | also the default, so it can be dropped |
| `<Button size="default">` | `size="md"` | `md` is the default; `xs` and `icon-*` are new |
| `<Badge variant="default">` | `variant="solid"` | |
| `<Badge variant="secondary">` | `variant="soft"` | |
| `<Badge variant="destructive">` | `variant="solid" tone="danger"` | colour split out of shape |
| `<Input size=…>` | `inputSize=…` | avoids the native `size` attribute |
| `<Alert variant=…>` | `tone=…` | no `variant` at all |
| `<SelectTrigger size="lg">` | `size="sm" \| "md"` | no `lg` |

A host whose status tables still speak shadcn variant strings is better served by
one mapper at the boundary than by rewriting every table — see `badgeLook()` in
eis-frontend's `mappingHelper.tsx`.

### Not the kit's fault, but it looks identical

A frozen table is not always this package. eis-frontend's own `useTableState`
froze the same way, from the same class of bug on the host side: two Zustand
selectors returning a fresh object per call —
`useSortStoreV2(s => ({ setSort: s.setSort, clearSort: s.clearSort }))` and
`useFilterStoreV2(s => s.pages[id] ?? {})`. Zustand compares snapshots by
identity, so both re-rendered forever. When a table locks up, rule out unstable
selector and prop identities on the host side before bisecting the kit.
