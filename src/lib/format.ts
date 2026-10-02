const currency = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0, maximumFractionDigits: 0 })
const date = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })

export const formatMoney = (n: number) => currency.format(n)
export const formatDate = (d: Date) => date.format(d)

/** Date -> "YYYY-MM-DD" in local time, for <input type="date">. */
export const toDateInput = (d: Date | null) =>
  d ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` : ''

/** "YYYY-MM-DD" -> local Date at midnight, or null if empty. */
export const fromDateInput = (s: string) => {
  if (!s) return null
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}
