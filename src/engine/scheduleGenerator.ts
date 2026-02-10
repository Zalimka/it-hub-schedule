import type { Teacher, Group, Subject, Room, TeacherPreference } from '../types/entities'
import { newId } from '../shared/id'
import type { SemesterSchedule, Lesson } from '../types/schedule'

/**
 * Входные данные для генерации расписания
 */
export type GenerationInput = {
  teachers: Teacher[]
  groups: Group[]
  subjects: Subject[]
  rooms: Room[]
  preferences: TeacherPreference[]
  semesterWeeks: number // Количество недель в семестре (например, 21)
}

/**
 * Результат генерации
 */
export type GenerationResult = {
  schedule: SemesterSchedule
  stats: {
    totalLessons: number
    satisfiedPreferences: number
    totalPreferences: number
    conflicts: number
    satisfactionRate: number // Процент удовлетворенности пожеланий
  }
}

/**
 * Простой алгоритм генерации расписания (жадная эвристика)
 * 
 * Алгоритм:
 * 1. Для каждой группы создаем расписание на неделю
 * 2. Распределяем дисциплины группы по дням и парам
 * 3. Учитываем пожелания преподавателей
 * 4. Проверяем конфликты (преподаватель, группа)
 * 5. Повторяем для всех недель семестра
 */
