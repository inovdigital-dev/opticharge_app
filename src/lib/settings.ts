import { TariffSettings, DEFAULT_SETTINGS } from './tariff'
import { getUserSettings, saveUserSettings } from './supabase'

const KEY = 'opticharge_settings'

export function loadSettingsLocal(): TariffSettings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return DEFAULT_SETTINGS
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) }
  } catch {
    return DEFAULT_SETTINGS
  }
}

export function saveSettingsLocal(s: TariffSettings): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(KEY, JSON.stringify(s))
}

export async function loadSettings(): Promise<TariffSettings> {
  // Tentar Supabase primeiro (utilizador autenticado)
  try {
    const remote = await getUserSettings()
    if (remote) {
      saveSettingsLocal(remote) // sync local
      return { ...DEFAULT_SETTINGS, ...remote }
    }
  } catch { /* sem auth ou sem rede */ }
  return loadSettingsLocal()
}

export async function saveSettings(s: TariffSettings): Promise<void> {
  saveSettingsLocal(s)
  try {
    await saveUserSettings(s)
  } catch { /* sem auth */ }
}
