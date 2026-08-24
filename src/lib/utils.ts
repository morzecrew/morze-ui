import { clsx, type ClassValue } from 'clsx'

/**
 * Class name joiner. Morze UI ships plain, prefixed CSS rather than utility
 * classes, so there is nothing to merge — clsx is enough.
 */
export function cn(...inputs: ClassValue[]) {
  return clsx(inputs)
}

export type Tone = 'primary' | 'accent' | 'danger' | 'warning' | 'info' | 'success'
