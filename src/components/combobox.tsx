'use client'

import * as React from 'react'

import { cn, type Tone } from '../lib/utils'
import { CheckIcon, ChevronDownIcon, XIcon } from '../lib/icons'
import { Badge } from './badge'
import { Button } from './button'
import { Input } from './input'
import { Popover, PopoverContent, PopoverTrigger } from './popover'
import { Spinner } from './spinner'

/* --------------------------------------------------------------------------
   Combobox · MultiSelect — a searchable list behind a field (K-11).

   The gap this closes is a specific one: `Select` takes a static list and has
   no search, so every host with more than a screenful of options — warehouses,
   counterparties, articles — either shipped a native `<select>` beside the
   kit's own fields or smuggled a widget of its own through the table's
   `custom` filter. Both are the same list with a box over it and a request
   behind it, which is what `loadOptions` is.

   The trigger is the select trigger's recipe and the rows are the menu's
   (`.mz-item`), so a combobox in a form row is the same object as the select
   beside it and its list is the list the dropdown menu already draws.
   -------------------------------------------------------------------------- */

export type ComboboxOption = {
  value: string
  label: string
  disabled?: boolean
  /** A second line under the label — a code, a city, a balance. */
  hint?: React.ReactNode
}

export type ComboboxLabels = {
  placeholder: string
  search: string
  empty: string
  loading: string
  failed: string
  clear: string
  selectAll: string
  clearAll: string
  /** Stands for the chips a full trigger has no room for. */
  andMore: (count: number) => string
  /** Shown while the query is shorter than `minChars`. */
  typeMore: (count: number) => string
}

const defaultLabels: ComboboxLabels = {
  placeholder: 'Select…',
  search: 'Search…',
  empty: 'Nothing matches',
  loading: 'Loading',
  failed: 'The options could not be loaded',
  clear: 'Clear',
  selectAll: 'All',
  clearAll: 'None',
  andMore: (count) => `+${count}`,
  typeMore: (count) => `Type ${count} characters or more`,
}

/** Everything the trigger and the list share, whatever is being picked. */
type BaseProps = {
  /** A list the field filters itself. */
  options?: ComboboxOption[]
  /**
   * A list the backend filters. Called with the typed query while the list is
   * open; a rejected promise is reported in place and retried on the next
   * keystroke. Given both, `options` is only a dictionary of labels for values
   * the field has not loaded yet.
   */
  loadOptions?: (query: string) => Promise<ComboboxOption[]>
  /** Quiet time before `loadOptions` is called, in ms. */
  debounce?: number
  /** Characters before `loadOptions` is called at all — for a big index. */
  minChars?: number
  disabled?: boolean
  /** The 34/40/48 scale the other fields run on. */
  size?: 'sm' | 'md' | 'lg'
  tone?: Tone
  /** `false` drops the × that empties the field. */
  clearable?: boolean
  /** `false` drops the search box — a list of six statuses does not need one. */
  searchable?: boolean
  labels?: Partial<ComboboxLabels>
  placeholder?: string
  id?: string
  name?: string
  className?: string
  /** Class on the popover, for a list that needs its own width or height. */
  panelClassName?: string
  /** Draws an option's row; the check column and the hit area stay the kit's. */
  renderOption?: (
    option: ComboboxOption,
    state: { selected: boolean; active: boolean }
  ) => React.ReactNode
  onOpenChange?: (open: boolean) => void
  'aria-label'?: string
  'aria-labelledby'?: string
}

type OptionList = {
  shown: ComboboxOption[]
  loading: boolean
  failed: boolean
  /** The query is still shorter than `minChars`, so nothing has been asked. */
  waiting: boolean
}

/**
 * One list, from either source. A static list is filtered here; an async one
 * is filtered by whoever answers `loadOptions` — a backend matches on fields
 * the option object never carries, and filtering its answer a second time
 * locally would drop exactly those hits.
 */
