// Minimal lookup for Milestone 0; Milestone 2 replaces this with a proper i18n provider.
import zhHant from './locales/zh-Hant.json'
import enGB from './locales/en-GB.json'

export type Lang = 'zh-Hant' | 'en-GB'
export type MessageKey = keyof typeof zhHant

const messages: Record<Lang, Record<MessageKey, string>> = { 'zh-Hant': zhHant, 'en-GB': enGB }

let current: Lang = 'zh-Hant'

export function setLang(lang: Lang) {
  current = lang
  document.documentElement.lang = lang
}

export function t(key: MessageKey): string {
  return messages[current][key] ?? key
}