export function generateSchedule(input: GenerationInput): GenerationResult {
  const { teachers, groups, subjects, rooms, preferences, semesterWeeks } = input

  // Создаем структуру расписания
  const weeklySchedules: SemesterSchedule['weeks'] = []
  const allLessons: Lesson[] = []

  // Маппинг для быстрого поиска
  const teacherMap = new Map(teachers.map((t) => [t.fullName.toLowerCase().trim(), t]))
  const preferenceMap = new Map(
    preferences.map((p) => [p.teacherFullName.toLowerCase().trim(), p]),
  )

  // Дни недели: ПН=1, ВТ=2, СР=3, ЧТ=4, ПТ=5
  const weekdays = [1, 2, 3, 4, 5]
  const pairsPerDay = 4 // 4 пары в день

  let satisfiedCount = 0
  let totalPreferencesCount = 0
  let conflictsCount = 0

  // Улучшенное сопоставление групп: разбиваем по запятым, пробелам, ищем частичные совпадения
  function findGroupInSubjectGroups(groupName: string, subjectGroups: string): boolean {
    const groupNameLower = groupName.toLowerCase().trim()
    const subjectGroupsLower = subjectGroups.toLowerCase()
    
    // Прямое совпадение
    if (subjectGroupsLower === groupNameLower) return true
    
    // Поиск в строке (может быть через запятую, пробел и т.д.)
    // Разбиваем subjectGroups по разделителям
    const separators = [',', ' ', ';', '\n', '\t']
    let parts = [subjectGroupsLower]
    for (const sep of separators) {
      parts = parts.flatMap(p => p.split(sep)).map(p => p.trim()).filter(p => p.length > 0)
    }
    
    // Проверяем точное совпадение в частях
    if (parts.includes(groupNameLower)) return true
    
    // Проверяем частичное совпадение (группа содержится в части)
    for (const part of parts) {
      if (part.includes(groupNameLower) || groupNameLower.includes(part)) {
        return true
      }
    }
    
    // Проверяем, содержит ли строка название группы
    if (subjectGroupsLower.includes(groupNameLower)) return true
    
    return false
  }

  // Улучшенное сопоставление преподавателей
  function findTeacher(teacherName: string): Teacher | null {
    const teacherNameLower = teacherName.toLowerCase().trim()
    
    // Точное совпадение
    let teacher = teacherMap.get(teacherNameLower)
    if (teacher) return teacher
    
    // Частичное совпадение - ищем по фамилии или началу ФИО
    const teacherNameParts = teacherNameLower.split(/\s+/).filter(p => p.length > 0)
    if (teacherNameParts.length > 0) {
      const firstName = teacherNameParts[0] // Фамилия
      for (const [key, t] of teacherMap.entries()) {
        const keyParts = key.split(/\s+/)
        if (keyParts[0] === firstName || key.includes(firstName) || firstName.includes(keyParts[0])) {
          return t
        }
      }
    }
    
    // Последняя попытка - ищем любое частичное совпадение
    for (const [key, t] of teacherMap.entries()) {
      if (key.includes(teacherNameLower) || teacherNameLower.includes(key)) {
        return t
      }
    }
    
    return null
  }

  // Проходим по неделям
  for (let week = 1; week <= semesterWeeks; week++) {
    const weekLessons: Lesson[] = []
    // Матрица занятости: [weekday][pair] = занято ли
    const occupiedSlots = new Map<string, boolean>()

    // Проходим по группам
    for (const group of groups) {
      // Находим дисциплины для этой группы (улучшенное сопоставление)
      const groupSubjects = subjects.filter((s) => {
        return findGroupInSubjectGroups(group.name, s.groups)
      })

      if (groupSubjects.length === 0) {
        console.log(`Группа ${group.name} не найдена в дисциплинах. Проверьте поле "Группы" в дисциплинах.`)
        continue
      }

      // Распределяем дисциплины по дням недели
      for (const subject of groupSubjects) {
        // Вычисляем, сколько пар нужно в неделю (часы в неделю / 2 часа на пару)
        const pairsPerWeek = Math.max(1, Math.ceil(subject.hoursPerUnit / 2))

        // Находим преподавателя (улучшенное сопоставление)
        const teacher = findTeacher(subject.teacherName)

        if (!teacher) {
          console.warn(`⚠️ Преподаватель не найден: "${subject.teacherName}" для дисциплины "${subject.name}". Проверьте ФИО в списке преподавателей.`)
          // НЕ ПРОПУСКАЕМ - создаем занятие без преподавателя (можно будет исправить вручную)
          // Но лучше пропустить, чтобы не создавать некорректные данные
          continue
        }

        // Получаем пожелания преподавателя
        const preference = preferenceMap.get(teacher.fullName.toLowerCase().trim())
        if (preference) totalPreferencesCount++

        // Пытаемся разместить пары для этой дисциплины
        // Сначала собираем ВСЕ возможные слоты (и с пожеланиями, и без)
        const candidateSlots: Array<{ weekday: number; pair: number; satisfiesPreference: boolean; violatesPreference: boolean }> = []

        for (const weekday of weekdays) {
          for (let pair = 1; pair <= pairsPerDay; pair++) {
            const slotKey = `${week}-${weekday}-${pair}-${teacher.id}`
            const groupSlotKey = `${week}-${weekday}-${pair}-${group.id}`

            // Пропускаем занятые слоты
            if (occupiedSlots.get(slotKey) || occupiedSlots.get(groupSlotKey)) {
              conflictsCount++
              continue
            }

            let satisfiesPreference = false
            let violatesPreference = false

            if (preference) {
              const prefText = preference.schedulePreference.toLowerCase()
              const dayNames = ['пн', 'вт', 'ср', 'чт', 'пт']
              const dayName = dayNames[weekday - 1]

              // Проверяем жесткие ограничения (нельзя нарушать)
              if (prefText.includes(`не занимать ${dayName}`) || prefText.includes(`кроме ${dayName}`)) {
                violatesPreference = true
              }

              // Проверяем "Только X"
              if (prefText.includes('только')) {
                const onlyDays = dayNames.filter((d) => prefText.includes(d))
                if (onlyDays.length > 0 && !onlyDays.includes(dayName)) {
                  violatesPreference = true
                } else if (onlyDays.length > 0 && onlyDays.includes(dayName)) {
                  satisfiesPreference = true
                }
              }

              // Проверяем пары
              if (prefText.includes('только 1-2 пары')) {
                if (pair > 2) violatesPreference = true
                else satisfiesPreference = true
              }
              if (prefText.includes('только 3-4 пары')) {
                if (pair <= 2) violatesPreference = true
                else satisfiesPreference = true
              }
              if (prefText.includes('только 1 пара')) {
                if (pair !== 1) violatesPreference = true
                else satisfiesPreference = true
              }
              if (prefText.includes('только 4 пары')) {
                if (pair !== 4) violatesPreference = true
                else satisfiesPreference = true
              }

              // Если нет жестких ограничений, но есть пожелание - считаем удовлетворительным
              if (!violatesPreference && prefText.length > 0) {
                satisfiesPreference = true
              }
            } else {
              // Нет пожеланий - любой слот подходит
              satisfiesPreference = true
            }

            // Добавляем слот (даже если нарушает пожелание - лучше создать занятие, чем ничего)
            candidateSlots.push({ weekday, pair, satisfiesPreference, violatesPreference })
          }
        }

        // Сортируем: сначала слоты, удовлетворяющие пожеланиям, потом остальные, в конце нарушающие
        candidateSlots.sort((a, b) => {
          if (a.satisfiesPreference && !b.satisfiesPreference) return -1
          if (!a.satisfiesPreference && b.satisfiesPreference) return 1
          if (a.violatesPreference && !b.violatesPreference) return 1
          if (!a.violatesPreference && b.violatesPreference) return -1
          return 0
        })

        // Размещаем пары, отдавая приоритет лучшим слотам
        let placedPairs = 0
        for (const slot of candidateSlots) {
          if (placedPairs >= pairsPerWeek) break

          const slotKey = `${week}-${slot.weekday}-${slot.pair}-${teacher.id}`
          const groupSlotKey = `${week}-${slot.weekday}-${slot.pair}-${group.id}`

          // Двойная проверка (на случай, если слот занят другим занятием)
          if (occupiedSlots.get(slotKey) || occupiedSlots.get(groupSlotKey)) {
            continue
          }

          // Находим подходящую аудиторию
          const suitableRoom = rooms[0]
          if (!suitableRoom) {
            console.warn('Нет доступных аудиторий')
            continue
          }

          // Создаем занятие (даже если нарушает пожелание - лучше создать, чем ничего)
          const lesson: Lesson = {
            id: newId('l'),
            weekIndex: week,
            weekday: slot.weekday,
            pairIndex: slot.pair,
            subjectId: subject.id,
            groupId: group.id,
            teacherId: teacher.id,
            roomId: suitableRoom.id,
          }

          allLessons.push(lesson)
          weekLessons.push(lesson)
          occupiedSlots.set(slotKey, true)
          occupiedSlots.set(groupSlotKey, true)
          placedPairs++

          // Если пожелание выполнено, увеличиваем счетчик
          if (slot.satisfiesPreference && preference && !slot.violatesPreference) {
            satisfiedCount++
          }
        }

        if (placedPairs === 0 && pairsPerWeek > 0) {
          console.warn(`⚠️ Не удалось разместить ни одной пары для дисциплины "${subject.name}" группы "${group.name}"`)
        }
      }
    }

    weeklySchedules.push({
      id: newId('w'),
      weekIndex: week,
      lessons: weekLessons,
    })
  }

  const schedule: SemesterSchedule = {
    id: newId('sched'),
    semesterLabel: '2 семестр 2025-26',
    weeks: weeklySchedules,
  }

  const satisfactionRate =
    totalPreferencesCount > 0
      ? Math.round((satisfiedCount / totalPreferencesCount) * 100)
      : 100

  return {
    schedule,
    stats: {
      totalLessons: allLessons.length,
      satisfiedPreferences: satisfiedCount,
      totalPreferences: totalPreferencesCount,
      conflicts: conflictsCount,
      satisfactionRate,
    },
  }
}