function useOptionList({
  options,
  loadOptions,
  query,
  open,
  debounce,
  minChars,
}: {
  options?: ComboboxOption[]
  loadOptions?: (query: string) => Promise<ComboboxOption[]>
  query: string
  open: boolean
  debounce: number
  minChars: number
}): OptionList {
  const [remote, setRemote] = React.useState<{
    options: ComboboxOption[]
    loading: boolean
    failed: boolean
  }>({ options: [], loading: false, failed: false })

  // Kept current after every commit so the effect below never re-subscribes
  // just because the host passed a fresh closure: `loadOptions={(q) => …}` is
  // a new function on every render, and depending on it directly would fire a
  // request per render for as long as the list is open.
  const loadRef = React.useRef(loadOptions)
  React.useEffect(() => {
    loadRef.current = loadOptions
  })

  const async = Boolean(loadOptions)
  const needle = query.trim()
  const waiting = async && needle.length < minChars

  // Every request gets a ticket and only the newest one may write: two
  // keystrokes can be in flight at once, and the slower, older answer would
  // otherwise land last and replace the newer list with a stale one.
  const ticket = React.useRef(0)
  React.useEffect(() => {
    if (!async || !open) return
    if (needle.length < minChars) {
      ticket.current += 1
      setRemote({ options: [], loading: false, failed: false })
      return
    }
    const id = (ticket.current += 1)
    setRemote((current) => ({ ...current, loading: true, failed: false }))
    // The list that has just opened answers at once; every keystroke after it
    // waits out the debounce, which is what keeps a request per letter off the
    // backend.
    const timer = setTimeout(
      () => {
        loadRef.current?.(needle).then(
          (next) => {
            if (id === ticket.current) setRemote({ options: next, loading: false, failed: false })
          },
          () => {
            if (id === ticket.current) setRemote({ options: [], loading: false, failed: true })
          }
        )
      },
      needle === '' ? 0 : debounce
    )
    return () => clearTimeout(timer)
  }, [async, open, needle, minChars, debounce])

  const local = React.useMemo(() => {
    const list = options ?? []
    const lowered = needle.toLocaleLowerCase()
    if (!lowered) return list
    return list.filter(
      (option) =>
        option.label.toLocaleLowerCase().includes(lowered) ||
        option.value.toLocaleLowerCase().includes(lowered)
    )
  }, [options, needle])

  if (!async) return { shown: local, loading: false, failed: false, waiting: false }
  return { shown: remote.options, loading: remote.loading, failed: remote.failed, waiting }
}

/**
 * Labels for values whose option is not in the list any more. An async list
 * holds whatever the last query answered, so a chip for something picked two
 * queries ago has nothing left to read its label from. Every option the field
 * has ever seen stays in here; a value it has never seen prints as itself.
 */
function useOptionDictionary(lists: (ComboboxOption[] | undefined)[]) {
  const dictionary = React.useRef(new Map<string, ComboboxOption>())
  // Writing during render is safe because it is idempotent: the same options
  // produce the same entries, so React running this twice changes nothing.
  for (const list of lists) for (const option of list ?? []) dictionary.current.set(option.value, option)
  return dictionary.current
}

