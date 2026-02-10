import { useMemo, useRef } from 'react'
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table'
import type { ColumnDef } from '@tanstack/react-table'
import { Plus, Trash2, Upload } from 'lucide-react'
import type { TeacherPreference } from '../types/entities'
import { newId } from '../shared/id'
import { useLocalStorageState } from '../shared/useLocalStorageState'
import { importPreferencesFromExcel } from '../shared/excelImport'

const STORAGE_KEY = 'itHub.preferences.v1'

const defaultPreferences: TeacherPreference[] = []

export function PreferencesPage() {
  const [preferences, setPreferences] = useLocalStorageState<TeacherPreference[]>(
    STORAGE_KEY,
    defaultPreferences,
  )

  function addPreference() {
    setPreferences([
      ...preferences,
      {
        id: newId('p'),
        teacherFullName: '',
        schedulePreference: '',
      },
    ])
  }

  function updatePreference(id: string, patch: Partial<TeacherPreference>) {
    setPreferences(preferences.map((p) => (p.id === id ? { ...p, ...patch } : p)))
  }

  function deletePreference(id: string) {
    setPreferences((prev) => prev.filter((p) => p.id !== id))
  }

  const fileInputRef = useRef<HTMLInputElement>(null)

  async function handleImportExcel() {
    const file = fileInputRef.current?.files?.[0]
    if (!file) {
      fileInputRef.current?.click()
      return
    }

    try {
      const imported = await importPreferencesFromExcel(file)
      const existingNames = new Set(preferences.map((p) => p.teacherFullName.toLowerCase()))
      const newPreferences = imported.filter((p) => !existingNames.has(p.teacherFullName.toLowerCase()))
      setPreferences([...preferences, ...newPreferences])
      alert(`Импортировано ${newPreferences.length} пожеланий`)
      if (fileInputRef.current) fileInputRef.current.value = ''
    } catch (error) {
      alert(`Ошибка импорта: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`)
    }
  }

  const columns = useMemo<ColumnDef<TeacherPreference>[]>(
    () => {
      const updatePreferenceFn = (id: string, patch: Partial<TeacherPreference>) => {
        setPreferences((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)))
      }

      return [
      {
        header: 'ФИО преподавателя',
        accessorKey: 'teacherFullName',
        cell: ({ row, getValue }) => (
          <input
            value={(getValue() as string) ?? ''}
            onChange={(e) => updatePreferenceFn(row.original.id, { teacherFullName: e.target.value })}
            className="w-full rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-sm text-white outline-none focus:border-white/20"
            placeholder="Фамилия Имя Отчество"
          />
        ),
      },
      {
        header: 'Расписание',
        accessorKey: 'schedulePreference',
        cell: ({ row, getValue }) => (
          <textarea
            value={(getValue() as string) ?? ''}
            onChange={(e) => updatePreferenceFn(row.original.id, { schedulePreference: e.target.value })}
            className="w-full min-h-[60px] rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-sm text-white outline-none focus:border-white/20"
            placeholder="ВТ 3-4 пары, СР 1-3 пары, ЧТ весь день, Не занимать ВТ и ЧТ..."
          />
        ),
      },
      {
        header: 'Удовлетворенность',
        accessorKey: 'satisfaction',
        size: 150,
        cell: ({ row, getValue }) => (
          <div className="flex items-center gap-2">
            <input
              type="number"
              min="0"
              max="100"
              value={(getValue() as number) ?? ''}
              onChange={(e) =>
                updatePreferenceFn(row.original.id, {
                  satisfaction: e.target.value ? Number(e.target.value) : undefined,
                })
              }
              className="w-20 rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-sm text-white outline-none focus:border-white/20"
              placeholder="90"
            />
            <span className="text-xs text-white/50">%</span>
          </div>
        ),
      },
      {
        id: 'actions',
        header: '',
        size: 60,
        cell: ({ row }) => (
          <button
            type="button"
            onClick={() => deletePreference(row.original.id)}
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
    data: preferences,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm text-white/70">
          Пожелания преподавателей по расписанию. Допускается погрешность в удовлетворении требований до 10%.
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
            onClick={addPreference}
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-sm font-semibold text-white hover:bg-white/15"
          >
            <Plus className="h-4 w-4" />
            Добавить пожелание
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/10 fade-in">
        <div className="overflow-auto">
          <table className="min-w-[900px] w-full border-separate border-spacing-0">
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
                    Нет данных. Добавьте пожелания вручную или импортируйте из Excel.
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

