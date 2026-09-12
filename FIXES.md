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
  with a literal `#fff`, so a host with a pale tone had no way to darken the
  label short of overriding every component. Each tone now names its label
  colour (`--mz-primary-fg` … `--mz-info-fg`, read through `--mz-tone-fg`)
  and every filled control reads that. The shipped value stays white on all
  six tones — a decision: one label colour across a toolbar of buttons,
  badges and checkmarks outweighs the last point of contrast on the amber,
  which is 1.7:1 in the dark theme and 2.9:1 in light. A host whose tone is
  paler than the kit's re-points that tone's `-fg` to the ink.
- **Two focus rings on `SelectTrigger`** (V-02): it carried `mz-focusable`
  (the outline) on top of its own field glow. The class is gone; the trigger
  focuses the way `Input` does.

### The visual layer drifted into ten spellings of five ideas

- **Found in** the 2026-09 review (V-03…V-06, V-10…V-12), P1.
- **Status** fixed across `src/styles/`, guarded by the new contract blocks in
  `tests/css-contract.test.ts`.

**Symptom.** Nothing was broken; the kit simply did not look like one kit when
two controls stood next to each other. A `Button ghost` and a `Toggle` are both
transparent at rest, and under the cursor the button took a 6% wash and a
hairline while the toggle grew a raised face and a 24% rim — which is a
*secondary button's resting state*. A switch, off, had no hover at all, while
the checkbox and radio beside it picked up a tone rim. One idea — "a filled
control glows downward" — was written ten ways, from `-4px/.4` on the button to
`-28px/.55` on the card. The flat wash existed at 6, 7, 8, 10 and 12 percent;
transitions ran at 0.14, 0.15, 0.16, 0.2 and 0.28s; the press dip was .98 on
buttons, .94 on checkboxes and 1.06 — *upward* — on the slider thumb.

**Cause.** Every one of these was written where it was needed, correctly, and
none of them had a name. A value with no token is a value that gets re-derived
by the next person to need it, and no diff ever shows the divergence.

**Fix.** The recipes got names, and the components read them.

- Three verbs by resting surface — filled / raised / flat — with the hover and
  press belonging to the surface rather than to the component. `Toggle` with no
  variant is flat and lights up exactly like `ghost`; `Toggle outline` has a
  face and raises it; `SelectTrigger` stopped picking up a tone rim on hover,
  which had made it the one control in a form row answering the pointer in
  colour while the `Input` beside it went grey.
- Growth is a button's: a free-standing `Toggle` grows like one, an item inside
  a segmented or joined group does not — a swelling item climbs over its
  neighbour. The slider thumb keeps growing under pressure and is documented as
  the exception: it is held, not clicked.
- `--mz-glow` / `--mz-glow-soft` / `--mz-glow-panel`, sized by how big the lit
  thing is. They are declared on the toned root beside `--mz-fill`, not on
  `:root` — a custom property is substituted where it is *declared*, so one
  written at the root would bake the root's tone in and stop following
  `[data-tone]`.
- `--mz-wash-hover` / `--mz-wash-press` for every flat control;
  `--mz-duration-fast` (0.15s) and `--mz-duration` (0.28s) for everything that
  moves; one `--mz-press-scale`.
- `Table` and `DataTable` draw one header and one row: `--mz-th-bg`,
  `--mz-th-color`, `--mz-th-font-size`, `--mz-row-hover`, `--mz-row-selected`.
  `TableHead` gained `sortable` / `sorted` / `onSort` so the hand-laid table
  gets the grid's sort control instead of each host rolling its own.
- Twenty places read `--mz-primary-rgb` directly — the table's chips and count,
  the sidebar badge and sub-item, the active sort arrow, the resizer, the card
  and accordion hovers — so `tone` moved everything on the page except them.
  All of them follow `--mz-tone-rgb` now, and `.mz-dt`, `.mz-card`,
  `.mz-sidebar` and `.mz-accordion-trigger` joined the toned roots.
- Six tokens were published and read by nothing (`--mz-bg-rgb`,
  `--mz-surface-rgb`, `--mz-elevated-rgb`, `--mz-primary-soft`,
  `--mz-primary-glow`, `--mz-radius-xl`). A token a host can override and see
  nothing happen is worse than no token: they are gone.

### DataTable — the sticky header had nothing to stick to

- **Found in** the 2026-09 review (D-05), P1.
- **Status** fixed in `data-table.tsx` and `data-table.css`.

