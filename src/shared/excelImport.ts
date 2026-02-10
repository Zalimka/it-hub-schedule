import * as XLSX from 'xlsx'
import type { Teacher, Room, Group, Subject, TeacherPreference, SubjectDirection } from '../types/entities'
import { newId } from './id'

/**
 * Импорт преподавателей из Excel
 * Ожидаемый формат: колонки "№", "ФИО", "онлайн" (опционально)
 */
export function importTeachersFromExcel(file: File): Promise<Teacher[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer)
        const workbook = XLSX.read(data, { type: 'array' })
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
        const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 }) as any[][]

        const teachers: Teacher[] = []
        
        // Пропускаем заголовок, начинаем с первой строки данных
        for (let i = 1; i < jsonData.length; i++) {
          const row = jsonData[i]
          if (!row || row.length === 0) continue

          // Пытаемся найти колонки по индексам или заголовкам
          const number = row[0] ? Number(row[0]) : undefined
          const fullName = String(row[1] || row[0] || '').trim() // Если нет колонки №, то первая колонка - ФИО
          const isOnline = String(row[2] || '').toLowerCase().includes('онлайн')

          if (fullName && fullName !== 'ФИО') {
            teachers.push({
              id: newId('t'),
              number: number || undefined,
              fullName,
              isOnline: isOnline || undefined,
            })
          }
        }

        resolve(teachers)
      } catch (error) {
        reject(new Error(`Ошибка при импорте преподавателей: ${error}`))
      }
    }
    reader.onerror = () => reject(new Error('Ошибка чтения файла'))
    reader.readAsArrayBuffer(file)
  })
}

/**
 * Импорт аудиторий из Excel
 * Ожидаемый формат: колонки "Номер", "Тип", "Доп. тип", "Вместимость"
 */
export function importRoomsFromExcel(file: File): Promise<Room[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer)
        const workbook = XLSX.read(data, { type: 'array' })
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
        const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 }) as any[][]

        const rooms: Room[] = []
        
        for (let i = 1; i < jsonData.length; i++) {
          const row = jsonData[i]
          if (!row || row.length === 0) continue

          const number = String(row[0] || row[1] || '').trim() // Номер может быть в первой или второй колонке
          const type = String(row[1] || row[2] || 'комп').trim() as Room['type']
          const additionalType = String(row[2] || row[3] || '').trim() || undefined
          const capacity = row[3] || row[4] ? Number(row[3] || row[4]) : undefined

          if (number && number !== 'Аудитории' && number !== 'Номер аудитории') {
            rooms.push({
              id: newId('r'),
              number,
              type: ['комп', 'лекц', 'ноут', 'диз'].includes(type) ? (type as Room['type']) : 'комп',
              additionalType: additionalType || undefined,
              capacity: capacity && !isNaN(capacity) ? capacity : undefined,
            })
          }
        }

        resolve(rooms)
      } catch (error) {
        reject(new Error(`Ошибка при импорте аудиторий: ${error}`))
      }
    }
    reader.onerror = () => reject(new Error('Ошибка чтения файла'))
    reader.readAsArrayBuffer(file)
  })
}

/**
 * Импорт групп из Excel
 * Ожидаемый формат: список кодов групп в одной колонке
 */
export function importGroupsFromExcel(file: File): Promise<Group[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer)
        const workbook = XLSX.read(data, { type: 'array' })
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
        const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 }) as any[][]

        const groups: Group[] = []
        
        for (let i = 0; i < jsonData.length; i++) {
          const row = jsonData[i]
          if (!row || row.length === 0) continue

          const name = String(row[0] || '').trim()
          
          if (name && name.length > 0 && !name.match(/^[А-Яа-я\s]+$/)) {
            // Если это не просто текст (заголовок), а код группы
            groups.push({
              id: newId('g'),
              name,
            })
          }
        }

        resolve(groups)
      } catch (error) {
        reject(new Error(`Ошибка при импорте групп: ${error}`))
      }
    }
    reader.onerror = () => reject(new Error('Ошибка чтения файла'))
    reader.readAsArrayBuffer(file)
  })
}

