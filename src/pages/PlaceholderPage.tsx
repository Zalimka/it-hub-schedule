export function PlaceholderPage({ title }: { title: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/10 p-6">
      <div className="text-lg font-semibold text-white">{title}</div>
      <div className="mt-2 text-sm text-white/70">
        Раздел подключен как заглушка. Следующий шаг — добавить таблицу/форму, импорт данных из Excel и валидацию.
      </div>
    </div>
  )
}


