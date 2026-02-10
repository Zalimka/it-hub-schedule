import { NavLink } from 'react-router-dom'
import { BookOpen, DoorOpen, GraduationCap, LayoutGrid, SlidersHorizontal, Users, BarChart3, TrendingUp } from 'lucide-react'
import type { ComponentType } from 'react'

type NavItem = {
  to: string
  label: string
  Icon: ComponentType<{ className?: string }>
  section?: string
}

const items: NavItem[] = [
  { to: '/app/preferences', label: 'Хотелки', Icon: SlidersHorizontal },
  { to: '/app/teachers', label: 'Преподаватели', Icon: Users },
  { to: '/app/subjects', label: 'Дисциплины', Icon: BookOpen },
  { to: '/app/rooms', label: 'Аудитории', Icon: DoorOpen },
  { to: '/app/groups', label: 'Группы', Icon: GraduationCap },
  { section: 'Расписание' },
  { to: '/app/schedule', label: 'Расписание группы', Icon: LayoutGrid },
  { to: '/app/satisfaction', label: 'Удовлетворенность', Icon: BarChart3 },
  { to: '/app/group-loads', label: 'Нагрузка групп', Icon: TrendingUp },
]

export function Sidebar() {
  return (
    <div className="flex h-full flex-col p-3">
      <div className="px-2 pb-2 pt-1">
        <div className="text-xs font-medium tracking-wide text-white/60">Навигация</div>
        <div className="mt-1 text-base font-semibold text-white">Расписание IT Hub</div>
      </div>

      <nav className="mt-2 flex flex-col gap-1">
        {items.map((item, idx) => {
          if (item.section) {
            return (
              <div key={idx} className="px-2 pt-3 pb-1">
                <div className="text-xs font-semibold uppercase tracking-wider text-white/40">
                  {item.section}
                </div>
              </div>
            )
          }
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                [
                  'flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition-all duration-200',
                  isActive
                    ? 'bg-white/12 text-white scale-105'
                    : 'text-white/75 hover:bg-white/8 hover:text-white hover:scale-105',
                ].join(' ')
              }
            >
              <item.Icon className="h-4 w-4" />
              <span className="truncate">{item.label}</span>
            </NavLink>
          )
        })}
      </nav>

      <div className="mt-auto px-2 pb-2 pt-4 text-xs text-white/45">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-2 w-2 rounded-full bg-emerald-400/80" />
          Локальный режим (без хостинга)
        </div>
      </div>
    </div>
  )
}


