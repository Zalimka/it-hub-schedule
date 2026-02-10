import { useMemo, useRef } from 'react'
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table'
import type { ColumnDef } from '@tanstack/react-table'
import { Plus, Trash2, Upload } from 'lucide-react'
import type { Room } from '../types/entities'
import { newId } from '../shared/id'
import { useLocalStorageState } from '../shared/useLocalStorageState'
import { importRoomsFromExcel } from '../shared/excelImport'

const STORAGE_KEY = 'itHub.rooms.v1'

const defaultRooms: Room[] = []

export function RoomsPage() {
  const [rooms, setRooms] = useLocalStorageState<Room[]>(STORAGE_KEY, defaultRooms)

  function addRoom() {
    setRooms([
      ...rooms,
      {
        id: newId('r'),
        number: '',
        type: 'комп',
        capacity: undefined,
      },
    ])
  }

  function updateRoom(id: string, patch: Partial<Room>) {
    setRooms(rooms.map((r) => (r.id === id ? { ...r, ...patch } : r)))
  }

  function deleteRoom(id: string) {
    setRooms((prev) => prev.filter((r) => r.id !== id))
  }

  const fileInputRef = useRef<HTMLInputElement>(null)

  async function handleImportExcel() {
    const file = fileInputRef.current?.files?.[0]
    if (!file) {
      fileInputRef.current?.click()
      return
    }

    try {
      const imported = await importRoomsFromExcel(file)
      const existingNumbers = new Set(rooms.map((r) => r.number.toLowerCase()))
      const newRooms = imported.filter((r) => !existingNumbers.has(r.number.toLowerCase()))
      setRooms([...rooms, ...newRooms])
      alert(`Импортировано ${newRooms.length} аудиторий`)
      if (fileInputRef.current) fileInputRef.current.value = ''
    } catch (error) {
      alert(`Ошибка импорта: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`)
    }
  }

  const columns = useMemo<ColumnDef<Room>[]>(
    () => {
      const updateRoomFn = (id: string, patch: Partial<Room>) => {
        setRooms((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)))
      }

      return [
      {
        header: 'Номер аудитории',
        accessorKey: 'number',
        cell: ({ row, getValue }) => (
          <input
            value={(getValue() as string) ?? ''}
            onChange={(e) => updateRoomFn(row.original.id, { number: e.target.value })}
            className="w-full rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-sm text-white outline-none focus:border-white/20"
            placeholder="301, 304a, 402..."
          />
        ),
      },
      {
        header: 'Тип',
        accessorKey: 'type',
        size: 120,
        cell: ({ row, getValue }) => (
          <select
            value={(getValue() as string) ?? 'комп'}
            onChange={(e) => updateRoomFn(row.original.id, { type: e.target.value as Room['type'] })}
            className="w-full rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-sm text-white outline-none focus:border-white/20"
          >
            <option value="комп">комп</option>
            <option value="лекц">лекц</option>
            <option value="ноут">ноут</option>
            <option value="диз">диз</option>
            <option value="other">другое</option>
          </select>
        ),
      },
      {
        header: 'Доп. тип',
        accessorKey: 'additionalType',
        size: 100,
        cell: ({ row, getValue }) => (
          <input
            value={(getValue() as string) ?? ''}
            onChange={(e) => updateRoomFn(row.original.id, { additionalType: e.target.value || undefined })}
            className="w-full rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-sm text-white outline-none focus:border-white/20"
            placeholder="диз, ..."
          />
        ),
      },
      {
        header: 'Вместимость',
        accessorKey: 'capacity',
        size: 100,
        cell: ({ row, getValue }) => (
          <input
            type="number"
            value={(getValue() as number) ?? ''}
            onChange={(e) => updateRoomFn(row.original.id, { capacity: e.target.value ? Number(e.target.value) : undefined })}
            className="w-full rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-sm text-white outline-none focus:border-white/20"
            placeholder="24, 12..."
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
            onClick={() => deleteRoom(row.original.id)}
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
    data: rooms,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm text-white/70">
          Редактирование аудиторий. Изменения сохраняются автоматически (LocalStorage).
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
            onClick={addRoom}
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-sm font-semibold text-white hover:bg-white/15"
          >
            <Plus className="h-4 w-4" />
            Добавить аудиторию
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/10 fade-in">
        <div className="overflow-auto">
          <table className="min-w-[700px] w-full border-separate border-spacing-0">
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
                    Нет данных. Добавьте аудитории вручную или импортируйте из Excel.
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

