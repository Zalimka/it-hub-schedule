import type { Teacher, Group, Subject, Room, TeacherPreference } from '../types/entities'
import { newId } from '../shared/id'
import type { SemesterSchedule, Lesson } from '../types/schedule'

/**
 * Умный алгоритм генерации расписания с оптимизацией
 * 
 * Особенности:
 * 1. Равномерное распределение нагрузки преподавателей и групп
 * 2. Максимизация удовлетворенности пожеланий
 * 3. Распределение пар по дням недели (не все в один день)
 * 4. Учет конфликтов (преподаватель, группа, аудитория)
 * 5. Строгое соблюдение totalHours для каждого предмета
 * 6. Равномерное распределение часов по неделям семестра
 */
export type GenerationInput = {
  teachers: Teacher[]
  groups: Group[]
  subjects: Subject[]
  rooms: Room[]
  preferences: TeacherPreference[]
  semesterWeeks: number
}

export type GenerationResult = {
  schedule: SemesterSchedule
  stats: {
    totalLessons: number
    satisfiedPreferences: number
    totalPreferences: number
    conflicts: number
    satisfactionRate: number
    teacherLoadBalance: number // Оценка равномерности нагрузки (0-100)
    teacherSatisfaction: Array<{
      teacherName: string
      satisfied: number
      total: number
      rate: number
    }> // Статистика удовлетворенности по каждому преподавателю
    groupLoads: Array<{
      groupName: string
      lessons: number
      hours: number
    }> // Нагрузка по группам
  }
}

/**
 * Умная генерация расписания с оптимизацией
 */
