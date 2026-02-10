import { useState, useMemo } from 'react'
import { Sparkles, Download, AlertCircle } from 'lucide-react'
import { generateSmartSchedule, type GenerationInput } from '../engine/smartScheduleGenerator'
import { useLocalStorageState } from '../shared/useLocalStorageState'
import type { Teacher, Group, Subject, Room, TeacherPreference } from '../types/entities'
import type { SemesterSchedule } from '../types/schedule'
import * as XLSX from 'xlsx'

const STORAGE_KEY = 'itHub.generatedSchedule.v1'

export function SchedulePage() {
  const [schedule, setSchedule] = useLocalStorageState<SemesterSchedule | null>(
    STORAGE_KEY,
    null,
  )
  const [generationStats, setGenerationStats] = useState<{
    totalLessons: number
    satisfiedPreferences: number
    totalPreferences: number
    conflicts: number
    satisfactionRate: number
    teacherLoadBalance: number
    teacherSatisfaction: Array<{
      teacherName: string
      satisfied: number
      total: number
      rate: number
    }>
    groupLoads: Array<{
      groupName: string
      lessons: number
      hours: number
    }>
  } | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [generationProgress, setGenerationProgress] = useState(0)

  // Загружаем данные из LocalStorage
  const [teachers] = useLocalStorageState<Teacher[]>('itHub.teachers.v1', [])
  const [groups] = useLocalStorageState<Group[]>('itHub.groups.v1', [])
  const [subjects] = useLocalStorageState<Subject[]>('itHub.subjects.v1', [])
  const [rooms] = useLocalStorageState<Room[]>('itHub.rooms.v1', [])
  const [preferences] = useLocalStorageState<TeacherPreference[]>('itHub.preferences.v1', [])

  async function handleGenerate() {
    setIsGenerating(true)
    setError(null)
    setGenerationProgress(0)

    // Имитация прогресса для плавности
    const progressInterval = setInterval(() => {
      setGenerationProgress((prev) => Math.min(prev + 2, 90))
    }, 50)

    try {
      // Проверяем, что есть минимальные данные
      if (teachers.length === 0) {
        throw new Error('Добавьте хотя бы одного преподавателя')
      }
      if (groups.length === 0) {
        throw new Error('Добавьте хотя бы одну группу')
      }
      if (subjects.length === 0) {
        throw new Error('Добавьте хотя бы одну дисциплину')
      }
      if (rooms.length === 0) {
        throw new Error('Добавьте хотя бы одну аудиторию')
      }

      const input: GenerationInput = {
        teachers,
        groups,
        subjects,
        rooms,
        preferences,
        semesterWeeks: 21, // 2 семестр обычно 21 неделя
      }

      console.log('📊 Входные данные:', {
        teachers: teachers.length,
        groups: groups.length,
        subjects: subjects.length,
        rooms: rooms.length,
        preferences: preferences.length,
      })

      // Детальная диагностика перед генерацией
      if (groups.length === 0) {
        throw new Error('❌ Нет групп! Добавьте группы в разделе "Группы" или импортируйте из файла.')
      }

      if (subjects.length === 0) {
        throw new Error('❌ Нет дисциплин! Добавьте дисциплины в разделе "Дисциплины".')
      }

      // Проверяем сопоставление групп и дисциплин
      const groupsInSubjects = new Set<string>()
      for (const subject of subjects) {
        for (const group of groups) {
          const groupNameLower = group.name.toLowerCase().trim()
          const subjectGroupsLower = subject.groups.toLowerCase()
          if (subjectGroupsLower.includes(groupNameLower) || subjectGroupsLower === groupNameLower) {
            groupsInSubjects.add(group.name)
          }
        }
      }

      console.log('🔍 Диагностика:', {
        'Групп найдено в дисциплинах': groupsInSubjects.size,
        'Всего групп': groups.length,
        'Группы без дисциплин': groups.filter(g => !groupsInSubjects.has(g.name)).map(g => g.name),
      })

      // Генерируем расписание (может занять время для 20 групп)
      const result = generateSmartSchedule(input)
      
      setGenerationProgress(100)
      await new Promise((resolve) => setTimeout(resolve, 300)) // Плавное завершение
      
      setSchedule(result.schedule)
      setGenerationStats(result.stats)
      clearInterval(progressInterval)

      console.log('✅ Результат генерации:', result)

      // Показываем статистику
      if (result.stats.totalLessons === 0) {
        alert(
          `⚠️ Внимание!\n\n` +
            `Расписание создано, но занятий: 0\n\n` +
            `Проверьте:\n` +
            `- Есть ли дисциплины у групп (в разделе Дисциплины поле "Группы" должно содержать коды групп)\n` +
            `- Совпадают ли ФИО преподавателей в дисциплинах и в списке преподавателей\n` +
            `- Есть ли хотя бы одна аудитория\n\n` +
            `Всего занятий: ${result.stats.totalLessons}\n` +
            `Конфликтов: ${result.stats.conflicts}`,
        )
      } else {
        alert(
          `✅ Расписание создано!\n\n` +
            `Всего занятий: ${result.stats.totalLessons}\n` +
            `Удовлетворенность пожеланий: ${result.stats.satisfactionRate}%\n` +
            `Равномерность нагрузки: ${result.stats.teacherLoadBalance}%\n` +
            `Конфликтов: ${result.stats.conflicts}`,
        )
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Неизвестная ошибка')
      clearInterval(progressInterval)
    } finally {
      setIsGenerating(false)
      setGenerationProgress(0)
    }
  }

  function handleExportExcel() {
    if (!schedule) {
      alert('Сначала создайте расписание')
      return
    }

    try {
      const workbook = XLSX.utils.book_new()

      // Для каждой группы создаем отдельный лист
      for (const group of groups) {
        const firstWeek = schedule.weeks[0]
        if (!firstWeek) continue

        const groupLessons = firstWeek.lessons.filter((l) => l.groupId === group.id)
        if (groupLessons.length === 0) continue

        const scheduleData: any[][] = []
        const pairTimes = ['09:00-10:30', '10:40-12:10', '12:50-14:20', '14:30-16:00']
        const dayNames = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница']

        // Заголовок
        scheduleData.push([`Расписание группы: ${group.name}`])
        scheduleData.push([])
        
        // Заголовок таблицы
        const headerRow: any[] = ['Время']
        dayNames.forEach(day => headerRow.push(day))
        scheduleData.push(headerRow)

        // Данные расписания
        for (let pair = 1; pair <= 4; pair++) {
          const row: any[] = [pairTimes[pair - 1]]

          for (let day = 1; day <= 5; day++) {
            const lesson = groupLessons.find((l) => l.weekday === day && l.pairIndex === pair)
            if (lesson) {
              const subject = subjects.find((s) => s.id === lesson.subjectId)
              const teacher = teachers.find((t) => t.id === lesson.teacherId)
              const room = rooms.find((r) => r.id === lesson.roomId)

              // Форматируем ячейку: предмет, преподаватель, аудитория (каждый элемент на отдельной строке)
              const subjectName = subject?.name || '?'
              const teacherName = teacher?.fullName || '?'
              const roomNumber = room?.number || '?'
              // Используем переносы строк для разделения элементов
              const cellText = `${subjectName}\n\n${teacherName}\n\nАуд. ${roomNumber}`
              row.push(cellText)
            } else {
              row.push('')
            }
          }

          scheduleData.push(row)
        }

        const worksheet = XLSX.utils.aoa_to_sheet(scheduleData)

        // Устанавливаем ширину колонок для лучшей читаемости
        worksheet['!cols'] = [
          { wch: 18 }, // Время
          { wch: 40 }, // Понедельник
          { wch: 40 }, // Вторник
          { wch: 40 }, // Среда
          { wch: 40 }, // Четверг
          { wch: 40 }, // Пятница
        ]

        // Настраиваем перенос текста и выравнивание для всех ячеек с данными
        const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1')
        for (let row = 3; row <= range.e.r; row++) {
          for (let col = 1; col <= range.e.c; col++) {
            const cellRef = XLSX.utils.encode_cell({ r: row, c: col })
            if (worksheet[cellRef]) {
              // Устанавливаем перенос текста через свойство z (комментарий для Excel)
              // К сожалению, xlsx не поддерживает стили напрямую, но переносы строк в тексте работают
              if (worksheet[cellRef].v && typeof worksheet[cellRef].v === 'string' && worksheet[cellRef].v.includes('\n')) {
                // Текст уже содержит переносы строк - это будет работать в Excel
              }
            }
          }
        }

        // Объединяем ячейку заголовка группы
        if (!worksheet['!merges']) worksheet['!merges'] = []
        worksheet['!merges'].push({ s: { r: 0, c: 0 }, e: { r: 0, c: 6 } })

        // Очищаем имя группы от запрещенных символов
        let sheetName = group.name
          .replace(/[\\\/\?\*\[\]]/g, '_')
          .replace(/\s+/g, ' ')
          .trim()

        if (sheetName.length > 31) {
          sheetName = sheetName.substring(0, 31)
        }

        if (!sheetName || sheetName.length === 0) {
          sheetName = `Группа_${groups.indexOf(group) + 1}`
        }

        XLSX.utils.book_append_sheet(workbook, worksheet, sheetName)
      }

      // Сохраняем файл
      const fileName = `Расписание_IT_Hub_${new Date().toISOString().split('T')[0]}.xlsx`
      XLSX.writeFile(workbook, fileName)
      alert(`Расписание экспортировано в Excel!\n\nФайл: ${fileName}\nЛистов: ${groups.length}`)
    } catch (err) {
      alert(`Ошибка экспорта: ${err instanceof Error ? err.message : 'Неизвестная ошибка'}`)
      console.error('Ошибка экспорта:', err)
    }
  }

  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null)

  // Выбираем первую группу по умолчанию
  const defaultGroupId = useMemo(() => {
    if (groups.length > 0 && !selectedGroupId) {
      return groups[0].id
    }
    return selectedGroupId
  }, [groups, selectedGroupId])

  // Всегда используем первую неделю (все недели одинаковые)
  const selectedWeek = useMemo(() => {
    if (!schedule || schedule.weeks.length === 0) return null
    return schedule.weeks[0] // Все недели одинаковые, берем первую
  }, [schedule])

  const selectedGroup = useMemo(() => {
    if (!defaultGroupId) return null
    return groups.find((g) => g.id === defaultGroupId) || groups[0] || null
  }, [groups, defaultGroupId])

  // Фильтруем занятия для выбранной группы
  const groupLessons = useMemo(() => {
    if (!selectedWeek || !selectedGroup) return []
    return selectedWeek.lessons.filter((l) => l.groupId === selectedGroup.id)
  }, [selectedWeek, selectedGroup])

  const dayNames = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница']
  const pairTimes = ['09:00-10:30', '10:40-12:10', '12:50-14:20', '14:30-16:00']

  return (
    <div className="space-y-4 fade-in">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-white">Генерация расписания</h2>
          <p className="text-sm text-white/70">
            Заполните все разделы (Преподаватели, Группы, Дисциплины, Аудитории, Хотелки), затем
            нажмите "Создать расписание"
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleGenerate}
            disabled={isGenerating}
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/15 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
          >
            <Sparkles className={`h-4 w-4 ${isGenerating ? 'animate-spin' : ''}`} />
            {isGenerating ? 'Генерация...' : 'Создать расписание'}
          </button>
          {schedule && (
            <button
              type="button"
              onClick={handleExportExcel}
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/15 hover:scale-105 transition-all duration-200"
            >
              <Download className="h-4 w-4" />
              Экспорт в Excel
            </button>
          )}
        </div>
      </div>

      {isGenerating && (
        <div className="rounded-xl border border-white/10 bg-black/10 p-4 fade-in">
          <div className="mb-2 flex items-center justify-between text-sm text-white/70">
            <span>Генерация расписания для всех групп...</span>
            <span className="font-semibold text-white">{generationProgress}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-white/5">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-300 ease-out"
              style={{ width: `${generationProgress}%` }}
            />
          </div>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-red-500/50 bg-red-500/10 p-3 text-sm text-red-300 fade-in">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}


      {schedule && selectedWeek && selectedGroup ? (
        <div className="space-y-4 slide-in">
          {/* Селектор группы */}
          <div className="flex flex-wrap items-center gap-3 rounded-xl border border-white/10 bg-black/10 p-3 fade-in">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-white/70">Группа:</label>
              <select
                value={defaultGroupId || ''}
                onChange={(e) => setSelectedGroupId(e.target.value)}
                className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white outline-none transition-all duration-200 hover:bg-white/10 focus:border-white/20"
              >
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="ml-auto text-xs text-white/50">
              Всего групп: <strong className="text-white">{groups.length}</strong> | 
              Расписание одинаковое для всех недель семестра
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/10 p-4 fade-in">
            <h3 className="mb-3 text-base font-semibold text-white">
              Расписание группы: <span className="text-blue-400">{selectedGroup.name}</span>
            </h3>
            <div className="overflow-auto">
              <table className="w-full border-separate border-spacing-0">
                <thead>
                  <tr>
                    <th className="border-b border-white/10 px-3 py-2 text-left text-xs font-semibold uppercase text-white/60">
                      Время
                    </th>
                    {dayNames.map((day, idx) => (
                      <th
                        key={idx}
                        className="border-b border-white/10 px-3 py-2 text-left text-xs font-semibold uppercase text-white/60"
                      >
                        {day}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[1, 2, 3, 4].map((pair) => (
                    <tr key={pair} className="transition-colors duration-150 hover:bg-white/5">
                      <td className="border-b border-white/5 px-3 py-2 text-xs text-white/70">
                        {pairTimes[pair - 1]}
                      </td>
                      {[1, 2, 3, 4, 5].map((day) => {
                        const lesson = groupLessons.find(
                          (l) => l.weekday === day && l.pairIndex === pair,
                        )
                        if (!lesson) {
                          return (
                            <td key={day} className="border-b border-white/5 px-3 py-2 transition-colors duration-150">
                              <div className="text-xs text-white/30">—</div>
                            </td>
                          )
                        }

                        const subject = subjects.find((s) => s.id === lesson.subjectId)
                        const teacher = teachers.find((t) => t.id === lesson.teacherId)
                        const room = rooms.find((r) => r.id === lesson.roomId)

                        return (
                          <td key={day} className="border-b border-white/5 px-3 py-2 transition-all duration-200">
                            <div className="space-y-1 rounded-lg bg-gradient-to-br from-white/10 to-white/5 p-2 text-xs shadow-sm transition-all duration-200 hover:from-white/15 hover:to-white/10 hover:shadow-md">
                              <div className="font-semibold text-white">{subject?.name || '?'}</div>
                              <div className="text-white/60">{teacher?.fullName || '?'}</div>
                              <div className="text-white/50">Ауд. {room?.number || '?'}</div>
                            </div>
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 rounded-xl border border-white/10 bg-black/10 p-4 text-sm text-white/70 fade-in">
            <div>
              <p>
                Всего занятий в семестре: <strong className="text-white">{schedule.weeks.reduce((sum, w) => sum + w.lessons.length, 0)}</strong>
              </p>
              <p>
                Недель: <strong className="text-white">{schedule.weeks.length}</strong>
              </p>
            </div>
            <div>
              <p>
                Занятий у группы "{selectedGroup.name}": <strong className="text-white">{groupLessons.length}</strong>
              </p>
              <p>
                Всего групп: <strong className="text-white">{groups.length}</strong>
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-white/10 bg-black/10 p-8 text-center fade-in">
          <p className="text-white/70">
            Расписание еще не создано. Заполните все разделы и нажмите "Создать расписание".
          </p>
        </div>
      )}
    </div>
  )
}
