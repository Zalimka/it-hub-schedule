import { Pin, PinOff, Plus, Trash2 } from 'lucide-react'
import { useMemo } from 'react'
import { newId } from '../../shared/id'
import { useLocalStorageState } from '../../shared/useLocalStorageState'

type Note = {
  id: string
  title: string
  body: string
  pinned: boolean
  updatedAt: number
}

const STORAGE_KEY = 'itHub.notes.v1'

const defaultNotes: Note[] = [
  {
    id: newId('note'),
    title: 'О чем не забыть',
    body: '- Уточнить формат Excel “сетка часов”\n- Привязка предметов к неделям\n- Ограничения аудиторий',
    pinned: true,
    updatedAt: Date.now(),
  },
]

export function NotesPanel() {
  const [notes, setNotes] = useLocalStorageState<Note[]>(STORAGE_KEY, defaultNotes)

  const ordered = useMemo(() => {
    const sorted = [...notes].sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1
      return b.updatedAt - a.updatedAt
    })
    return sorted
  }, [notes])

  function addNote() {
    const now = Date.now()
    setNotes([
      {
        id: newId('note'),
        title: 'Новая заметка',
        body: '',
        pinned: false,
        updatedAt: now,
      },
      ...notes,
    ])
  }

  function updateNote(id: string, patch: Partial<Note>) {
    const now = Date.now()
    setNotes(notes.map((n) => (n.id === id ? { ...n, ...patch, updatedAt: now } : n)))
  }

  function deleteNote(id: string) {
    setNotes(notes.filter((n) => n.id !== id))
  }

  return (
    <div className="flex h-full flex-col p-3">
      <div className="flex items-center justify-between px-2 pb-2 pt-1">
        <div>
          <div className="text-xs font-medium tracking-wide text-white/60">Заметки</div>
          <div className="mt-1 text-base font-semibold text-white">Внутренние пометки</div>
        </div>
        <button
          type="button"
          onClick={addNote}
          className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-sm font-semibold text-white hover:bg-white/15"
        >
          <Plus className="h-4 w-4" />
          Новая
        </button>
      </div>

      <div className="min-h-0 flex-1 space-y-2 overflow-auto px-1 pb-2">
        {ordered.map((n) => (
          <div key={n.id} className="rounded-2xl border border-white/10 bg-black/10 p-3">
            <div className="flex items-start gap-2">
              <input
                value={n.title}
                onChange={(e) => updateNote(n.id, { title: e.target.value })}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-sm font-semibold text-white outline-none focus:border-white/20"
              />
              <button
                type="button"
                onClick={() => updateNote(n.id, { pinned: !n.pinned })}
                className="rounded-lg border border-white/10 bg-white/5 p-2 text-white/70 hover:bg-white/10 hover:text-white"
                title={n.pinned ? 'Открепить' : 'Закрепить'}
              >
                {n.pinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
              </button>
              <button
                type="button"
                onClick={() => deleteNote(n.id)}
                className="rounded-lg border border-white/10 bg-white/5 p-2 text-white/70 hover:bg-white/10 hover:text-white"
                title="Удалить"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>

            <textarea
              value={n.body}
              onChange={(e) => updateNote(n.id, { body: e.target.value })}
              placeholder="Текст заметки…"
              className="mt-2 min-h-[110px] w-full resize-y rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/90 outline-none placeholder:text-white/40 focus:border-white/20"
            />
          </div>
        ))}
      </div>
    </div>
  )
}