/** The search box, the list, and the keyboard that moves through it. */
function OptionPanel({
  listId,
  triggerId,
  labels,
  searchable,
  query,
  setQuery,
  list,
  minChars,
  active,
  setActive,
  isSelected,
  onPick,
  onBackspace,
  toolbar,
  renderOption,
}: {
  listId: string
  triggerId: string
  labels: ComboboxLabels
  searchable: boolean
  query: string
  setQuery: (query: string) => void
  list: OptionList
  minChars: number
  active: number
  setActive: (index: number) => void
  isSelected: (option: ComboboxOption) => boolean
  onPick: (option: ComboboxOption) => void
  onBackspace?: () => void
  toolbar?: React.ReactNode
  renderOption?: BaseProps['renderOption']
}) {
  const listRef = React.useRef<HTMLUListElement>(null)
  const { shown } = list

  React.useEffect(() => {
    const option = listRef.current?.querySelector<HTMLElement>('[data-highlighted]')
    // Guarded: a DOM without layout has no scrollIntoView to call.
    option?.scrollIntoView?.({ block: 'nearest' })
  }, [active, shown.length])

  // With no search box there is nothing inside the panel to hold focus, so the
  // keys would land on the popover itself — above this handler, which only
  // sees what bubbles up from inside it. The list takes the focus instead.
  React.useEffect(() => {
    if (!searchable) listRef.current?.focus?.()
  }, [searchable])

  /** The next option that can actually be chosen, wrapping at either end. */
  const move = (delta: number) => {
    if (shown.length === 0) return
    let next = active
    for (let step = 0; step < shown.length; step += 1) {
      next = (next + delta + shown.length) % shown.length
      if (!shown[next]?.disabled) return setActive(next)
    }
  }

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      move(1)
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      move(-1)
    } else if (event.key === 'Enter') {
      event.preventDefault()
      const option = shown[active]
      if (option && !option.disabled) onPick(option)
    } else if (event.key === 'Backspace' && query === '') {
      onBackspace?.()
    } else if ((event.key === 'Home' || event.key === 'End') && query === '') {
      // Only on an empty box: with a query typed, Home and End belong to the
      // caret, and taking them would be a worse trade than the shortcut is worth.
      event.preventDefault()
      setActive(event.key === 'Home' ? 0 : shown.length - 1)
    }
  }

  const state = list.waiting
    ? labels.typeMore(minChars)
    : list.failed
      ? labels.failed
      : shown.length === 0 && !list.loading
        ? labels.empty
        : null

  return (
    <div className="mz-combobox__body" onKeyDown={onKeyDown}>
      {searchable ? (
        <div className="mz-combobox__search">
          <Input
            autoFocus
            type="search"
            inputSize="sm"
            aria-label={labels.search}
            // A searchbox rather than a second combobox: the trigger already
            // carries that role, and the box drives the same list through
            // `aria-activedescendant` — the focus stays here while the
            // highlight moves down there.
            aria-controls={listId}
            aria-activedescendant={
              shown[active] && !list.loading ? `${listId}-o-${active}` : undefined
            }
            autoComplete="off"
            placeholder={labels.search}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          {list.loading ? <Spinner label={labels.loading} className="mz-combobox__spinner" /> : null}
        </div>
      ) : null}

      {toolbar}

      <ul
        ref={listRef}
        id={listId}
        role="listbox"
        // Named by the field it belongs to, not by the box above it: "Search…"
        // is what the box is called, and a list called that says nothing about
        // what is in it.
        aria-labelledby={triggerId}
        aria-busy={list.loading || undefined}
        tabIndex={searchable ? undefined : 0}
        aria-activedescendant={
          !searchable && shown[active] ? `${listId}-o-${active}` : undefined
        }
        className="mz-combobox__list"
      >
        {shown.map((option, index) => {
          const selected = isSelected(option)
          return (
            <li
              key={option.value}
              id={`${listId}-o-${index}`}
              role="option"
              aria-selected={selected}
              aria-disabled={option.disabled || undefined}
              // The menu's own highlight attributes, so the row lights up the
              // way every other list in the kit does, under both the pointer
              // and the keyboard — and only once, because the pointer moves
              // the same highlight the arrows move.
              data-highlighted={index === active ? '' : undefined}
              data-state={selected ? 'checked' : undefined}
              data-disabled={option.disabled ? '' : undefined}
              className="mz-item mz-combobox__option"
              onPointerMove={() => !option.disabled && index !== active && setActive(index)}
              onClick={() => !option.disabled && onPick(option)}
            >
              <span className="mz-item__indicator">{selected ? <CheckIcon /> : null}</span>
              {renderOption ? (
                renderOption(option, { selected, active: index === active })
              ) : (
                <span className="mz-combobox__text">
                  <span className="mz-combobox__label">{option.label}</span>
                  {option.hint ? <span className="mz-combobox__hint">{option.hint}</span> : null}
                </span>
              )}
            </li>
          )
        })}
      </ul>

      {state ? (
        <p className="mz-combobox__state" role={list.failed ? 'alert' : undefined}>
          {state}
        </p>
      ) : null}
      {/* The list is the only thing on screen while an unsearchable field
          loads, so it says so rather than sitting empty. */}
      {list.loading && !searchable ? (
        <p className="mz-combobox__state">
          <Spinner label={null} /> {labels.loading}
        </p>
      ) : null}
    </div>
  )
}

/** The field itself: trigger, clear button, popover. */
function Field({
  open,
  setOpen,
  size = 'md',
  tone,
  disabled,
  clearable = true,
  filled,
  labels,
  listId,
  id,
  className,
  panelClassName,
  ariaLabel,
  ariaLabelledby,
  onClear,
  trigger,
  children,
}: {
  open: boolean
  setOpen: (open: boolean) => void
  size?: 'sm' | 'md' | 'lg'
  tone?: Tone
  disabled?: boolean
  clearable?: boolean
  filled: boolean
  labels: ComboboxLabels
  listId: string
  id?: string
  className?: string
  panelClassName?: string
  ariaLabel?: string
  ariaLabelledby?: string
  onClear: () => void
  trigger: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <div data-slot="combobox" data-tone={tone} className={cn('mz-combobox', className)}>
        <PopoverTrigger asChild>
          <button
            type="button"
            id={id}
            disabled={disabled}
            data-size={size}
            data-placeholder={filled ? undefined : true}
            // The select-only combobox: the button is the collapsed field and
            // the list is its popup. Its own text is the value, so no
            // aria-label is set for it here — that would replace what the
            // reader has chosen with the word "combobox".
            role="combobox"
            aria-haspopup="listbox"
            aria-controls={listId}
            aria-label={ariaLabel}
            aria-labelledby={ariaLabelledby}
            className={cn(
              'mz-select-trigger mz-combobox__trigger',
              size === 'sm' && 'mz-select-trigger--sm',
              size === 'lg' && 'mz-select-trigger--lg'
            )}
          >
            {trigger}
            <ChevronDownIcon className="mz-select-trigger__icon" />
          </button>
        </PopoverTrigger>
        {/* Outside the trigger, not inside it: a button cannot contain a
            button, and nesting one makes the clear click open the list. */}
        {clearable && filled && !disabled ? (
          <button
            type="button"
            className="mz-combobox__clear mz-focusable"
            aria-label={labels.clear}
            title={labels.clear}
            onClick={onClear}
          >
            <XIcon />
          </button>
        ) : null}
      </div>
      <PopoverContent align="start" className={cn('mz-combobox__panel', panelClassName)}>
        {children}
      </PopoverContent>
    </Popover>
  )
}