/**
 * Импорт дисциплин из Excel
 * Ожидаемый формат: вкладки по направлениям, колонки: Предмет, Часы, Часы в, Группы, Преподаватель, 21 неделя
 */
export function importSubjectsFromExcel(file: File): Promise<Subject[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer)
        const workbook = XLSX.read(data, { type: 'array' })
        const subjects: Subject[] = []

        // Обрабатываем каждую вкладку
        for (const sheetName of workbook.SheetNames) {
          const direction = mapSheetNameToDirection(sheetName)
          if (!direction) continue

          const sheet = workbook.Sheets[sheetName]
          const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][]

          for (let i = 1; i < jsonData.length; i++) {
            const row = jsonData[i]
            if (!row || row.length === 0) continue

            const name = String(row[0] || '').trim()
            // Пропускаем заголовки и пустые строки
            if (!name || 
                name === 'Предмет ITHUB' || 
                name === 'Предмет' ||
                name.toLowerCase().includes('предмет') ||
                name.length < 2) continue

            const totalHours = row[1] ? Number(row[1]) : 0
            const hoursPerUnit = row[2] ? Number(row[2]) : 0
            const groups = String(row[3] || '').trim()
            const teacherName = String(row[4] || '').trim()

            // Валидация: пропускаем строки без валидных данных
            // Должно быть хотя бы название предмета и (часы или группы или преподаватель)
            const hasValidData = name && name.length > 1 && (
              (totalHours > 0 || hoursPerUnit > 0) ||
              groups.length > 0 ||
              teacherName.length > 0
            )

            if (!hasValidData) {
              console.warn(`Пропущена невалидная строка в направлении "${direction}": ${name}`)
              continue
            }

            // Определяем курс из названия группы или текста в строке
            let course: string | undefined
            for (let j = 0; j < row.length; j++) {
              const cell = String(row[j] || '')
              if (cell.includes('курс')) {
                course = cell.trim()
                break
              }
            }

            subjects.push({
              id: newId('s'),
              direction,
              name,
              totalHours: totalHours || 0,
              hoursPerUnit: hoursPerUnit || 0,
              groups,
              teacherName,
              course,
            })
          }
        }

        resolve(subjects)
      } catch (error) {
        reject(new Error(`Ошибка при импорте дисциплин: ${error}`))
      }
    }
    reader.onerror = () => reject(new Error('Ошибка чтения файла'))
    reader.readAsArrayBuffer(file)
  })
}

/**
 * Импорт хотелок из Excel
 * Ожидаемый формат: колонки "ФИО преподавателя", "Расписание"
 */
export function importPreferencesFromExcel(file: File): Promise<TeacherPreference[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer)
        const workbook = XLSX.read(data, { type: 'array' })
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
        const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 }) as any[][]

        const preferences: TeacherPreference[] = []
        
        for (let i = 1; i < jsonData.length; i++) {
          const row = jsonData[i]
          if (!row || row.length === 0) continue

          const teacherFullName = String(row[0] || '').trim()
          const schedulePreference = String(row[1] || '').trim()

          if (teacherFullName && teacherFullName !== 'ФИО преподавателя') {
            preferences.push({
              id: newId('p'),
              teacherFullName,
              schedulePreference,
            })
          }
        }

        resolve(preferences)
      } catch (error) {
        reject(new Error(`Ошибка при импорте хотелок: ${error}`))
      }
    }
    reader.onerror = () => reject(new Error('Ошибка чтения файла'))
    reader.readAsArrayBuffer(file)
  })
}

/**
 * Маппинг названий вкладок Excel на направления
 */
function mapSheetNameToDirection(sheetName: string): SubjectDirection | null {
  const name = sheetName.toLowerCase().trim()
  if (name.includes('1 курс') || name.includes('первый')) return '1 курс'
  if (name.includes('маркетинг')) return 'Маркетинг'
  if (name.includes('дизайн')) return 'Дизайн'
  if (name.includes('исип') || name.includes('isip')) return 'ИСИП'
  return null
}

