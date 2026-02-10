import type { Group } from '../types/entities'
import { newId } from './id'

/**
 * Импорт групп из текстового файла (Word можно сохранить как .txt)
 * Ожидаемый формат: одна группа на строку
 */
export function importGroupsFromText(file: File): Promise<Group[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string
        const lines = text.split(/\r?\n/).map((line) => line.trim()).filter((line) => line.length > 0)

        const groups: Group[] = []

        for (const line of lines) {
          // Пропускаем заголовки и пустые строки
          if (line.match(/^(№|номер|группа|наименование)/i)) continue
          if (line.match(/^[А-Яа-я\s]+$/)) continue // Только русские буквы - вероятно заголовок

          // Ищем коды групп (формат: цифры + буквы + цифры.цифры.цифры)
          const groupCodeMatch = line.match(/(\d+[А-Яа-я]+\d+\.\d+\.\d+)/i)
          if (groupCodeMatch) {
            groups.push({
              id: newId('g'),
              name: groupCodeMatch[1],
            })
          } else if (line.length > 0 && !line.match(/^[А-Яа-я\s]+$/)) {
            // Если строка не пустая и не только русские буквы - возможно это код группы
            groups.push({
              id: newId('g'),
              name: line,
            })
          }
        }

        resolve(groups)
      } catch (error) {
        reject(new Error(`Ошибка при импорте групп из текста: ${error}`))
      }
    }
    reader.onerror = () => reject(new Error('Ошибка чтения файла'))
    reader.readAsText(file, 'UTF-8')
  })
}

