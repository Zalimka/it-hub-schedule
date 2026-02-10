import { useMemo, useRef } from 'react'
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table'
import type { ColumnDef } from '@tanstack/react-table'
import { Plus, Trash2, Upload } from 'lucide-react'
import type { Group } from '../types/entities'
import { newId } from '../shared/id'
import { useLocalStorageState } from '../shared/useLocalStorageState'
import { importGroupsFromExcel } from '../shared/excelImport'
import { importGroupsFromText } from '../shared/textImport'

const STORAGE_KEY = 'itHub.groups.v1'

const defaultGroups: Group[] = []

export function GroupsPage() {
  const [groups, setGroups] = useLocalStorageState<Group[]>(STORAGE_KEY, defaultGroups)

  function addGroup() {
    setGroups([
      ...groups,
      {
        id: newId('g'),
        name: '',
      },
    ])
  }

  function updateGroup(id: string, patch: Partial<Group>) {
    setGroups(groups.map((g) => (g.id === id ? { ...g, ...patch } : g)))
  }

  function deleteGroup(id: string) {
    setGroups((prev) => prev.filter((g) => g.id !== id))
  }

  const fileInputRef = useRef<HTMLInputElement>(null)

  async function handleImportExcel() {
    const file = fileInputRef.current?.files?.[0]
    if (!file) {
      fileInputRef.current?.click()
      return
    }

    try {
      let imported: Group[] = []
      
      // Определяем тип файла
      const fileName = file.name.toLowerCase()
      if (fileName.endsWith('.txt') || fileName.endsWith('.doc') || fileName.endsWith('.docx')) {
        // Текстовый файл (Word можно сохранить как .txt)
        imported = await importGroupsFromText(file)
      } else {
        // Excel файл
        imported = await importGroupsFromExcel(file)
      }
      
      const existingNames = new Set(groups.map((g) => g.name.toLowerCase()))
      const newGroups = imported.filter((g) => !existingNames.has(g.name.toLowerCase()))
      setGroups([...groups, ...newGroups])
      alert(`Импортировано ${newGroups.length} групп`)
      if (fileInputRef.current) fileInputRef.current.value = ''
    } catch (error) {
      alert(`Ошибка импорта: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`)
    }
  }

  const columns = useMemo<ColumnDef<Group>[]>(
    () => {
      const updateGroupFn = (id: string, patch: Partial<Group>) => {
        setGroups((prev) => prev.map((g) => (g.id === id ? { ...g, ...patch } : g)))
      }

      return [
      {
        header: 'Наименование группы',
        accessorKey: 'name',
        cell: ({ row, getValue }) => (
          <input
            value={(getValue() as string) ?? ''}
            onChange={(e) => updateGroupFn(row.original.id, { name: e.target.value })}
            className="w-full rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-sm text-white outline-none focus:border-white/20"
            placeholder="1ИТ1.9.25, 2Д1.9.24, ЗИТП1.9.23..."
          />
        ),
      },
      {
        header: 'Факультет',
        accessorKey: 'faculty',
        cell: ({ row, getValue }) => (
          <input
            value={(getValue() as string) ?? ''}
            onChange={(e) => updateGroupFn(row.original.id, { faculty: e.target.value || undefined })}
            className="w-full rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-sm text-white outline-none focus:border-white/20"
            placeholder="ИТ, Дизайн, Маркетинг..."
          />
        ),
      },
      {
        header: 'Размер',
        accessorKey: 'size',
        size: 100,
        cell: ({ row, getValue }) => (
          <input
            type="number"
            value={(getValue() as number) ?? ''}
            onChange={(e) => updateGroupFn(row.original.id, { size: e.target.value ? Number(e.target.value) : undefined })}
            className="w-full rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-sm text-white outline-none focus:border-white/20"
            placeholder="Количество студентов"
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
            onClick={() => deleteGroup(row.original.id)}
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
    data: groups,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm text-white/70">
          Редактирование групп. Изменения сохраняются автоматически (LocalStorage).
        </div>
        <div className="flex gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.txt,.doc,.docx"
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
            onClick={addGroup}
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-sm font-semibold text-white hover:bg-white/15"
          >
            <Plus className="h-4 w-4" />
            Добавить группу
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/10 fade-in">
        <div className="overflow-auto">
          <table className="min-w-[600px] w-full border-separate border-spacing-0">
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
                    Нет данных. Добавьте группы вручную или импортируйте из Excel.
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