export type ComboboxProps = BaseProps & {
  value?: string | null
  defaultValue?: string
  onChange?: (value: string | undefined, option?: ComboboxOption) => void
}

function Combobox({
  options,
  loadOptions,
  debounce = 250,
  minChars = 0,
  searchable = true,
  labels: labelsProp,
  placeholder,
  value: controlled,
  defaultValue,
  onChange,
  name,
  id,
  panelClassName,
  renderOption,
  onOpenChange,
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledby,
  ...field
}: ComboboxProps) {
  const labels = { ...defaultLabels, ...labelsProp }
  const generatedId = React.useId()
  const triggerId = id ?? generatedId
  const listId = `${generatedId}-list`
  const [open, setOpen] = React.useState(false)
  const [query, setQuery] = React.useState('')
  const [active, setActive] = React.useState(0)
  const [internal, setInternal] = React.useState<string | undefined>(defaultValue)
  const value = controlled === undefined ? internal : (controlled ?? undefined)

  const list = useOptionList({ options, loadOptions, query, open, debounce, minChars })
  const dictionary = useOptionDictionary([options, list.shown])

  const openChange = (next: boolean) => {
    setOpen(next)
    onOpenChange?.(next)
    // A closed list keeps nothing: the next opening is a fresh question, and
    // an async one would otherwise show the answer to the last one.
    if (!next) setQuery('')
    if (next) {
      const index = list.shown.findIndex((option) => option.value === value)
      setActive(index < 0 ? 0 : index)
    }
  }

  // The highlight belongs to a list; when the list changes under it — a new
  // query, a new answer — it goes back to the top rather than to whatever
  // happens to sit at the old index. Compared by value, not by identity: a
  // host that writes `options={[…]}` inline hands over a fresh array on every
  // render, and resetting on that would drag the highlight back up under the
  // reader's arrow keys.
  const shownKey = list.shown.map((option) => option.value).join('\u0000')
  React.useEffect(() => {
    setActive(0)
  }, [query, shownKey])

  const commit = (next: string | undefined, option?: ComboboxOption) => {
    if (controlled === undefined) setInternal(next)
    onChange?.(next, option)
  }

  const text = value === undefined || value === '' ? '' : (dictionary.get(value)?.label ?? value)

  return (
    <>
      <Field
        {...field}
        id={triggerId}
        open={open}
        setOpen={openChange}
        filled={Boolean(text)}
        labels={labels}
        listId={listId}
        panelClassName={panelClassName}
        ariaLabel={ariaLabel}
        ariaLabelledby={ariaLabelledby}
        onClear={() => commit(undefined)}
        trigger={
          <span className="mz-combobox__value">{text || (placeholder ?? labels.placeholder)}</span>
        }
      >
        <OptionPanel
          listId={listId}
          triggerId={triggerId}
          labels={labels}
          searchable={searchable}
          query={query}
          setQuery={setQuery}
          list={list}
          minChars={minChars}
          active={active}
          setActive={setActive}
          renderOption={renderOption}
          isSelected={(option) => option.value === value}
          onPick={(option) => {
            commit(option.value, option)
            // One choice is the whole answer, so the list has nothing left to
            // ask — unlike the multi-select, which stays open for the next tick.
            openChange(false)
          }}
        />
      </Field>
      {/* The value a surrounding <form> submits — the trigger is a button and
          carries none. */}
      {name ? <input type="hidden" name={name} value={value ?? ''} /> : null}
    </>
  )
}

export type MultiSelectProps = BaseProps & {
  value?: string[]
  defaultValue?: string[]
  onChange?: (values: string[], options: ComboboxOption[]) => void
  /** How many chips the trigger draws before the rest collapse into "+N". */
  maxChips?: number
  /** `false` drops the All / None row over the list. */
  selectAll?: boolean
}

