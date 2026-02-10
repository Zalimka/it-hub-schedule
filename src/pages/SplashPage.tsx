import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

export function SplashPage() {
  const navigate = useNavigate()

  useEffect(() => {
    const t = window.setTimeout(() => {
      navigate('/app/teachers', { replace: true })
    }, 1100)
    return () => window.clearTimeout(t)
  }, [navigate])

  return (
    <div className="flex h-full items-center justify-center bg-[radial-gradient(1200px_800px_at_20%_-10%,rgba(99,102,241,0.25),transparent_60%),radial-gradient(900px_600px_at_80%_0%,rgba(16,185,129,0.18),transparent_55%),linear-gradient(to_bottom,rgba(255,255,255,0.06),transparent_35%)]">
      <div
        className="max-w-[820px] rounded-3xl border border-white/10 bg-white/5 p-10 text-center backdrop-blur"
        style={{ animation: 'fadeIn 800ms ease-out both' }}
      >
        <div className="text-sm font-medium tracking-wide text-white/60">IT Hub • Генератор расписания</div>
        <div className="mt-3 text-3xl font-extrabold text-white">Здравствуйте, Кристина Александровна!</div>
        <div className="mt-3 text-sm text-white/70">
          Подготавливаем рабочее пространство… сейчас откроется интерфейс редактирования данных.
        </div>
      </div>
    </div>
  )
}


