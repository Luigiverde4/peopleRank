import { AppError, errorCodeOf } from '../lib/appError'
import type { Locale } from '../lib/locale'
import { useLocaleStore } from '../store/localeStore'
import { en } from './en'
import { es, type Messages } from './es'

export type { Messages }

const MESSAGES: Record<Locale, Messages> = { es, en }

export function messagesFor(locale: Locale): Messages {
  return MESSAGES[locale]
}

/** Texts of the current language; components re-render when it changes. */
export function useT(): Messages {
  return MESSAGES[useLocaleStore((s) => s.locale)]
}

/** Texts of the current language, for code outside React (stores, exports). */
export function currentMessages(): Messages {
  return MESSAGES[useLocaleStore.getState().locale]
}

/** Sentence for the user: translated for known errors, the raw message otherwise. */
export function describeError(error: unknown, t: Messages): string {
  const code = errorCodeOf(error)
  if (code) {
    const detail = error instanceof AppError && error.detail ? `: ${error.detail}` : ''
    return t.errors[code] + detail
  }
  return error instanceof Error ? error.message : String(error)
}
