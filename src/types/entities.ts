export type EntityId = string

// Типы аудиторий из Excel: "комп" (компьютерная), "лекц" (лекционная), "ноут" (ноутбук)
export type RoomType = 'комп' | 'лекц' | 'ноут' | 'диз' | 'other'

export type Teacher = {
  id: EntityId
  number?: number // Номер по порядку (из Excel)
  fullName: string
  shortName?: string
  email?: string
  phone?: string
  isOnline?: boolean // Пометка "онлайн" из Excel
  notes?: string
}

export type Group = {
  id: EntityId
  name: string // e.g. "1ИТ1.9.25", "2Д1.9.24"
  faculty?: string
  size?: number
}

export type Room = {
  id: EntityId
  number: string // e.g. "301", "304a", "402"
  type: RoomType // Основной тип: "комп", "лекц", "ноут"
  additionalType?: string // Дополнительный тип, например "диз" (дизайн)
  capacity?: number // Вместимость: 24, 12 и т.д.
  equipment?: string[]
}

// Направление обучения (вкладки в Excel): "1 курс", "Маркетинг", "Дизайн", "ИСИП"
export type SubjectDirection = '1 курс' | 'Маркетинг' | 'Дизайн' | 'ИСИП'

export type Subject = {
  id: EntityId
  direction: SubjectDirection // Вкладка/направление
  name: string // "Предмет ITHUB" из Excel
  totalHours: number // "Часы" - общее количество часов
  hoursPerUnit: number // "Часы в" - часов в единицу (неделю/модуль)
  groups: string // "Группы" - строка с группами, например "1ИТП1.11.252"
  teacherName: string // "Преподаватель" - ФИО преподавателя
  week21?: string // "21 неделя" - дополнительная информация
  course?: string // Курс (если указан в Excel, например "3 курс DE", "3 курс .NET")
}

export type Weekday = 1 | 2 | 3 | 4 | 5 | 6 | 7

export type TimeSlot = {
  id: EntityId
  weekday: Weekday
  pairIndex: number // 1..N (пара в течение дня)
  start?: string // "09:00"
  end?: string // "10:30"
}

// Хотелки преподавателей - как в Excel: ФИО + текстовое описание пожеланий
export type TeacherPreference = {
  id: EntityId
  teacherFullName: string // ФИО преподавателя (из колонки "ФИО преподавателя")
  schedulePreference: string // Текстовое описание пожеланий (из колонки "Расписание")
  // Примеры: "ВТ 3-4 пары", "СР 1-3 пары", "ЧТ весь день", "Не занимать ВТ и ЧТ" и т.д.
  satisfaction?: number // Процент удовлетворенности (например, 90%)
}