**Symptom.** `stickyHeader` defaults to `true` and did nothing.

**Cause.** Sticky is resolved against the nearest scrolling ancestor, which is
`.mz-dt__scroller` — `overflow: auto` with no height. It grew with its content
and therefore never scrolled, so there was no scroll for the header to stay
put during, and no prop with which to give it one.

**Fix.** `maxHeight`, `height` and `fill`, the last for a table that should
take the room its flex parent has (`min-height: 0` on the scroller is the part
that makes a flex child shrink below its content). `frame="plain"` came with
it, for the table inside a `Card` that was showing two borders.

### DataTable — a row click belonged to whatever was under it

- **Found in** the 2026-09 review (G-02), P1.
- **Status** fixed in `data-table.tsx`.

**Symptom.** A delete button in an action cell raised its confirmation dialog
*and* opened the record behind it; a link in a cell navigated and fired
`onRowClick` at the same time.

**Cause.** `onRowClick` was wired to the `<tr>` and clicks bubble. Every host
worked around it with `stopPropagation` in every interactive cell, and
forgetting one was the bug.

**Fix.** The handler ignores an event whose target sits inside an `a[href]`,
`button`, `input`, `select`, `textarea`, `label` or an element with a widget
role, scoped to the row the handler is on — a portalled menu lives on
`document.body` and is ignored by construction. This is the one behavioural
change in P1 and belongs in the changelog: a host that relied on the old
bubbling has to call `onRowClick` itself from the control.

### Smaller ones from the P1 review

- **Dead `unit` on a number range** (D-07): declared in the type, read by
  nothing. It is drawn beside both fields and in the chip.
- **`headerTitle` only worked on non-sortable columns** (D-08): `title` was
  taken by the sort hint there — so it did nothing on exactly the columns
  readers ask about. The column's own hint wins now, and the sort hint moves to
  `aria-description`.
- **A right-aligned header was pushed left** (D-10): `margin-left: auto` on the
  funnel shoved the caption away from the numbers it labels. The funnel goes
  first there.
- **A refused inline save was invisible** (D-11): the text editor put the
  message in a `title` attribute, which no screen reader announces; the select
  editor rolled back in silence. Both render it now, under `aria-live`, with
  what you typed still there to correct. `labels.saveFailed` is the default
  wording and `editable.canEdit(row)` is the per-row veto.
- **Chips and the pager ignored the locale** (D-12): dates printed as raw ISO,
  numbers ungrouped — beside a `total` that *was* grouped, so a Russian table
  read "1–25 из 13 659". All of it goes through `locale` now, and an ISO day is
  parsed on the local calendar rather than through UTC midnight, which moved
  the first of a month to the last of the previous one west of Greenwich.
- **Checkboxes that behaved like radios** (D-13): a `multiple: false` select
  and a `boolean` filter drew checkboxes inside `role="radiogroup"` — the
  markup said one thing, the controls another, and neither could be reached
  with an arrow key. Both are `RadioGroup` now.
- **Six identical funnels in a row** (V-07): the filter trigger appears under
  the pointer, under the keyboard and whenever its column is filtering.
  `filterTrigger="always"` restores the old row; touch keeps it unconditional.
  It fades on `opacity`, never `display`, so it stays in the tab order.
- **`Sheet` had no body padding** (V-09): header and footer had 20px and the
  middle had none, so content ran into the panel edge. `SheetBody` is the
  scrolling middle; `Sheet` and `Dialog` also gained `size`.

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

### DataTable — the query is the whole query (G-04, G-11)

Global search lived beside the table in every host: a box in `toolbar` holding
its own state, outside the URL `useTableQuery` writes and outside the page
reset a filter change performs, so searching on page 4 asked the backend for
page 4 of a different result set. `search` puts the box in the toolbar and its
value in `query.search` — debounced, so it is one request per word rather than
per letter — and `useTableQuery` mirrors it as `q`.

Load-more had the matching hole: `onLoadMore()` took no arguments and the table
does not increment `query.page` (the pager owns that field), so every host kept
a counter of its own and the README never said so. It is
`onLoadMore({ nextPage })` now.

`useTableQuery` also took `serializeFilters` / `parseFilters`: `JSON.stringify`
is verbose in an address bar and throws outright on a `custom` value holding a
Date, a Map or a cycle — and a throw there used to take the whole write-back
effect down with it. It degrades to leaving the one parameter alone.

