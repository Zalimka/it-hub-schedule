export function newId(prefix = 'id') {
  // crypto.randomUUID is supported in modern browsers
  // fallback keeps it safe for older environments
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}_${crypto.randomUUID()}`
  }
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`
}


