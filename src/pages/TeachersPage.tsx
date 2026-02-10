import { useMemo, useRef } from 'react'
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table'
import type { ColumnDef } from '@tanstack/react-table'
import { Plus, Trash2, Upload } from 'lucide-react'
import type { Teacher } from '../types/entities'
import { newId } from '../shared/id'
import { useLocalStorageState } from '../shared/useLocalStorageState'
import { importTeachersFromExcel } from '../shared/excelImport'

const STORAGE_KEY = 'itHub.teachers.v1'

const defaultTeachers: Teacher[] = []

export function TeachersPage() {
  const [teachers, setTeachers] = useLocalStorageState<Teacher[]>(STORAGE_KEY, defaultTeachers)

  function addTeacher() {
    setTeachers([
      ...teachers,
      {
        id: newId('t'),
        fullName: 'Новый преподаватель',
        shortName: '',
        email: '',
        phone: '',
        notes: '',
      },
    ])
  }

  function updateTeacher(id: string, patch: Partial<Teacher>) {
    setTeachers(teachers.map((t) => (t.id === id ? { ...t, ...patch } : t)))
  }

  function deleteTeacher(id: string) {
    setTeachers((prev) => prev.filter((t) => t.id !== id))
  }

  const fileInputRef = useRef<HTMLInputElement>(null)

  async function handleImportExcel() {
    const file = fileInputRef.current?.files?.[0]
    if (!file) {
      fileInputRef.current?.click()
      return
    }

    try {
      const imported = await importTeachersFromExcel(file)
      // Объединяем с существующими (избегаем дубликатов по ФИО)
      const existingNames = new Set(teachers.map((t) => t.fullName.toLowerCase()))
      const newTeachers = imported.filter((t) => !existingNames.has(t.fullName.toLowerCase()))
      setTeachers([...teachers, ...newTeachers])
      alert(`Импортировано ${newTeachers.length} преподавателей`)
      if (fileInputRef.current) fileInputRef.current.value = ''
    } catch (error) {
      alert(`Ошибка импорта: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`)
    }
  }

  const columns = useMemo<ColumnDef<Teacher>[]>(
    () => {
      const updateTeacherFn = (id: string, patch: Partial<Teacher>) => {
        setTeachers((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)))
      }

      return [
      {
        header: '№',
        accessorKey: 'number',
        size: 60,
        cell: ({ row, getValue }) => (
          <input
            type="number"
            value={(getValue() as number) ?? ''}
            onChange={(e) => updateTeacherFn(row.original.id, { number: e.target.value ? Number(e.target.value) : undefined })}
            className="w-full rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-sm text-white outline-none focus:border-white/20"
            placeholder="№"
          />
        ),
      },
      {
        header: 'ФИО',
        accessorKey: 'fullName',
        cell: ({ row, getValue }) => (
          <input
            value={(getValue() as string) ?? ''}
            onChange={(e) => updateTeacherFn(row.original.id, { fullName: e.target.value })}
            className="w-full rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-sm text-white outline-none focus:border-white/20"
            placeholder="Фамилия Имя Отчество"
          />
        ),
      },
      {
        header: 'Онлайн',
        accessorKey: 'isOnline',
        size: 80,
        cell: ({ row }) => (
          <label className="flex items-center justify-center">
            <input
              type="checkbox"
              checked={row.original.isOnline ?? false}
              onChange={(e) => updateTeacherFn(row.original.id, { isOnline: e.target.checked })}
              className="h-4 w-4 rounded border-white/20 bg-white/5 text-blue-500 focus:ring-2 focus:ring-blue-500"
            />
          </label>
        ),
      },
      {
        header: 'Коротко',
        accessorKey: 'shortName',
        cell: ({ row, getValue }) => (
          <input
            value={(getValue() as string) ?? ''}
            onChange={(e) => updateTeacherFn(row.original.id, { shortName: e.target.value })}
            className="w-full rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-sm text-white outline-none focus:border-white/20"
          />
        ),
      },
      {
        header: 'Email',
        accessorKey: 'email',
        cell: ({ row, getValue }) => (
          <input
            value={(getValue() as string) ?? ''}
            onChange={(e) => updateTeacherFn(row.original.id, { email: e.target.value })}
            className="w-full rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-sm text-white outline-none focus:border-white/20"
          />
        ),
      },
      {
        header: 'Телефон',
        accessorKey: 'phone',
        cell: ({ row, getValue }) => (
          <input
            value={(getValue() as string) ?? ''}
            onChange={(e) => updateTeacherFn(row.original.id, { phone: e.target.value })}
            className="w-full rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-sm text-white outline-none focus:border-white/20"
          />
        ),
      },
      {
        id: 'actions',
        header: '',
        cell: ({ row }) => (
          <button
            type="button"
            onClick={() => deleteTeacher(row.original.id)}
            className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-white/75 hover:bg-white/10 hover:text-white"
            title="Удалить"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        ),
      },
    ]
    },
    [], // Убираем зависимость от teachers, чтобы поля не теряли фокус
  )

  const table = useReactTable({
    data: teachers,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm text-white/70">
          Редактирование данных. Изменения сохраняются автоматически (LocalStorage).
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
            onClick={addTeacher}
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-sm font-semibold text-white hover:bg-white/15"
          >
            <Plus className="h-4 w-4" />
            Добавить преподавателя
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/10 fade-in">
        <div className="overflow-auto">
          <table className="min-w-[860px] w-full border-separate border-spacing-0">
            <thead className="sticky top-0 bg-black/30 backdrop-blur">
              {table.getHeaderGroups().map((hg) => (
                <tr key={hg.id}>
                  {hg.headers.map((h) => (
                    <th
                      key={h.id}
                      className="border-b border-white/10 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-white/60"
                    >
                      {h.isPlaceholder ? null : flexRender(h.column.columnDef.header, h.getContext())}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.map((r) => (
                <tr key={r.id} className="hover:bg-white/5">
                  {r.getVisibleCells().map((c) => (
                    <td key={c.id} className="border-b border-white/5 px-3 py-2 align-top">
                      {flexRender(c.column.columnDef.cell, c.getContext())}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}


