import { num } from '@/lib/format'

export function ColumnChart({
  data,
}: {
  data: { label: string; bar: number; line?: number }[]
}) {
  if (!data.length) return <p className="muted text-sm">No figures in this range.</p>
  const width = 520
  const height = 168
  const pad = 8
  const maxBar = Math.max(...data.map((item) => item.bar), 1)
  const maxLine = Math.max(...data.map((item) => item.line || 0), 1)
  const slot = (width - pad * 2) / data.length
  const barWidth = Math.min(18, slot * 0.55)
  const points = data.map((item, index) => {
    const x = pad + slot * index + slot / 2
    const y = height - ((item.line || 0) / maxLine) * (height - 16) - 8
    return `${x},${y}`
  })
  return (
    <svg className="chart-svg" viewBox={`0 0 ${width} ${height + 22}`} role="img">
      {data.map((item, index) => {
        const barHeight = Math.max(4, (item.bar / maxBar) * (height - 16))
        const x = pad + slot * index + (slot - barWidth) / 2
        return (
          <g key={`${item.label}-${index}`}>
            <rect x={x} y={height - barHeight} width={barWidth} height={barHeight} rx={6} fill={index % 2 ? '#a8c98a' : '#3f7a3a'} />
            {index === 0 || item.label !== data[index - 1].label ? <text x={pad + slot * index + slot / 2} y={height + 16} textAnchor="start" fontSize="11" fill="#6d7872">{item.label}</text> : null}
          </g>
        )
      })}
      <polyline points={points.join(' ')} fill="none" stroke="#f08a3a" strokeWidth="2" strokeDasharray="4 4" strokeLinejoin="round" />
    </svg>
  )
}

export function Gauge({ value, caption }: { value: number; caption: string }) {
  const pct = Math.max(0, Math.min(100, Math.round(value)))
  const radius = 58
  const circ = 2 * Math.PI * radius
  const dash = (pct / 100) * circ
  return (
    <div className="gauge">
      <svg viewBox="0 0 150 150" role="img" aria-label={`${pct}% ${caption}`}>
        <circle cx="75" cy="75" r={radius} fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="12" />
        <circle
          cx="75" cy="75" r={radius} fill="none" stroke="#1f4d32" strokeWidth="12"
          strokeLinecap="round" strokeDasharray={`${dash} ${circ - dash}`}
          transform="rotate(-90 75 75)"
        />
      </svg>
      <div className="gauge-read">
        <div>
          <strong>{pct}%</strong>
          <span>{caption}</span>
        </div>
      </div>
    </div>
  )
}

export function Bars({
  data,
  format = (value: number) => num(value),
}: {
  data: { label: string; value: number }[]
  format?: (value: number) => string
}) {
  if (!data.length) return <p className="muted text-sm">No figures in this range.</p>
  const max = Math.max(...data.map((item) => Number(item.value) || 0), 1)
  return (
    <div className="bars">
      {data.map((item) => (
        <div className="bar-row" key={item.label}>
          <div>{item.label}</div>
          <div className="bar-track">
            <div className="bar-fill" style={{ width: `${Math.max(3, (Number(item.value) / max) * 100)}%` }} />
          </div>
          <div className="bar-value">{format(Number(item.value))}</div>
        </div>
      ))}
    </div>
  )
}
