import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import zhHant from '../locales/zh-Hant.json'
import enGB from '../locales/en-GB.json'

export type Lang = 'zh-Hant' | 'en-GB'
export type MessageKey = keyof typeof zhHant
export type TFunction = (key: MessageKey, vars?: Record<string, string | number>) => string

// Typed so a key missing from en-GB.json is a compile error.
const messages: Record<Lang, Record<MessageKey, string>> = { 'zh-Hant': zhHant, 'en-GB': enGB }

const STORAGE_KEY = 'yk.lang'

function storedLang(): Lang {
  try {
    const v = localStorage.getItem(STORAGE_KEY)
    if (v === 'zh-Hant' || v === 'en-GB') return v
  } catch {
    /* storage unavailable */
  }
  return 'zh-Hant'
}

type I18nState = { lang: Lang; setLang: (lang: Lang) => void; t: TFunction }

const I18nContext = createContext<I18nState | null>(null)

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>(storedLang)

  useEffect(() => {
    document.documentElement.lang = lang
    try {
      localStorage.setItem(STORAGE_KEY, lang)
    } catch {
      /* storage unavailable */
    }
  }, [lang])

  // "{name}" placeholders are filled from vars.
  const t = useCallback<TFunction>(
    (key, vars) =>
      (messages[lang][key] ?? key).replace(/\{(\w+)\}/g, (m, k: string) => (vars && k in vars ? String(vars[k]) : m)),
    [lang],
  )

  const value = useMemo(() => ({ lang, setLang, t }), [lang, t])
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n() {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useI18n must be used inside I18nProvider')
  return ctx
}
