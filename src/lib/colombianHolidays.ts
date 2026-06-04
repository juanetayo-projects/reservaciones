/** Calcula la fecha de Pascua para un año dado (algoritmo de Computus) */
function getEaster(year: number): Date {
  const a = year % 19, b = Math.floor(year / 100), c = year % 100
  const d = Math.floor(b / 4), e = b % 4
  const f = Math.floor((b + 8) / 25)
  const g = Math.floor((b - f + 1) / 3)
  const h = (19 * a + b - d - g + 15) % 30
  const i = Math.floor(c / 4), k = c % 4
  const l = (32 + 2 * e + 2 * i - h - k) % 7
  const m = Math.floor((a + 11 * h + 22 * l) / 451)
  const month = Math.floor((h + l - 7 * m + 114) / 31)
  const day = ((h + l - 7 * m + 114) % 31) + 1
  return new Date(year, month - 1, day)
}

/** Si la fecha no es lunes, retorna el lunes siguiente (Ley Emiliani) */
function nextMonday(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  if (day === 1) return d
  d.setDate(d.getDate() + (day === 0 ? 1 : 8 - day))
  return d
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date); d.setDate(d.getDate() + days); return d
}

function fmt(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${dd}`
}

/** Retorna un Set con todas las fechas festivas de Colombia para el año indicado */
export function getColombianHolidays(year: number): Set<string> {
  const easter = getEaster(year)
  const holidays = new Set<string>()

  // Festivos fijos (no se mueven)
  ;[
    `${year}-01-01`, // Año Nuevo
    `${year}-05-01`, // Día del Trabajo
    `${year}-07-20`, // Grito de Independencia
    `${year}-08-07`, // Batalla de Boyacá
    `${year}-12-08`, // Inmaculada Concepción
    `${year}-12-25`, // Navidad
  ].forEach(d => holidays.add(d))

  // Semana Santa (relativos a Pascua, no se mueven)
  holidays.add(fmt(addDays(easter, -3))) // Jueves Santo
  holidays.add(fmt(addDays(easter, -2))) // Viernes Santo

  // Festivos con Ley Emiliani (se mueven al lunes siguiente)
  ;[
    new Date(year, 0, 6),   // Reyes Magos
    new Date(year, 2, 19),  // San José
    new Date(year, 5, 28),  // San Pedro y San Pablo (29 Jun → 28 para nextMonday)
    new Date(year, 7, 15),  // Asunción de la Virgen
    new Date(year, 9, 12),  // Día de la Raza
    new Date(year, 10, 1),  // Todos los Santos
    new Date(year, 10, 11), // Independencia de Cartagena
  ].forEach(d => holidays.add(fmt(nextMonday(d))))

  // Ascensión del Señor (39 días después de Pascua → lunes siguiente)
  holidays.add(fmt(nextMonday(addDays(easter, 39))))
  // Corpus Christi (60 días → lunes siguiente)
  holidays.add(fmt(nextMonday(addDays(easter, 60))))
  // Sagrado Corazón (61 días → lunes siguiente)
  holidays.add(fmt(nextMonday(addDays(easter, 61))))

  return holidays
}

/** Verifica si una fecha es domingo o festivo en Colombia */
export function isBlockedDay(dateStr: string, holidaysSet: Set<string>): boolean {
  const d = new Date(dateStr + 'T00:00:00')
  return d.getDay() === 0 || holidaysSet.has(dateStr)
}
