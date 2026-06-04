/**
 * Festivos de Colombia — cálculos completamente en UTC
 * para evitar problemas de timezone en el navegador.
 */

/** Calcula la fecha de Pascua (Computus) — retorna Date UTC */
function getEaster(year: number): Date {
  const a = year % 19
  const b = Math.floor(year / 100)
  const c = year % 100
  const d = Math.floor(b / 4)
  const e = b % 4
  const f = Math.floor((b + 8) / 25)
  const g = Math.floor((b - f + 1) / 3)
  const h = (19 * a + b - d - g + 15) % 30
  const i = Math.floor(c / 4)
  const k = c % 4
  const l = (32 + 2 * e + 2 * i - h - k) % 7
  const m = Math.floor((a + 11 * h + 22 * l) / 451)
  const month = Math.floor((h + l - 7 * m + 114) / 31)   // 1-indexed
  const day   = ((h + l - 7 * m + 114) % 31) + 1
  return new Date(Date.UTC(year, month - 1, day))          // UTC Date
}

/** Lunes siguiente a 'date' (Ley Emiliani) — usa UTC */
function nextMonday(date: Date): Date {
  const d   = new Date(date)
  const dow = d.getUTCDay()          // 0=Dom … 6=Sáb
  if (dow === 1) return d            // ya es lunes
  const diff = dow === 0 ? 1 : 8 - dow
  d.setUTCDate(d.getUTCDate() + diff)
  return d
}

/** Suma días — usa UTC */
function addDays(date: Date, days: number): Date {
  const d = new Date(date)
  d.setUTCDate(d.getUTCDate() + days)
  return d
}

/** Formatea Date a 'YYYY-MM-DD' usando UTC */
function fmt(d: Date): string {
  const y  = d.getUTCFullYear()
  const m  = String(d.getUTCMonth() + 1).padStart(2, '0')
  const dd = String(d.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${dd}`
}

/** Retorna Set con todas las fechas festivas en Colombia para el año dado */
export function getColombianHolidays(year: number): Set<string> {
  const easter   = getEaster(year)
  const holidays = new Set<string>()

  // ── Festivos FIJOS (no se mueven) ────────────────────────────
  ;[
    `${year}-01-01`, // Año Nuevo
    `${year}-05-01`, // Día del Trabajo
    `${year}-07-20`, // Grito de Independencia
    `${year}-08-07`, // Batalla de Boyacá
    `${year}-12-08`, // Inmaculada Concepción
    `${year}-12-25`, // Navidad
  ].forEach(d => holidays.add(d))

  // ── Semana Santa (relativos a Pascua, NO se mueven) ──────────
  holidays.add(fmt(addDays(easter, -3))) // Jueves Santo
  holidays.add(fmt(addDays(easter, -2))) // Viernes Santo

  // ── Festivos con Ley Emiliani (se mueven al lunes siguiente) ─
  // Todos los Date.UTC para evitar problemas de timezone
  ;[
    new Date(Date.UTC(year, 0, 6)),  // Reyes Magos — 6 Ene
    new Date(Date.UTC(year, 2, 19)), // San José — 19 Mar
    new Date(Date.UTC(year, 5, 29)), // San Pedro y San Pablo — 29 Jun
    new Date(Date.UTC(year, 7, 15)), // Asunción de la Virgen — 15 Ago
    new Date(Date.UTC(year, 9, 12)), // Día de la Raza — 12 Oct
    new Date(Date.UTC(year, 10, 1)), // Todos los Santos — 1 Nov
    new Date(Date.UTC(year, 10, 11)),// Independencia de Cartagena — 11 Nov
  ].forEach(d => holidays.add(fmt(nextMonday(d))))

  // ── Festivos relativos a Pascua con Ley Emiliani ─────────────
  holidays.add(fmt(nextMonday(addDays(easter, 39))))  // Ascensión del Señor
  holidays.add(fmt(nextMonday(addDays(easter, 60))))  // Corpus Christi
  holidays.add(fmt(nextMonday(addDays(easter, 61))))  // Sagrado Corazón de Jesús

  return holidays
}

/**
 * Verifica si una fecha (YYYY-MM-DD) es domingo o festivo en Colombia.
 * Usa UTC para evitar problemas de timezone.
 */
export function isBlockedDay(dateStr: string, holidaysSet: Set<string>): boolean {
  const [y, m, d] = dateStr.split('-').map(Number)
  const date = new Date(Date.UTC(y, m - 1, d))
  return date.getUTCDay() === 0 || holidaysSet.has(dateStr)
}

/** Etiqueta descriptiva del festivo (para mostrar en tooltips) */
export function getHolidayName(dateStr: string, year: number): string {
  const names: Record<string, string> = {
    [`${year}-01-01`]: 'Año Nuevo',
    [`${year}-05-01`]: 'Día del Trabajo',
    [`${year}-07-20`]: 'Independencia',
    [`${year}-08-07`]: 'Batalla de Boyacá',
    [`${year}-12-08`]: 'Inmaculada Concepción',
    [`${year}-12-25`]: 'Navidad',
  }
  return names[dateStr] ?? 'Festivo'
}
