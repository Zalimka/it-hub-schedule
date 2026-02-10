import type { EntityId } from './entities'

export type LessonType = 'lecture' | 'lab' | 'practice' | 'other'

/**
 * Занятие в расписании
 * Упрощенная версия для генератора
 */
export type Lesson = {
  id: EntityId
  weekIndex: number // Неделя семестра (1..21)
  weekday: number // День недели: 1=ПН, 2=ВТ, 3=СР, 4=ЧТ, 5=ПТ
  pairIndex: number // Номер пары в день (1..4)
  groupId: EntityId
  subjectId: EntityId
  teacherId: EntityId
  roomId: EntityId
}

export type WeeklySchedule = {
  id: EntityId
  weekIndex: number
  lessons: Lesson[]
}

export type SemesterSchedule = {
  id: EntityId
  semesterLabel: string
  weeks: WeeklySchedule[]
}


