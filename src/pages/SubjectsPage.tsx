import { useMemo, useState, useRef } from 'react'
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table'
import type { ColumnDef } from '@tanstack/react-table'
import { Plus, Trash2, Upload } from 'lucide-react'
import type { Subject, SubjectDirection } from '../types/entities'
import { newId } from '../shared/id'
import { useLocalStorageState } from '../shared/useLocalStorageState'
import { importSubjectsFromExcel } from '../shared/excelImport'

const STORAGE_KEY = 'itHub.subjects.v1'

const defaultSubjects: Subject[] = []

const DIRECTIONS: SubjectDirection[] = ['1 курс', 'Маркетинг', 'Дизайн', 'ИСИП']

export function SubjectsPage() {
  const [subjects, setSubjects] = useLocalStorageState<Subject[]>(STORAGE_KEY, defaultSubjects)
  const [activeDirection, setActiveDirection] = useState<SubjectDirection>('1 курс')

  // Фильтруем предметы по выбранному направлению
  const filteredSubjects = useMemo(
    () => subjects.filter((s) => s.direction === activeDirection),
    [subjects, activeDirection],
  )

  function addSubject() {
    setSubjects([
      ...subjects,
      {
        id: newId('s'),
        direction: activeDirection,
        name: '',
        totalHours: 0,
        hoursPerUnit: 0,
        groups: '',
        teacherName: '',
      },
    ])
  }

  function updateSubject(id: string, patch: Partial<Subject>) {
    setSubjects(subjects.map((s) => (s.id === id ? { ...s, ...patch } : s)))
  }

  function deleteSubject(id: string) {
    setSubjects((prev) => prev.filter((s) => s.id !== id))
  }

  const fileInputRef = useRef<HTMLInputElement>(null)

  async function handleImportExcel() {
    const file = fileInputRef.current?.files?.[0]
    if (!file) {
      fileInputRef.current?.click()
      return
    }

    try {
      const imported = await importSubjectsFromExcel(file)
      // Объединяем с существующими (избегаем дубликатов по названию + направлению)
      const existingKeys = new Set(
        subjects.map((s) => `${s.direction}:${s.name.toLowerCase()}`),
      )
      const newSubjects = imported.filter(
        (s) => !existingKeys.has(`${s.direction}:${s.name.toLowerCase()}`),
      )
      setSubjects([...subjects, ...newSubjects])
      alert(`Импортировано ${newSubjects.length} дисциплин`)
      if (fileInputRef.current) fileInputRef.current.value = ''
    } catch (error) {
      alert(`Ошибка импорта: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`)
    }
  }

  const columns = useMemo<ColumnDef<Subject>[]>(
    () => {
      const updateSubjectFn = (id: string, patch: Partial<Subject>) => {
        setSubjects((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)))
      }

      return [
      {
        header: 'Предмет ITHUB',
        accessorKey: 'name',
        cell: ({ row, getValue }) => (
          <input
            value={(getValue() as string) ?? ''}
            onChange={(e) => updateSubjectFn(row.original.id, { name: e.target.value })}
            className="w-full rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-sm text-white outline-none focus:border-white/20"
            placeholder="Название дисциплины"
          />
        ),
      },
      {
        header: 'Часы',
        accessorKey: 'totalHours',
        size: 80,
        cell: ({ row, getValue }) => (
          <input
            type="number"
            value={(getValue() as number) ?? ''}
            onChange={(e) => updateSubjectFn(row.original.id, { totalHours: e.target.value ? Number(e.target.value) : 0 })}
            className="w-full rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-sm text-white outline-none focus:border-white/20"
            placeholder="126"
          />
        ),
      },
      {
        header: 'Часы в',
        accessorKey: 'hoursPerUnit',
        size: 80,
        cell: ({ row, getValue }) => (
          <input
            type="number"
            value={(getValue() as number) ?? ''}
            onChange={(e) => updateSubjectFn(row.original.id, { hoursPerUnit: e.target.value ? Number(e.target.value) : 0 })}
            className="w-full rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-sm text-white outline-none focus:border-white/20"
            placeholder="6"
          />
        ),
      },
      {
        header: 'Группы',
        accessorKey: 'groups',
        cell: ({ row, getValue }) => (
          <input
            value={(getValue() as string) ?? ''}
            onChange={(e) => updateSubjectFn(row.original.id, { groups: e.target.value })}
            className="w-full rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-sm text-white outline-none focus:border-white/20"
            placeholder="1ИТП1.11.252"
          />
        ),
      },
      {
        header: 'Преподаватель',
        accessorKey: 'teacherName',
        cell: ({ row, getValue }) => (
          <input
            value={(getValue() as string) ?? ''}
            onChange={(e) => updateSubjectFn(row.original.id, { teacherName: e.target.value })}
            className="w-full rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-sm text-white outline-none focus:border-white/20"
            placeholder="Фамилия Имя Отчество"
          />
        ),
      },
      {
        header: 'Курс',
        accessorKey: 'course',
        size: 120,
        cell: ({ row, getValue }) => (
          <input
            value={(getValue() as string) ?? ''}
            onChange={(e) => updateSubjectFn(row.original.id, { course: e.target.value || undefined })}
            className="w-full rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-sm text-white outline-none focus:border-white/20"
            placeholder="3 курс DE, 3 курс .NET..."
          />
        ),
      },
      {
        id: 'actions',
        header: '',
        size: 60,
        cell: ({ row }) => (
          <button
            type="button"
            onClick={() => deleteSubject(row.original.id)}
            className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-white/75 hover:bg-white/10 hover:text-white"
            title="Удалить"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        ),
      },
    ]
    },
    [],
  )

  const table = useReactTable({
    data: filteredSubjects,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  return (
    <div className="space-y-3">
      {/* Вкладки направлений */}
      <div className="flex flex-wrap items-center gap-2 border-b border-white/10 pb-2">
        {DIRECTIONS.map((dir) => (
          <button
            key={dir}
            type="button"
            onClick={() => setActiveDirection(dir)}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
              activeDirection === dir
                ? 'bg-white/15 text-white'
                : 'bg-white/5 text-white/70 hover:bg-white/10 hover:text-white'
            }`}
          >
            {dir}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm text-white/70">
          Дисциплины на 2 семестр 2025-26. Направление: <strong>{activeDirection}</strong>. Изменения сохраняются автоматически.
        </div>
        <div className="flex gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            onChange={handleImportExcel}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-sm font-semibold text-white hover:bg-white/15"
          >
            <Upload className="h-4 w-4" />
            Импорт из Excel
          </button>
          <button
            type="button"
            onClick={addSubject}
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-sm font-semibold text-white hover:bg-white/15"
          >
            <Plus className="h-4 w-4" />
            Добавить дисциплину
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/10 fade-in">
        <div className="overflow-auto">
          <table className="min-w-[1200px] w-full border-separate border-spacing-0">
            <thead className="sticky top-0 bg-black/30 backdrop-blur">
              {table.getHeaderGroups().map((hg) => (
                <tr key={hg.id}>
                  {hg.headers.map((h) => (
                    <th
                      key={h.id}
                      style={{ width: h.getSize() }}
                      className="border-b border-white/10 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-white/60"
                    >
                      {h.isPlaceholder ? null : flexRender(h.column.columnDef.header, h.getContext())}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="border-b border-white/5 px-3 py-8 text-center text-sm text-white/50">
                    Нет данных для направления "{activeDirection}". Добавьте дисциплины вручную или импортируйте из Excel.
                  </td>
                </tr>
              ) : (
                table.getRowModel().rows.map((r) => (
                  <tr key={r.id} className="hover:bg-white/5">
                    {r.getVisibleCells().map((c) => (
                      <td key={c.id} className="border-b border-white/5 px-3 py-2 align-top">
                        {flexRender(c.column.columnDef.cell, c.getContext())}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

