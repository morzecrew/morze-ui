'use client'

import * as React from 'react'

import type { MorzeLocale, MorzeLocaleBundle } from '../locales/types'

type LocaleContextValue = {
  /** The bundle in force — every provider above merged, the nearest winning. */
  locale: MorzeLocaleBundle
  /** BCP 47 tag for dates and numbers; `undefined` means the browser's. */
  tag: string | undefined
}

const EMPTY: LocaleContextValue = { locale: {}, tag: undefined }
const LocaleContext = React.createContext<LocaleContextValue>(EMPTY)

type MorzeLocaleProviderProps = {
  /**
   * The strings, once for the whole app: a bundle from `@morze/ui/locales/*`,
   * one of your own typed as `MorzeLocale`, or any part of one.
   */
  locale?: MorzeLocaleBundle
  /**
   * The BCP 47 tag the date and number widgets format with — `Calendar`,
   * `DatePicker`, `DataTable` — e.g. `ru-RU`.
   */
  tag?: string
  children: React.ReactNode
}

/**
 * Installs a language for every component under it, so it is said once
 * instead of per instance (#12). A component's own `labels` / `locale` props
 * still win, key by key, and a provider inside another overrides only what it
 * names. Without one, every component is English, as before.
 *
 *   import ru from '@morze/ui/locales/ru'
 *   <MorzeLocaleProvider locale={ru} tag="ru-RU">…</MorzeLocaleProvider>
 */
function MorzeLocaleProvider({ locale, tag, children }: MorzeLocaleProviderProps) {
  const parent = React.useContext(LocaleContext)
  const value = React.useMemo<LocaleContextValue>(() => {
    const merged: Record<string, object | undefined> = { ...parent.locale }
    for (const [section, labels] of Object.entries(locale ?? {})) {
      merged[section] = { ...merged[section], ...labels }
    }
    return { locale: merged as MorzeLocaleBundle, tag: tag ?? parent.tag }
  }, [parent, locale, tag])
  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
}

/** The bundle and tag in force here — for a host widget of its own. */
function useMorzeLocale() {
  return React.useContext(LocaleContext)
}

/**
 * One section's labels: the English defaults, under whatever a provider
 * installed, under the component's own `labels`. The defaults object itself
 * comes back when neither adds anything, so its identity is stable.
 */
function useLocaleLabels<K extends keyof MorzeLocale>(
  section: K,
  defaults: MorzeLocale[K],
  own?: Partial<MorzeLocale[K]>
): MorzeLocale[K] {
  const installed = React.useContext(LocaleContext).locale[section]
  return installed || own ? { ...defaults, ...installed, ...own } : defaults
}

/** The component's own `locale` prop, else the provider's tag. */
function useLocaleTag(own?: string): string | undefined {
  const installed = React.useContext(LocaleContext).tag
  return own ?? installed
}

export { MorzeLocaleProvider, useMorzeLocale, useLocaleLabels, useLocaleTag }
export type { MorzeLocaleProviderProps }