### DataTable — expansion, summaries and column style hooks (G-03, G-05)

`expanded` / `onExpandedChange` / `defaultExpanded` make expansion controllable
(restoring what was open after a refetch needed it), `expandOnRowClick` opens a
row from anywhere on it, and the header carries an expand-all control.
`summary` draws a totals row from each column's `footer(rows)`, sticky to the
bottom of the scroller the way the header is sticky to the top. Columns take
`className` / `headerClassName`, and `sortDescFirst` starts an amount or date
column at the big end.

### A11y state on the table (G-09)

`aria-busy` while a refetch replaces the rows, `aria-rowcount` over the whole
result set — the only way to say "row 30 of 13 659" when 25 of them are on
screen — and the selection count in a live region.

### DatePicker and DateRangePicker (K-11, G-08)

The kit shipped the `Calendar` grid and left every host to build the trigger,
the formatting, the clear button and the popover around it — which is how the
table's own date filter ended up on a native `<input type="date">`, with the
browser's look and the browser's locale inside a kit that owns both. The two
fields reuse the select trigger's recipe, so a date field and a select in one
form row are the same object. `toISODate` / `fromISODate` are the bridge to the
`YYYY-MM-DD` a backend speaks, and they read the local calendar:
`toISOString().slice(0, 10)` files an evening east of Greenwich under the next
day.

The table's `date-range` filter keeps its two typed fields — a date eighteen
months back is four words to type and a dozen clicks to page to — and now has
the kit's month grid beside them, plus `presets` for the named spans.

### The kit's size and API gaps (K-01…K-06)

`SelectTrigger` gained `lg`, `RadioGroupItem` a `size`, `Textarea` an
`inputSize`; `Dialog` and `Sheet` gained `size`; `Alert` gained `live` (and no
longer interrupts a screen-reader user on every render of a static banner);
`SidebarProvider` gained `shortcut`, so Ctrl/⌘+B can be given back to Firefox's
bookmarks pane; `ToggleGroupItem`'s own `tone` now overrides the group's;
`Progress` gained `indeterminate` and `AvatarGroup` a `max` with its "+N" chip.

### DataTable — a dragged column could not be given back to auto-fit (G-07)

Dragging a resize handle marks a column `sized`, and that is permanent on
purpose: without it the next container resize would take the hand-set width
away again. What was missing was the undo. One stray drag on one column, and
the only way back was Reset — which also threw away the order, the pins and
everything hidden, so in practice nobody used it and the column stayed stuck.

`unsize(id)` on `useColumnLayout` clears the flag and puts the width back to
the declared one — not to where the drag left it, since the declared figure is
what `fitTo` scales every other column from, and leaving the dragged width in
would make the next fit depend on a gesture that is supposed to have been
undone. It bumps `fitEpoch` for the same reason `reset` does: nothing about the
container has changed, so nothing else would trigger the fit that has to
follow. The Columns list shows the control on exactly the columns it can act
on, so a table nobody has resized still has four buttons per row.

The stored layout also gained a schema version. It is written as
`{ v: 1, …layout }`, and a payload stamped with anything else is dropped rather
than merged: a column list that silently loses its pins is the kind of bug that
gets reported months later as "the table forgot my columns", with no way left
to tell which release did it. An *unstamped* payload is adopted as-is — its
shape is version 1 — so nobody loses a layout on the way up to it.

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

Nothing open from the integrations so far.

The browser coverage that used to be missing here is in place as of 0.4.0:
`tests/data-table.browser.test.tsx` runs in a real Chrome (`npm run
test:browser`), and the two defects that depended on layout are guarded by
tests rather than by their comments. Both were checked by reintroducing the
original bug:

| Reintroduced | What the test reports |
| --- | --- |
| the fresh state object per observer tick | renders climb from 540 to 1044 over 700ms instead of standing still |
| the fit effect no longer keyed on `hidden` | two columns cover 598px where three covered 888 — the slack stays at the right edge |

The fast suite still runs on happy-dom, where `clientWidth` is always 0 and
neither can reproduce; the browser specs are named `*.browser.test.tsx` and
excluded from it.

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
| `<Textarea>` | `inputSize=…` | same reason; shadcn has no size there |
| `<Alert variant=…>` | `tone=…` | no `variant` at all; `role="alert"` is opt-in via `live` |

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
