/**
 * The pre-paint half of `MorzeThemeProvider` (#26), as a string for an inline
 * `<script>` in the document head:
 *
 *   <script dangerouslySetInnerHTML={{ __html: themeScript() }} />
 *
 * The provider is a React component, so the earliest it can write the theme is
 * after the bundle has loaded and React has mounted — and until then the page
 * paints with whatever <html> says, which is the dark default. A light-system
 * user saw a dark first frame, and every host that cared hand-wrote this
 * script and kept it in step with the provider's storage key by hand.
 *
 * Give it the options the provider gets; it reads the same storage key,
 * resolves `system` the same way and writes the same attribute, so the two
 * agree from the first frame. Its own entry (`@morze/ui/theme-script`) has no
 * "use client" on it, so a server component can call it.
 */

export type ThemeScriptOptions = {
  /** The provider's `storageKey`; `null` when it does not persist. */
  storageKey?: string | null
  /** The provider's `defaultTheme`. */
  defaultTheme?: 'dark' | 'light' | 'system'
  /** The provider's `attribute`. */
  attribute?: 'data-mz-theme' | 'class'
}

export const DEFAULT_THEME_STORAGE_KEY = 'morze-ui-theme'

/** JSON, made safe to sit inside a <script> element. */
const literal = (value: unknown) => JSON.stringify(value).replace(/</g, '\\u003c')

export function themeScript({
  storageKey = DEFAULT_THEME_STORAGE_KEY,
  defaultTheme = 'dark',
  attribute = 'data-mz-theme',
}: ThemeScriptOptions = {}): string {
  return (
    '(function(){try{' +
    `var k=${literal(storageKey)},t=null;` +
    'try{t=k&&localStorage.getItem(k)}catch(e){}' +
    `if(t!=="dark"&&t!=="light"&&t!=="system")t=${literal(defaultTheme)};` +
    'if(t==="system")t=window.matchMedia&&matchMedia("(prefers-color-scheme: light)").matches?"light":"dark";' +
    'var r=document.documentElement;' +
    (attribute === 'class'
      ? 'r.classList.remove(t==="dark"?"light":"dark");r.classList.add(t);'
      : 'r.setAttribute("data-mz-theme",t);') +
    '}catch(e){}})()'
  )
}
