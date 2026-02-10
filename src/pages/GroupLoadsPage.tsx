import { useMemo } from 'react'
import { Users, AlertTriangle, TrendingUp, TrendingDown } from 'lucide-react'
import { useLocalStorageState } from '../shared/useLocalStorageState'
import type { SemesterSchedule, Lesson } from '../types/schedule'

export function GroupLoadsPage() {
  const [schedule] = useLocalStorageState<SemesterSchedule | null>('itHub.generatedSchedule.v1', null)
  const [groups] = useLocalStorageState<any[]>('itHub.groups.v1', [])

  const groupLoads = useMemo(() => {
    if (!schedule) return []

    const allLessons: Lesson[] = []
    for (const week of schedule.weeks) {
      allLessons.push(...week.lessons)
    }

    const loadsMap = new Map<string, number>()
    for (const lesson of allLessons) {
      loadsMap.set(lesson.groupId, (loadsMap.get(lesson.groupId) || 0) + 1)
    }

    return Array.from(loadsMap.entries()).map(([groupId, lessons]) => {
      const group = groups.find((g) => g.id === groupId)
      return {
        groupName: group?.name || 'Неизвестная группа',
        groupId,
        lessons,
        hours: lessons * 2, // 2 часа на пару
      }
    }).sort((a, b) => b.lessons - a.lessons) // Сортируем по убыванию нагрузки
  }, [schedule, groups])

  const avgLoad = useMemo(() => {
    if (groupLoads.length === 0) return 0
    return groupLoads.reduce((sum, g) => sum + g.lessons, 0) / groupLoads.length
  }, [groupLoads])

  if (!schedule) {
    return (
      <div className="rounded-2xl border border-white/10 bg-black/10 p-8 text-center fade-in">
        <p className="text-white/70">
          Расписание еще не создано. Создайте расписание в разделе "Расписание".
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4 fade-in">
      <div className="flex items-center gap-3">
        <Users className="h-6 w-6 text-purple-400" />
        <div>
          <h2 className="text-lg font-semibold text-white">Нагрузка по группам</h2>
          <p className="text-sm text-white/70">
            Статистика занятий и часов для каждой группы
          </p>
        </div>
      </div>

      {/* Общая статистика */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-white/10 bg-black/10 p-4">
          <div className="mb-1 text-xs text-white/50">Всего групп</div>
          <div className="text-2xl font-bold text-white">{groupLoads.length}</div>
        </div>
        <div className="rounded-xl border border-white/10 bg-black/10 p-4">
          <div className="mb-1 text-xs text-white/50">Средняя нагрузка</div>
          <div className="text-2xl font-bold text-white">{Math.round(avgLoad)} занятий</div>
        </div>
        <div className="rounded-xl border border-white/10 bg-black/10 p-4">
          <div className="mb-1 text-xs text-white/50">Всего занятий</div>
          <div className="text-2xl font-bold text-white">
            {groupLoads.reduce((sum, g) => sum + g.lessons, 0)}
          </div>
        </div>
      </div>

      {/* Детальная статистика */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
      {groupLoads.map((load, idx) => {
        // Отклонение в процентах от средней нагрузки (положительное = перегрузка, отрицательное = недогрузка)
        const deviation = avgLoad > 0 ? ((load.lessons - avgLoad) / avgLoad) * 100 : 0
        const isOverloaded = load.lessons > avgLoad * 1.2
        const isUnderloaded = load.lessons < avgLoad * 0.8
          
          return (
            <div
              key={idx}
              className={`rounded-xl border p-4 fade-in ${
                isOverloaded
                  ? 'border-yellow-500/50 bg-yellow-500/5'
                  : isUnderloaded
                  ? 'border-blue-500/50 bg-blue-500/5'
                  : 'border-white/10 bg-black/10'
              }`}
            >
              <div className="mb-2 flex items-center justify-between">
                <div className="text-base font-semibold text-white">{load.groupName}</div>
                {isOverloaded ? (
                  <TrendingUp className="h-4 w-4 text-yellow-400" />
                ) : isUnderloaded ? (
                  <TrendingDown className="h-4 w-4 text-blue-400" />
                ) : null}
              </div>
              
              <div className="space-y-1 text-sm">
                <div className="flex justify-between text-white/70">
                  <span>Занятий:</span>
                  <span className="font-semibold text-white">{load.lessons}</span>
                </div>
                <div className="flex justify-between text-white/70">
                  <span>Часов:</span>
                  <span className="font-semibold text-white">{load.hours}</span>
                </div>
                <div className="flex justify-between text-white/70">
                  <span>Отклонение:</span>
                  <span className={`font-semibold ${
                    isOverloaded ? 'text-yellow-400' : 
                    isUnderloaded ? 'text-blue-400' : 
                    'text-white'
                  }`}>
                    {deviation > 0 ? '+' : ''}{Math.round(deviation)}%
                  </span>
                </div>
              </div>

              {isOverloaded && (
                <div className="mt-2 flex items-center gap-1 text-xs text-yellow-400">
                  <AlertTriangle className="h-3 w-3" />
                  Перегружена
                </div>
              )}
              {isUnderloaded && (
                <div className="mt-2 flex items-center gap-1 text-xs text-blue-400">
                  <AlertTriangle className="h-3 w-3" />
                  Недогружена
                </div>
              )}
            </div>
          )
        })}
      </div>

      {groupLoads.length === 0 && (
        <div className="rounded-xl border border-white/10 bg-black/10 p-8 text-center">
          <p className="text-white/70">Нет данных о нагрузке групп</p>
        </div>
      )}
    </div>
  )
}

