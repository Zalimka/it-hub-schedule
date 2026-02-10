import * as XLSX from 'xlsx'
import type { Teacher, Room, Group, Subject, TeacherPreference, SubjectDirection } from '../types/entities'
import { importTeachersFromExcel, importRoomsFromExcel, importGroupsFromExcel, importSubjectsFromExcel, importPreferencesFromExcel } from './excelImport'

/**
 * Массовый импорт всех данных из одного Excel файла
 * Ожидает файл с несколькими вкладками или одним листом со всеми данными
 */
export async function bulkImportFromExcel(
  file: File,
): Promise<{
  teachers: Teacher[]
  rooms: Room[]
  groups: Group[]
  subjects: Subject[]
  preferences: TeacherPreference[]
}> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = async (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer)
        const workbook = XLSX.read(data, { type: 'array' })
  const sheetNames = workbook.SheetNames

  const result = {
    teachers: [] as Teacher[],
    rooms: [] as Room[],
    groups: [] as Group[],
    subjects: [] as Subject[],
    preferences: [] as TeacherPreference[],
  }

  // Пытаемся определить, какие данные в каких вкладках
  for (const sheetName of sheetNames) {
    const sheet = workbook.Sheets[sheetName]
    const firstRow = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' })[0] as any[]

    if (!firstRow || firstRow.length === 0) continue

    const firstRowText = firstRow.join(' ').toLowerCase()

    // Определяем тип данных по заголовкам
    if (
      firstRowText.includes('фио') &&
      (firstRowText.includes('преподаватель') || firstRowText.includes('№'))
    ) {
      // Преподаватели
      try {
        const teachers = await importTeachersFromExcel(file)
        result.teachers.push(...teachers)
      } catch (e) {
        console.warn(`Не удалось импортировать преподавателей из "${sheetName}":`, e)
      }
    } else if (
      firstRowText.includes('аудитор') ||
      firstRowText.includes('номер') ||
      firstRowText.includes('тип') ||
      firstRowText.includes('вместимость')
    ) {
      // Аудитории
      try {
        const rooms = await importRoomsFromExcel(file)
        result.rooms.push(...rooms)
      } catch (e) {
        console.warn(`Не удалось импортировать аудитории из "${sheetName}":`, e)
      }
    } else if (
      firstRowText.includes('предмет') ||
      firstRowText.includes('дисциплина') ||
      firstRowText.includes('часы') ||
      firstRowText.includes('групп')
    ) {
      // Дисциплины
      try {
        const subjects = await importSubjectsFromExcel(file)
        result.subjects.push(...subjects)
      } catch (e) {
        console.warn(`Не удалось импортировать дисциплины из "${sheetName}":`, e)
      }
    } else if (
      firstRowText.includes('расписание') ||
      firstRowText.includes('хотелк') ||
      firstRowText.includes('пожелани')
    ) {
      // Хотелки
      try {
        const preferences = await importPreferencesFromExcel(file)
        result.preferences.push(...preferences)
      } catch (e) {
        console.warn(`Не удалось импортировать хотелки из "${sheetName}":`, e)
      }
    } else {
      // Пытаемся определить по содержимому
      const allData = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][]
      
      // Если первая колонка содержит коды групп (например, 1ИТ1.9.25)
      if (allData.some((row) => row[0] && String(row[0]).match(/^\d+[А-Яа-я]+\d+\.\d+\.\d+/))) {
        try {
          const groups = await importGroupsFromExcel(file)
          result.groups.push(...groups)
        } catch (e) {
          console.warn(`Не удалось импортировать группы из "${sheetName}":`, e)
        }
      }
    }
  }

  // Удаляем дубликаты
  result.teachers = Array.from(
    new Map(result.teachers.map((t) => [t.fullName.toLowerCase(), t])).values(),
  )
  result.rooms = Array.from(
    new Map(result.rooms.map((r) => [r.number.toLowerCase(), r])).values(),
  )
  result.groups = Array.from(
    new Map(result.groups.map((g) => [g.name.toLowerCase(), g])).values(),
  )
  result.subjects = Array.from(
    new Map(
      result.subjects.map((s) => [`${s.direction}:${s.name.toLowerCase()}`, s]),
    ).values(),
  )
  result.preferences = Array.from(
    new Map(
      result.preferences.map((p) => [p.teacherFullName.toLowerCase(), p]),
    ).values(),
  )

        resolve(result)
      } catch (error) {
        reject(error)
      }
    }
    reader.onerror = () => reject(new Error('Ошибка чтения файла'))
    reader.readAsArrayBuffer(file)
  })
}