function MultiSelect({
  options,
  loadOptions,
  debounce = 250,
  minChars = 0,
  searchable = true,
  labels: labelsProp,
  placeholder,
  value: controlled,
  defaultValue,
  onChange,
  maxChips = 2,
  selectAll = true,
  name,
  id,
  panelClassName,
  renderOption,
  onOpenChange,
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledby,
  ...field
}: MultiSelectProps) {
  const labels = { ...defaultLabels, ...labelsProp }
  const generatedId = React.useId()
  const triggerId = id ?? generatedId
  const listId = `${generatedId}-list`
  const [open, setOpen] = React.useState(false)
  const [query, setQuery] = React.useState('')
  const [active, setActive] = React.useState(0)
  const [internal, setInternal] = React.useState<string[]>(defaultValue ?? [])
  const values = controlled ?? internal

  const list = useOptionList({ options, loadOptions, query, open, debounce, minChars })
  const dictionary = useOptionDictionary([options, list.shown])

  const openChange = (next: boolean) => {
    setOpen(next)
    onOpenChange?.(next)
    if (!next) setQuery('')
  }

  const shownKey = list.shown.map((option) => option.value).join('\u0000')
  React.useEffect(() => {
    setActive(0)
  }, [query, shownKey])

  const commit = (next: string[]) => {
    if (controlled === undefined) setInternal(next)
    onChange?.(
      next,
      next.map((value) => dictionary.get(value) ?? { value, label: value })
    )
  }

  const toggle = (value: string) =>
    commit(values.includes(value) ? values.filter((v) => v !== value) : [...values, value])

  const chips = values.slice(0, maxChips)
  const rest = values.length - chips.length

  /* All and None act on what is on screen, which is what a reader who has
     just typed a word expects them to mean; None, with nothing typed, empties
     the field. Below two options there is no work to save. */
  const toolbar =
    selectAll && list.shown.length > 1 ? (
      <div className="mz-combobox__toolbar">
        <Button
          type="button"
          size="xs"
          variant="link"
          onClick={() =>
            commit([...new Set([...values, ...list.shown.filter((o) => !o.disabled).map((o) => o.value)])])
          }
        >
          {labels.selectAll}
        </Button>
        <Button
          type="button"
          size="xs"
          variant="link"
          onClick={() => {
            const drop = new Set(list.shown.map((option) => option.value))
            commit(values.filter((value) => !drop.has(value)))
          }}
        >
          {labels.clearAll}
        </Button>
      </div>
    ) : null

  return (
    <>
      <Field
        {...field}
        id={triggerId}
        open={open}
        setOpen={openChange}
        filled={values.length > 0}
        labels={labels}
        listId={listId}
        panelClassName={panelClassName}
        ariaLabel={ariaLabel}
        ariaLabelledby={ariaLabelledby}
        onClear={() => commit([])}
        trigger={
          values.length === 0 ? (
            <span className="mz-combobox__value">{placeholder ?? labels.placeholder}</span>
          ) : (
            /* Chips, not buttons with their own ×: the trigger is a button
               already, and a button cannot contain one. A chip is dropped in
               the list, where it was picked. */
            <span className="mz-combobox__chips">
              {chips.map((value) => (
                <Badge key={value} variant="soft" className="mz-combobox__chip">
                  {dictionary.get(value)?.label ?? value}
                </Badge>
              ))}
              {rest > 0 ? (
                <Badge variant="outline" className="mz-combobox__chip">
                  {labels.andMore(rest)}
                </Badge>
              ) : null}
            </span>
          )
        }
      >
        <OptionPanel
          listId={listId}
          triggerId={triggerId}
          labels={labels}
          searchable={searchable}
          query={query}
          setQuery={setQuery}
          list={list}
          minChars={minChars}
          active={active}
          setActive={setActive}
          toolbar={toolbar}
          renderOption={renderOption}
          isSelected={(option) => values.includes(option.value)}
          onPick={(option) => toggle(option.value)}
          // Backspace on an empty box drops the last chip — the one gesture
          // every tag field in every application shares.
          onBackspace={() => values.length > 0 && commit(values.slice(0, -1))}
        />
      </Field>
      {/* One input per value, under one name: what a multiple `<select>`
          submits, and what a backend reading `?tag=a&tag=b` expects. */}
      {name ? values.map((value) => <input key={value} type="hidden" name={name} value={value} />) : null}
    </>
  )
}

export { Combobox, MultiSelect }
