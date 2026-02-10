import { useMemo } from 'react'
import { BarChart3, AlertCircle, CheckCircle2, XCircle } from 'lucide-react'
import { useLocalStorageState } from '../shared/useLocalStorageState'
import type { TeacherPreference } from '../types/entities'
import type { SemesterSchedule, Lesson } from '../types/schedule'

export function SatisfactionPage() {
  const [schedule] = useLocalStorageState<SemesterSchedule | null>('itHub.generatedSchedule.v1', null)
  const [teachers] = useLocalStorageState<any[]>('itHub.teachers.v1', [])
  const [preferences] = useLocalStorageState<TeacherPreference[]>('itHub.preferences.v1', [])

  // Вычисляем статистику удовлетворенности
  const satisfactionStats = useMemo(() => {
    if (!schedule) return []

    const teacherPreferenceMap = new Map<string, TeacherPreference>()
    for (const pref of preferences) {
      teacherPreferenceMap.set(pref.teacherFullName.toLowerCase().trim(), pref)
    }

    const allLessons: Lesson[] = []
    for (const week of schedule.weeks) {
      allLessons.push(...week.lessons)
    }

    const teacherSatisfactionMap = new Map<string, { satisfied: number; total: number; preference: TeacherPreference | null }>()
    
    for (const lesson of allLessons) {
      const teacher = teachers.find((t) => t.id === lesson.teacherId)
      if (!teacher) continue

      const teacherKey = teacher.fullName.toLowerCase().trim()
      const preference = teacherPreferenceMap.get(teacherKey)
      
      const current = teacherSatisfactionMap.get(teacher.fullName) || { satisfied: 0, total: 0, preference: null }
      
      if (!preference) {
        // Если нет пожеланий, считаем что все удовлетворено
        teacherSatisfactionMap.set(teacher.fullName, {
          satisfied: current.satisfied + 1,
          total: current.total + 1,
          preference: null,
        })
        continue
      }

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
          const mentionedDays = dayNames.filter((d) => prefText.includes(d) && !prefText.includes(`не занимать ${d}`))
          if (mentionedDays.length > 0 && !mentionedDays.includes(dayName)) {
            isSatisfied = false
          }
        }
      }
      
      // Проверяем пары
      if (prefText.includes('только 1-2 пары') && lesson.pairIndex > 2) isSatisfied = false
      if (prefText.includes('только 3-4 пары') && lesson.pairIndex <= 2) isSatisfied = false
      if (prefText.includes('только 1 пара') && lesson.pairIndex !== 1) isSatisfied = false
      if (prefText.includes('только 4 пары') && lesson.pairIndex !== 4) isSatisfied = false
      
      teacherSatisfactionMap.set(teacher.fullName, {
        satisfied: current.satisfied + (isSatisfied ? 1 : 0),
        total: current.total + 1,
        preference: preference,
      })
    }

    return Array.from(teacherSatisfactionMap.entries())
      .map(([teacherName, data]) => ({
        teacherName,
        satisfied: data.satisfied,
        total: data.total,
        rate: data.total > 0 ? Math.round((data.satisfied / data.total) * 100) : 100,
        preference: data.preference,
      }))
      .sort((a, b) => a.rate - b.rate) // Сортируем по возрастанию (худшие первыми)
  }, [schedule, teachers, preferences])

  const overallRate = useMemo(() => {
    if (satisfactionStats.length === 0) return 100
    const total = satisfactionStats.reduce((sum, s) => sum + s.total, 0)
    const satisfied = satisfactionStats.reduce((sum, s) => sum + s.satisfied, 0)
    return total > 0 ? Math.round((satisfied / total) * 100) : 100
  }, [satisfactionStats])

  if (!schedule) {
    return (
      <div className="rounded-2xl border border-white/10 bg-black/10 p-8 text-center fade-in">
        <AlertCircle className="mx-auto mb-3 h-12 w-12 text-white/30" />
        <p className="text-white/70">
          Расписание еще не создано. Создайте расписание в разделе "Расписание".
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4 fade-in">
      <div className="flex items-center gap-3">
        <BarChart3 className="h-6 w-6 text-blue-400" />
        <div>
          <h2 className="text-lg font-semibold text-white">Удовлетворенность требований преподавателей</h2>
          <p className="text-sm text-white/70">
            Статистика по каждому преподавателю: сколько требований учтено
          </p>
        </div>
      </div>

      {/* Общая статистика */}
      <div className="rounded-xl border border-white/10 bg-black/10 p-4">
        <div className="mb-2 text-sm text-white/70">Общая удовлетворенность</div>
        <div className="flex items-center gap-3">
          <div className="text-3xl font-bold text-white">{overallRate}%</div>
          <div className="flex-1">
            <div className="h-3 overflow-hidden rounded-full bg-white/10">
              <div
                className={`h-full transition-all duration-500 ${
                  overallRate >= 80 ? 'bg-green-500' : 
                  overallRate >= 60 ? 'bg-yellow-500' : 
                  'bg-red-500'
                }`}
                style={{ width: `${overallRate}%` }}
              />
            </div>
          </div>
          <div className="text-xs text-white/50">
            {satisfactionStats.reduce((sum, s) => sum + s.satisfied, 0)} из{' '}
            {satisfactionStats.reduce((sum, s) => sum + s.total, 0)} требований
          </div>
        </div>
      </div>

      {/* Детальная статистика */}
      <div className="space-y-3">
        {satisfactionStats.map((stat, idx) => (
          <div key={idx} className="rounded-xl border border-white/10 bg-black/10 p-4 fade-in">
            <div className="mb-3 flex items-start justify-between">
              <div className="flex-1">
                <div className="mb-1 flex items-center gap-2">
                  <span className="text-base font-semibold text-white">{stat.teacherName}</span>
                  {stat.rate >= 80 ? (
                    <CheckCircle2 className="h-4 w-4 text-green-400" />
                  ) : stat.rate >= 60 ? (
                    <AlertCircle className="h-4 w-4 text-yellow-400" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-400" />
                  )}
                </div>
                {stat.preference && (
                  <div className="text-xs text-white/50">
                    Требование: {stat.preference.schedulePreference}
                  </div>
                )}
              </div>
              <div className={`text-right ${
                stat.rate >= 80 ? 'text-green-400' : 
                stat.rate >= 60 ? 'text-yellow-400' : 
                'text-red-400'
              }`}>
                <div className="text-2xl font-bold">{stat.rate}%</div>
                <div className="text-xs text-white/50">
                  {stat.satisfied} / {stat.total}
                </div>
              </div>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-white/10">
              <div
                className={`h-full transition-all duration-500 ${
                  stat.rate >= 80 ? 'bg-green-500' : 
                  stat.rate >= 60 ? 'bg-yellow-500' : 
                  'bg-red-500'
                }`}
                style={{ width: `${stat.rate}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      {satisfactionStats.length === 0 && (
        <div className="rounded-xl border border-white/10 bg-black/10 p-8 text-center">
          <p className="text-white/70">Нет данных о преподавателях с требованиями</p>
        </div>
      )}
    </div>
  )
}

