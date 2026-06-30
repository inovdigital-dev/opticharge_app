import { TariffSettings, DEFAULT_SETTINGS, deriveTariffOption } from './tariff'
import { getUserSettings, saveUserSettings } from './supabase'

const KEY = 'opticharge_settings'

function migrate(saved: Partial<TariffSettings>): TariffSettings {
  const merged = { ...DEFAULT_SETTINGS, ...saved }
  // If tariffOption wasn't explicitly saved, derive from legacy type+cycle
  if (!('tariffOption' in saved) && saved.type) {
    merged.tariffOption = deriveTariffOption(saved.type, saved.cycle ?? 'diario')
  }
  return merged
}

export function loadSettingsLocal(): TariffSettings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return DEFAULT_SETTINGS
    return migrate(JSON.parse(raw))
  } catch {
    return DEFAULT_SETTINGS
  }
}

export function saveSettingsLocal(s: TariffSettings): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(KEY, JSON.stringify(s))
}

export async function loadSettings(): Promise<TariffSettings> {
  try {
    const remote = await getUserSettings()
    if (remote) {
      const s = migrate(remote)
      saveSettingsLocal(s)
      return s
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