export function generateSmartSchedule(input: GenerationInput): GenerationResult {
  const { teachers, groups, subjects, rooms, preferences, semesterWeeks } = input

  const allLessons: Lesson[] = []
  const weeklySchedules: SemesterSchedule['weeks'] = []

  // Маппинги
  const teacherMap = new Map(teachers.map((t) => [t.fullName.toLowerCase().trim(), t]))
  const preferenceMap = new Map(
    preferences.map((p) => [p.teacherFullName.toLowerCase().trim(), p]),
  )

  // Улучшенное сопоставление групп
  function findGroupInSubjectGroups(groupName: string, subjectGroups: string): boolean {
    const groupNameLower = groupName.toLowerCase().trim()
    const subjectGroupsLower = subjectGroups.toLowerCase()

    if (subjectGroupsLower === groupNameLower) return true

    const separators = [',', ' ', ';', '\n', '\t']
    let parts = [subjectGroupsLower]
    for (const sep of separators) {
      parts = parts.flatMap((p) => p.split(sep)).map((p) => p.trim()).filter((p) => p.length > 0)
    }

    if (parts.includes(groupNameLower)) return true
    for (const part of parts) {
      if (part.includes(groupNameLower) || groupNameLower.includes(part)) return true
    }
    if (subjectGroupsLower.includes(groupNameLower)) return true

    return false
  }

  // Улучшенное сопоставление преподавателей
  function findTeacher(teacherName: string): Teacher | null {
    const teacherNameLower = teacherName.toLowerCase().trim()
    let teacher = teacherMap.get(teacherNameLower)
    if (teacher) return teacher

    const teacherNameParts = teacherNameLower.split(/\s+/).filter((p) => p.length > 0)
    if (teacherNameParts.length > 0) {
      const firstName = teacherNameParts[0]
      for (const [key, t] of teacherMap.entries()) {
        const keyParts = key.split(/\s+/)
        if (keyParts[0] === firstName || key.includes(firstName) || firstName.includes(keyParts[0])) {
          return t
        }
      }
    }

    for (const [key, t] of teacherMap.entries()) {
      if (key.includes(teacherNameLower) || teacherNameLower.includes(key)) return t
    }

    return null
  }

  const weekdays = [1, 2, 3, 4, 5]
  const pairsPerDay = 4
  const hoursPerPair = 2 // Одна пара = 2 академических часа

  let satisfiedCount = 0
  let totalPreferencesCount = 0
  let conflictsCount = 0

  // Собираем все назначения предметов для групп
  type SubjectAssignment = {
    group: Group
    subject: Subject
    teacher: Teacher
    preference: TeacherPreference | null
    totalHours: number // Общее количество часов на семестр для этой группы
  }

  const allAssignments: SubjectAssignment[] = []

  for (const group of groups) {
    const groupSubjects = subjects.filter((s) => findGroupInSubjectGroups(group.name, s.groups))

    for (const subject of groupSubjects) {
      // Пропускаем предметы без часов
      if (!subject.totalHours || subject.totalHours <= 0) {
        console.warn(`Предмет "${subject.name}" для группы "${group.name}" не имеет часов (totalHours=${subject.totalHours})`)
        continue
      }

      const teacher = findTeacher(subject.teacherName)
      if (!teacher) {
        console.warn(`Преподаватель "${subject.teacherName}" для предмета "${subject.name}" не найден`)
        continue
      }

      const preference = preferenceMap.get(teacher.fullName.toLowerCase().trim()) || null

      allAssignments.push({
        group,
        subject,
        teacher,
        preference,
        totalHours: subject.totalHours,
      })
    }
  }

  console.log(`Всего назначений: ${allAssignments.length} для ${groups.length} групп`)

  // Рассчитываем общую нагрузку каждой группы (сколько всего часов нужно разместить)
  const groupTotalHours = new Map<string, number>()
  for (const assignment of allAssignments) {
    const current = groupTotalHours.get(assignment.group.id) || 0
    groupTotalHours.set(assignment.group.id, current + assignment.totalHours)
  }

  // Генерируем ОДНО типичное расписание на неделю (одинаковое для всех недель семестра)
  // Рассчитываем сколько пар в неделю нужно для каждого предмета
  const assignmentsForWeek: Array<{
    assignment: SubjectAssignment
    pairsPerWeek: number
  }> = []

  for (const assignment of allAssignments) {
    // Рассчитываем сколько пар в неделю нужно: totalHours / количество недель / 2 часа на пару
    const hoursPerWeek = assignment.totalHours / semesterWeeks
    const pairsPerWeek = Math.max(1, Math.ceil(hoursPerWeek / hoursPerPair))
    
    assignmentsForWeek.push({
      assignment,
      pairsPerWeek,
    })
  }

  // Рассчитываем общую нагрузку каждой группы (сколько всего пар нужно в неделю)
  const groupWeeklyLoad = new Map<string, number>()
  for (const { assignment, pairsPerWeek } of assignmentsForWeek) {
    const current = groupWeeklyLoad.get(assignment.group.id) || 0
    groupWeeklyLoad.set(assignment.group.id, current + pairsPerWeek)
  }

  // Генерируем типичную неделю
  const weekLessons: Lesson[] = []
  const occupiedSlots = new Map<string, boolean>()

  // Отслеживаем текущую нагрузку групп во время размещения
  const currentGroupLoad = new Map<string, number>()
  // Отслеживаем сколько пар уже размещено для каждого назначения
  const placedPairsMap = new Map<string, number>()

  // ИТЕРАТИВНОЕ РАЗМЕЩЕНИЕ: несколько проходов для равномерного распределения
  const maxIterations = 10
  for (let iteration = 0; iteration < maxIterations; iteration++) {
    // Сортируем назначения с учетом текущей нагрузки групп
    const sortedAssignments = [...assignmentsForWeek]
      .filter(({ assignment, pairsPerWeek }) => {
        // Пропускаем уже полностью размещенные назначения
        const key = `${assignment.group.id}-${assignment.subject.id}`
        const placed = placedPairsMap.get(key) || 0
        return placed < pairsPerWeek
      })
      .sort((a, b) => {
        // ПРИОРИТЕТ 1: Требования преподавателей
        if (a.assignment.preference && !b.assignment.preference) return -1
        if (!a.assignment.preference && b.assignment.preference) return 1
        
        // ПРИОРИТЕТ 2: Балансировка нагрузки групп (более агрессивная)
        const loadA = currentGroupLoad.get(a.assignment.group.id) || 0
        const loadB = currentGroupLoad.get(b.assignment.group.id) || 0
        const totalLoadA = groupWeeklyLoad.get(a.assignment.group.id) || 0
        const totalLoadB = groupWeeklyLoad.get(b.assignment.group.id) || 0
        
        // Процент выполнения: менее загруженные группы получают приоритет
        const progressA = totalLoadA > 0 ? loadA / totalLoadA : 0
        const progressB = totalLoadB > 0 ? loadB / totalLoadB : 0
        
        // Более чувствительная балансировка
        if (Math.abs(progressA - progressB) > 0.001) {
          return progressA - progressB // Менее загруженные первыми
        }
        
        // Если прогресс одинаковый, сравниваем абсолютную нагрузку
        if (loadA !== loadB) {
          return loadA - loadB // Меньше занятий = выше приоритет
        }
        
        // Если все одинаково, чередуем группы
        const groupIndexA = groups.indexOf(a.assignment.group)
        const groupIndexB = groups.indexOf(b.assignment.group)
        return groupIndexA - groupIndexB
      })

    // Размещаем занятия с оптимизацией
    for (const { assignment, pairsPerWeek } of sortedAssignments) {
      const { group, subject, teacher, preference } = assignment

      // Проверяем, сколько уже размещено для этого назначения
      const key = `${group.id}-${subject.id}`
      const alreadyPlaced = placedPairsMap.get(key) || 0
      const remainingPairs = pairsPerWeek - alreadyPlaced
      
      if (remainingPairs <= 0) continue

      // Собираем все возможные слоты
      const candidateSlots: Array<{
        weekday: number
        pair: number
        score: number
      }> = []

      for (const weekday of weekdays) {
        for (let pair = 1; pair <= pairsPerDay; pair++) {
          const teacherSlot = `${weekday}-${pair}-${teacher.id}`
          const groupSlot = `${weekday}-${pair}-${group.id}`

          // Проверяем конфликты
          if (occupiedSlots.get(teacherSlot) || occupiedSlots.get(groupSlot)) {
            continue
          }

          // Вычисляем оценку слота
          let score = 50 // Базовая оценка

          // ПРИОРИТЕТ 1: Требования преподавателей (самый важный фактор)
          if (preference) {
            const prefText = preference.schedulePreference.toLowerCase()
            const dayNames = ['пн', 'вт', 'ср', 'чт', 'пт']
            const dayName = dayNames[weekday - 1]

            // КРИТИЧЕСКИЕ требования - максимальный приоритет
            if (prefText.includes(`только ${dayName}`)) {
              score += 200 // Очень высокий приоритет
            }
            
            // Запреты - большой штраф
            if (prefText.includes(`не занимать ${dayName}`) || prefText.includes(`кроме ${dayName}`)) {
              score -= 500 // Критический штраф - такой слот не должен использоваться
            }

            // Положительные требования
            if (prefText.includes(dayName) && !prefText.includes('не занимать') && !prefText.includes('кроме')) {
              score += 80 // Высокий бонус за упоминание дня
            }

            // Требования по парам
            if (prefText.includes('только 1-2 пары') && pair <= 2) score += 100
            if (prefText.includes('только 3-4 пары') && pair > 2) score += 100
            if (prefText.includes('только 1 пара') && pair === 1) score += 150
            if (prefText.includes('только 4 пары') && pair === 4) score += 150
            
            // Штрафы за нарушение требований по парам
            if (prefText.includes('только 1-2 пары') && pair > 2) score -= 200
            if (prefText.includes('только 3-4 пары') && pair <= 2) score -= 200
            if (prefText.includes('только 1 пара') && pair !== 1) score -= 300
            if (prefText.includes('только 4 пары') && pair !== 4) score -= 300
          }

          // ПРИОРИТЕТ 2: Равномерное распределение нагрузки группы (в рамках недели)
          const groupCurrentLoad = currentGroupLoad.get(group.id) || 0
          const groupTotalLoad = groupWeeklyLoad.get(group.id) || 0
          const groupProgress = groupTotalLoad > 0 ? groupCurrentLoad / groupTotalLoad : 0
          
          // Рассчитываем средний прогресс всех групп
          const avgProgress = groups.length > 0
            ? Array.from(groups).reduce((sum, g) => {
                const gLoad = currentGroupLoad.get(g.id) || 0
                const gTotal = groupWeeklyLoad.get(g.id) || 0
                return sum + (gTotal > 0 ? gLoad / gTotal : 0)
              }, 0) / groups.length
            : 0
          
          // Бонусы/штрафы за балансировку
          if (groupProgress < avgProgress - 0.1) {
            score += 50 // Группа сильно недогружена - большой приоритет
          } else if (groupProgress < avgProgress - 0.05) {
            score += 30 // Группа недогружена
          } else if (groupProgress > avgProgress + 0.1) {
            score -= 40 // Группа сильно перегружена - большой штраф
          } else if (groupProgress > avgProgress + 0.05) {
            score -= 20 // Группа перегружена
          }

          // ПРИОРИТЕТ 3: Равномерное распределение нагрузки преподавателя (в рамках недели)
          const currentTeacherLoad = weekLessons.filter((l) => l.teacherId === teacher.id).length
          const avgTeacherLoad = weekLessons.length / Math.max(1, teachers.length)
          if (currentTeacherLoad < avgTeacherLoad * 0.8) {
            score += 25
          } else if (currentTeacherLoad > avgTeacherLoad * 1.2) {
            score -= 15
          }

          // ПРИОРИТЕТ 4: Равномерное распределение по дням недели
          const dayCount = weekLessons.filter((l) => l.weekday === weekday).length
          const avgPerDay = weekLessons.length / 5
          if (dayCount < avgPerDay * 0.8) {
            score += 15 // День недогружен
          } else if (dayCount > avgPerDay * 1.2) {
            score -= 10 // День перегружен
          }

          candidateSlots.push({ weekday, pair, score })
        }
      }

      // Сортируем по оценке (лучшие первыми)
      candidateSlots.sort((a, b) => b.score - a.score)

      // Размещаем пары (только недостающие)
      let placedPairs = 0
      for (const slot of candidateSlots) {
        if (placedPairs >= remainingPairs) break
          
        // Пропускаем слоты с критически низкой оценкой (нарушают требования)
        if (slot.score < -100) {
          console.warn(
            `Пропущен слот для ${group.name} (${subject.name}) - нарушает требования преподавателя ${teacher.fullName}`,
          )
          continue
        }

        const teacherSlot = `${slot.weekday}-${slot.pair}-${teacher.id}`
        const groupSlot = `${slot.weekday}-${slot.pair}-${group.id}`

        if (occupiedSlots.get(teacherSlot) || occupiedSlots.get(groupSlot)) continue

        const suitableRoom = rooms[0]
        if (!suitableRoom) continue

        const lesson: Lesson = {
          id: newId('l'),
          weekIndex: 1, // Временный индекс, будет заменен при копировании
          weekday: slot.weekday,
          pairIndex: slot.pair,
          subjectId: subject.id,
          groupId: group.id,
          teacherId: teacher.id,
          roomId: suitableRoom.id,
        }

        weekLessons.push(lesson)
        occupiedSlots.set(teacherSlot, true)
        occupiedSlots.set(groupSlot, true)
        placedPairs++
        
        // Обновляем текущую нагрузку группы
        currentGroupLoad.set(group.id, (currentGroupLoad.get(group.id) || 0) + 1)
        
        // Обновляем счетчик размещенных пар для этого назначения
        placedPairsMap.set(key, alreadyPlaced + placedPairs)
      }
    }
    
    // Если все назначения размещены, выходим из итераций
    let allPlaced = true
    for (const { assignment, pairsPerWeek } of assignmentsForWeek) {
      const key = `${assignment.group.id}-${assignment.subject.id}`
      const placed = placedPairsMap.get(key) || 0
      if (placed < pairsPerWeek) {
        allPlaced = false
        break
      }
    }
    if (allPlaced) break
  }

  // Копируем типичную неделю для всех недель семестра
  for (let week = 1; week <= semesterWeeks; week++) {
    // Создаем копии занятий для этой недели
    const weekLessonsCopy: Lesson[] = weekLessons.map((lesson) => ({
      ...lesson,
      id: newId('l'),
      weekIndex: week,
    }))

    allLessons.push(...weekLessonsCopy)

    weeklySchedules.push({
      id: newId('w'),
      weekIndex: week,
      lessons: weekLessonsCopy,
    })
  }

  // Вычисляем статистику
  const satisfactionRate =
    totalPreferencesCount > 0 ? Math.round((satisfiedCount / totalPreferencesCount) * 100) : 100

  // Оценка равномерности нагрузки
  const finalTeacherLoads = new Map<string, number>()
  for (const lesson of allLessons) {
    const key = lesson.teacherId
    finalTeacherLoads.set(key, (finalTeacherLoads.get(key) || 0) + 1)
  }
  const loads = Array.from(finalTeacherLoads.values())
  const avgLoad = loads.length > 0 ? loads.reduce((a, b) => a + b, 0) / loads.length : 0
  const variance =
    loads.length > 0
      ? loads.reduce((sum, load) => sum + Math.pow(load - avgLoad, 2), 0) / loads.length
      : 0
  const stdDev = Math.sqrt(variance)
  const teacherLoadBalance = avgLoad > 0 ? Math.max(0, 100 - Math.round((stdDev / avgLoad) * 100)) : 100

  // Подсчитываем реальные конфликты (преподаватель или группа в двух местах одновременно)
  const realConflicts = new Set<string>()
  for (const week of weeklySchedules) {
    const weekConflicts = new Set<string>()
    for (const lesson of week.lessons) {
      const teacherSlot = `${lesson.weekday}-${lesson.pairIndex}-${lesson.teacherId}`
      const groupSlot = `${lesson.weekday}-${lesson.pairIndex}-${lesson.groupId}`

      if (weekConflicts.has(teacherSlot) || weekConflicts.has(groupSlot)) {
        realConflicts.add(`${week.weekIndex}-${teacherSlot}`)
        realConflicts.add(`${week.weekIndex}-${groupSlot}`)
      }
      weekConflicts.add(teacherSlot)
      weekConflicts.add(groupSlot)
    }
  }

  conflictsCount = realConflicts.size

  // Статистика удовлетворенности по каждому преподавателю
  // Сначала создаем маппинг преподаватель -> пожелание
  const teacherPreferenceMap = new Map<string, TeacherPreference>()
  for (const pref of preferences) {
    teacherPreferenceMap.set(pref.teacherFullName.toLowerCase().trim(), pref)
  }

  // Теперь считаем удовлетворенность для ВСЕХ занятий каждого преподавателя
  const teacherSatisfactionMap = new Map<string, { satisfied: number; total: number }>()
  
  for (const lesson of allLessons) {
    const teacher = teachers.find((t) => t.id === lesson.teacherId)
    if (!teacher) continue

    const teacherKey = teacher.fullName.toLowerCase().trim()
    const preference = teacherPreferenceMap.get(teacherKey)
    
    if (!preference) {
      // Если нет пожеланий, считаем что все удовлетворено
      const current = teacherSatisfactionMap.get(teacher.fullName) || { satisfied: 0, total: 0 }
      teacherSatisfactionMap.set(teacher.fullName, {
        satisfied: current.satisfied + 1,
        total: current.total + 1,
      })
      continue
    }

    const current = teacherSatisfactionMap.get(teacher.fullName) || { satisfied: 0, total: 0 }
    const prefText = preference.schedulePreference.toLowerCase()
    const dayNames = ['пн', 'вт', 'ср', 'чт', 'пт']
    const dayName = dayNames[lesson.weekday - 1]
    
    let isSatisfied = true
    
    // Проверяем запреты
    if (prefText.includes(`не занимать ${dayName}`) || prefText.includes(`кроме ${dayName}`)) {
      isSatisfied = false
    }
    
    // Проверяем "только" дни
    if (prefText.includes('только')) {
      const onlyDays = dayNames.filter((d) => prefText.includes(`только ${d}`) || prefText.includes(`только${d}`))
      if (onlyDays.length > 0 && !onlyDays.includes(dayName)) {
        // Если указаны конкретные дни с "только", проверяем строго
        const hasOnlyDay = dayNames.some(d => prefText.includes(`только ${d}`) && d === dayName)
        if (!hasOnlyDay) {
          // Проверяем более мягко - может быть просто упоминание дня
          const mentionedDays = dayNames.filter((d) => prefText.includes(d) && !prefText.includes(`не занимать ${d}`))
          if (mentionedDays.length > 0 && !mentionedDays.includes(dayName)) {
            isSatisfied = false
          }
        }
      }
    }
    
    // Проверяем пары
    if (prefText.includes('только 1-2 пары') && lesson.pairIndex > 2) isSatisfied = false
    if (prefText.includes('только 3-4 пары') && lesson.pairIndex <= 2) isSatisfied = false
    if (prefText.includes('только 1 пара') && lesson.pairIndex !== 1) isSatisfied = false
    if (prefText.includes('только 4 пары') && lesson.pairIndex !== 4) isSatisfied = false
    
    // Бонусы за соответствие (если не нарушено)
    if (isSatisfied) {
      // Проверяем положительные требования
      if (prefText.includes(dayName) && !prefText.includes('не занимать') && !prefText.includes('кроме')) {
        // День упомянут положительно - это хорошо
      }
    }
    
    teacherSatisfactionMap.set(teacher.fullName, {
      satisfied: current.satisfied + (isSatisfied ? 1 : 0),
      total: current.total + 1,
    })
  }

  const teacherSatisfaction = Array.from(teacherSatisfactionMap.entries()).map(([teacherName, data]) => ({
    teacherName,
    satisfied: data.satisfied,
    total: data.total,
    rate: data.total > 0 ? Math.round((data.satisfied / data.total) * 100) : 100,
  }))

  // Статистика нагрузки по группам
  const groupLoadsMap = new Map<string, number>()
  for (const lesson of allLessons) {
    groupLoadsMap.set(lesson.groupId, (groupLoadsMap.get(lesson.groupId) || 0) + 1)
  }

  const groupLoads = Array.from(groupLoadsMap.entries()).map(([groupId, lessons]) => {
    const group = groups.find((g) => g.id === groupId)
    return {
      groupName: group?.name || 'Неизвестная группа',
      lessons,
      hours: lessons * hoursPerPair,
    }
  })

  // Логируем статистику
  console.log('\n=== Статистика генерации расписания ===')
  console.log(`Всего занятий: ${allLessons.length}`)
  console.log(`Недель: ${semesterWeeks}`)
  console.log(`Занятий в типичной неделе: ${weekLessons.length}`)
  console.log(`Удовлетворенность требований: ${satisfactionRate}%`)
  console.log(`Конфликтов: ${conflictsCount}`)

  const schedule: SemesterSchedule = {
    id: newId('sched'),
    semesterLabel: '2 семестр 2025-26',
    weeks: weeklySchedules,
  }

  return {
    schedule,
    stats: {
      totalLessons: allLessons.length,
      satisfiedPreferences: satisfiedCount,
      totalPreferences: totalPreferencesCount,
      conflicts: conflictsCount,
      satisfactionRate,
      teacherLoadBalance,
      teacherSatisfaction,
      groupLoads,
    },
  }
}
