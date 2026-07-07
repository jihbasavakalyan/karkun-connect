export function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10)
}

export function tomorrowIsoDate(): string {
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  return tomorrow.toISOString().slice(0, 10)
}
