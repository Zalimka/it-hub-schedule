import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useState, useRef } from 'react'
import { Sidebar } from '../../features/sidebar/Sidebar'
import { NotesPanel } from '../../features/notes/NotesPanel'
import { Sparkles, Upload } from 'lucide-react'
import { bulkImportFromExcel } from '../../shared/bulkExcelImport'
import { useLocalStorageState } from '../../shared/useLocalStorageState'
import type { Teacher, Room, Group, Subject, TeacherPreference } from '../../types/entities'

const titleByPath: Array<{ prefix: string; title: string }> = [
  { prefix: '/app/preferences', title: 'Хотелки по расписанию' },
  { prefix: '/app/teachers', title: 'Список преподавателей (2 семестр)' },
  { prefix: '/app/subjects', title: 'Дисциплины (2 семестр 2025–26)' },
  { prefix: '/app/rooms', title: 'Аудитории' },
  { prefix: '/app/groups', title: 'Наименования групп' },
  { prefix: '/app/schedule', title: 'Расписание' },
]

function getTitle(pathname: string) {
  return titleByPath.find((x) => pathname.startsWith(x.prefix))?.title ?? 'Расписание IT Hub'
}

export function AppShell() {
  const location = useLocation()
  const navigate = useNavigate()
  const title = getTitle(location.pathname)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isImporting, setIsImporting] = useState(false)

  const [teachers, setTeachers] = useLocalStorageState<Teacher[]>('itHub.teachers.v1', [])
  const [rooms, setRooms] = useLocalStorageState<Room[]>('itHub.rooms.v1', [])
  const [groups, setGroups] = useLocalStorageState<Group[]>('itHub.groups.v1', [])
  const [subjects, setSubjects] = useLocalStorageState<Subject[]>('itHub.subjects.v1', [])
  const [preferences, setPreferences] = useLocalStorageState<TeacherPreference[]>('itHub.preferences.v1', [])

  async function handleBulkImport() {
    const file = fileInputRef.current?.files?.[0]
    if (!file) {
      fileInputRef.current?.click()
      return
    }

    setIsImporting(true)
    try {
      const imported = await bulkImportFromExcel(file)
      
      // Объединяем с существующими данными
      const existingTeacherNames = new Set(teachers.map((t) => t.fullName.toLowerCase()))
      const existingRoomNumbers = new Set(rooms.map((r) => r.number.toLowerCase()))
      const existingGroupNames = new Set(groups.map((g) => g.name.toLowerCase()))
      const existingSubjectKeys = new Set(
        subjects.map((s) => `${s.direction}:${s.name.toLowerCase()}`),
      )
      const existingPreferenceNames = new Set(
        preferences.map((p) => p.teacherFullName.toLowerCase()),
      )

      const newTeachers = imported.teachers.filter(
        (t) => !existingTeacherNames.has(t.fullName.toLowerCase()),
      )
      const newRooms = imported.rooms.filter(
        (r) => !existingRoomNumbers.has(r.number.toLowerCase()),
      )
      const newGroups = imported.groups.filter(
        (g) => !existingGroupNames.has(g.name.toLowerCase()),
      )
      const newSubjects = imported.subjects.filter(
        (s) => !existingSubjectKeys.has(`${s.direction}:${s.name.toLowerCase()}`),
      )
      const newPreferences = imported.preferences.filter(
        (p) => !existingPreferenceNames.has(p.teacherFullName.toLowerCase()),
      )

      setTeachers([...teachers, ...newTeachers])
      setRooms([...rooms, ...newRooms])
      setGroups([...groups, ...newGroups])
      setSubjects([...subjects, ...newSubjects])
      setPreferences([...preferences, ...newPreferences])

      alert(
        `✅ Импорт завершен!\n\n` +
          `Преподаватели: +${newTeachers.length}\n` +
          `Аудитории: +${newRooms.length}\n` +
          `Группы: +${newGroups.length}\n` +
          `Дисциплины: +${newSubjects.length}\n` +
          `Хотелки: +${newPreferences.length}`,
      )
      if (fileInputRef.current) fileInputRef.current.value = ''
    } catch (error) {
      alert(`Ошибка импорта: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`)
    } finally {
      setIsImporting(false)
    }
  }

  return (
    <div className="h-full bg-[radial-gradient(1200px_800px_at_20%_-10%,rgba(99,102,241,0.18),transparent_60%),radial-gradient(900px_600px_at_80%_0%,rgba(16,185,129,0.14),transparent_55%),linear-gradient(to_bottom,rgba(255,255,255,0.05),transparent_25%)]">
      <div className="mx-auto grid h-full max-w-[1600px] grid-cols-[260px_1fr_340px] gap-4 p-4">
        <aside className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur">
          <Sidebar />
        </aside>

        <main className="flex min-w-0 flex-col rounded-2xl border border-white/10 bg-white/5 backdrop-blur">
          <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
            <div className="min-w-0">
              <div className="text-xs font-medium tracking-wide text-white/60">IT Hub</div>
              <div className="truncate text-lg font-semibold text-white">{title}</div>
            </div>

            <div className="flex items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={handleBulkImport}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isImporting}
                className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-sm font-semibold text-white hover:bg-white/15 disabled:opacity-50"
                title="Импортировать все данные из Excel файла"
              >
                <Upload className="h-4 w-4" />
                {isImporting ? 'Импорт...' : 'Импорт Excel'}
              </button>
              <button
                type="button"
                onClick={() => navigate('/app/schedule')}
                className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-sm font-semibold text-white hover:bg-white/15"
                title="Перейти к генерации расписания"
              >
                <Sparkles className="h-4 w-4" />
                Создать расписание
              </button>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-auto p-4">
            <Outlet />
          </div>
        </main>

        <aside className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur">
          <NotesPanel />
        </aside>
      </div>
    </div>
  )
}


