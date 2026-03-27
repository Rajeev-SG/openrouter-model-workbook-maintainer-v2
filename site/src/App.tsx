import { useEffect, useState, type ReactNode } from 'react'
import clsx from 'clsx'
import {
  AlertTriangle,
  ArrowUpDown,
  ArrowUpRight,
  BrainCircuit,
  Clock3,
  Coins,
  FileClock,
  Layers3,
  Search,
  Workflow,
} from 'lucide-react'
import './index.css'
import type { GuideRow, ScenarioRow, SourceManifest } from './types'
import { formatCompact, formatCurrency, formatNumber, titleCase } from './utils'

type LoadState = {
  cohort: GuideRow[]
  scenarios: ScenarioRow[]
  manifest: SourceManifest
}

const scenarioPresets = [
  {
    id: 'coding',
    category: 'Coding',
    icon: Workflow,
  },
  {
    id: 'reasoning',
    category: 'Reasoning',
    icon: BrainCircuit,
  },
  {
    id: 'budget',
    category: 'Budget',
    icon: Coins,
  },
  {
    id: 'latency',
    category: 'Latency',
    icon: Clock3,
  },
  {
    id: 'long_context',
    category: 'Context',
    icon: Layers3,
  },
] as const

const tableSortOptions = [
  { key: 'model', label: 'Model A-Z', direction: 'asc' },
  { key: 'cost', label: 'Lowest cost', direction: 'asc' },
  { key: 'speed', label: 'Fastest output', direction: 'desc' },
  { key: 'context', label: 'Most context', direction: 'desc' },
  { key: 'intelligence', label: 'Highest AA intelligence', direction: 'desc' },
  { key: 'terminalbench', label: 'Best Terminal-Bench', direction: 'desc' },
] as const

export default function App() {
  const [data, setData] = useState<LoadState | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [providerFilter, setProviderFilter] = useState('all')
  const [sortKey, setSortKey] = useState<(typeof tableSortOptions)[number]['key']>('model')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [activePreset, setActivePreset] = useState<(typeof scenarioPresets)[number]['id']>('coding')
  const [selectedModels, setSelectedModels] = useState<string[]>([])
  const [pendingScrollId, setPendingScrollId] = useState<string | null>(null)
  const [focusedRowId, setFocusedRowId] = useState<string | null>(null)

  useEffect(() => {
    const base = import.meta.env.BASE_URL
    Promise.all([
      fetch(`${base}data/latest/guide_cohort.json`).then((response) => response.json()),
      fetch(`${base}data/latest/scenario_scores.json`).then((response) => response.json()),
      fetch(`${base}data/latest/source_manifest.json`).then((response) => response.json()),
    ])
      .then(([cohort, scenarios, manifest]) => setData({ cohort, scenarios, manifest }))
      .catch((fetchError) => {
        console.error(fetchError)
        setError('Generated datasets are missing or failed to load.')
      })
  }, [])

  const scenarioScores = new Map<string, ScenarioRow>()
  if (data) {
    for (const row of data.scenarios) {
      scenarioScores.set(`${row.canonical_model_id}::${row.scenario_profile}`, row)
    }
  }

  const presetLeaders = new Map<string, GuideRow>()
  if (data) {
    for (const preset of scenarioPresets) {
      const leader = [...data.cohort].sort((left, right) =>
        compareScenarioRows(left, right, scenarioScores, preset.id),
      )[0]
      if (leader) {
        presetLeaders.set(preset.id, leader)
      }
    }
  }

  const providers = data ? ['all', ...new Set(data.cohort.map((row) => row.provider).sort())] : ['all']
  const tableRows = data
    ? [...data.cohort]
        .filter((row) => {
          const needle = search.trim().toLowerCase()
          if (!needle) {
            return true
          }
          return [
            row.canonical_family,
            row.canonical_variant,
            row.provider,
            formatReasoningMode(row.reasoning_mode),
          ]
            .join(' ')
            .toLowerCase()
            .includes(needle)
        })
        .filter((row) => providerFilter === 'all' || row.provider === providerFilter)
        .sort((left, right) => compareRows(left, right, sortKey, sortDirection))
    : []

  const selectedDetails = data
    ? selectedModels
        .map(
          (id) =>
            tableRows.find((row) => row.canonical_model_id === id) ??
            data.cohort.find((row) => row.canonical_model_id === id),
        )
        .filter((row): row is GuideRow => Boolean(row))
    : []

  const latestRefresh = data ? latestManifestDate(data.manifest) : null
  const workbookUrl = `${import.meta.env.BASE_URL}downloads/model-intelligence-workbook.xlsx`
  const providerCount = data ? new Set(data.cohort.map((row) => row.provider)).size : 0
  const pendingTargetVisible = pendingScrollId
    ? tableRows.some((row) => row.canonical_model_id === pendingScrollId)
    : false

  useEffect(() => {
    if (!pendingScrollId) {
      return
    }

    if (!pendingTargetVisible) {
      return
    }

    const timer = window.setTimeout(() => {
      const target = document.getElementById(modelRowId(pendingScrollId))
      if (!target) {
        return
      }
      target.scrollIntoView({ behavior: 'smooth', block: 'center' })
      setFocusedRowId(pendingScrollId)
      window.setTimeout(() => {
        setFocusedRowId((current) => (current === pendingScrollId ? null : current))
      }, 1800)
      setPendingScrollId(null)
    }, 40)

    return () => window.clearTimeout(timer)
  }, [pendingScrollId, pendingTargetVisible])

  if (error) {
    return (
      <main className="min-h-screen bg-[var(--surface)] px-6 py-10 text-[var(--ink)]">
        <section className="mx-auto max-w-5xl border border-[var(--ghost-line)] bg-[var(--surface-bright)] p-8">
          <div className="flex items-center gap-3 text-[var(--rust)]">
            <AlertTriangle className="h-5 w-5" />
            <p className="text-sm uppercase tracking-[0.3em]">Dataset load failed</p>
          </div>
          <h1 className="mt-4 font-[var(--font-serif)] text-4xl leading-tight">
            Build the datasets first, then reopen the guide.
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-[var(--ink-muted)]">
            Run <code>make build</code> or <code>make refresh</code> so the static JSON payloads
            exist under <code>site/public/data/latest</code>.
          </p>
        </section>
      </main>
    )
  }

  if (!data) {
    return (
      <main className="grid min-h-screen place-items-center bg-[var(--surface)] text-[var(--ink)]">
        <div className="flex items-center gap-3 text-sm uppercase tracking-[0.28em] text-[var(--teal-700)]">
          <FileClock className="h-4 w-4 animate-pulse" />
          Loading model intelligence guide
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[var(--surface)] text-[var(--ink)]">
      <header className="border-b border-[var(--ghost-line)] bg-[var(--surface-bright)]">
        <div className="mx-auto max-w-[1600px] px-4 py-5 md:px-6">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-4xl">
              <p className="text-[11px] uppercase tracking-[0.34em] text-[var(--teal-700)]">
                Model Intelligence Guide
              </p>
              <h1 className="mt-3 font-[var(--font-serif)] text-3xl leading-none md:text-5xl">
                Compare models in one pass.
              </h1>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:w-[520px]">
              <KpiCard label="Models" value={`${data.cohort.length}`} meta="Matched guide cohort" />
              <KpiCard label="Providers" value={`${providerCount}`} meta="OpenRouter coverage" />
              <KpiCard label="Selected" value={`${selectedDetails.length}`} meta="Compare queue" />
              <KpiCard label="Updated" value={formatShortDate(latestRefresh)} meta="Latest rebuild" />
            </div>
          </div>

          <section className="mt-5">
            <div className="flex items-center justify-between gap-3">
              <p className="section-kicker">Task presets</p>
              <a className="text-xs underline text-[var(--ink-muted)]" href={workbookUrl}>
                Download workbook
              </a>
            </div>

            <div className="preset-rail preset-rail-compact mt-3">
              {scenarioPresets.map((preset) => {
                const leader = presetLeaders.get(preset.id)
                const Icon = preset.icon
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => {
                      setActivePreset(preset.id)
                      setSearch('')
                      setProviderFilter('all')
                      if (leader) {
                        setPendingScrollId(leader.canonical_model_id)
                      }
                    }}
                    className={clsx(
                      'preset-card preset-card-compact',
                      preset.id === activePreset && 'preset-card-active',
                    )}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[11px] uppercase tracking-[0.24em] text-[var(--ink-soft)]">
                          {preset.category}
                        </p>
                        <p className="mt-1 truncate text-sm font-semibold text-[var(--ink)] md:text-base">
                          {leader?.canonical_family ?? 'No current match'}
                        </p>
                      </div>
                      <Icon className="h-4 w-4 shrink-0 text-[var(--teal-700)]" />
                    </div>
                  </button>
                )
              })}
            </div>
          </section>
        </div>
      </header>

      <section className="mx-auto max-w-[1600px] space-y-5 px-4 py-5 md:px-6">
        <Panel title="Compare Models" icon={ArrowUpDown}>
          <div className="filter-band filter-band-compact mb-4">
            <div className="grid gap-4 md:grid-cols-[minmax(0,2fr)_220px_260px]">
              <label className="block">
                <span className="field-label">Search</span>
                <div className="field-shell">
                  <Search className="h-4 w-4 text-[var(--ink-soft)]" />
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    className="field-input"
                    placeholder="Model, variant, provider"
                  />
                </div>
              </label>

              <label className="block">
                <span className="field-label">Provider</span>
                <select
                  className="field-select"
                  value={providerFilter}
                  onChange={(event) => setProviderFilter(event.target.value)}
                >
                  {providers.map((provider) => (
                    <option key={provider} value={provider}>
                      {provider === 'all' ? 'All providers' : provider}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="field-label">Sort rows by</span>
                <select
                  className="field-select"
                  value={sortKey}
                  onChange={(event) => {
                    const nextKey = event.target.value as (typeof tableSortOptions)[number]['key']
                    const option = tableSortOptions.find((item) => item.key === nextKey)
                    setSortKey(nextKey)
                    setSortDirection((option?.direction ?? 'asc') as 'asc' | 'desc')
                  }}
                >
                  {tableSortOptions.map((option) => (
                    <option key={option.key} value={option.key}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="mt-4 flex flex-wrap gap-2 text-xs text-[var(--ink-muted)]">
              <span className="chip">Rows shown: {tableRows.length}</span>
              <span className="chip">Metrics link to source pages</span>
              <span className="chip">Preset buttons jump to current leaders</span>
            </div>
          </div>

          {selectedDetails.length > 0 ? (
            <div className="compare-shelf mb-4">
              {selectedDetails.map((row) => (
                <article key={row.canonical_model_id} className="surface-panel">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--ink-soft)]">
                        {formatReasoningMode(row.reasoning_mode)}
                      </p>
                      <h3 className="mt-2 text-lg font-semibold leading-tight">{row.canonical_family}</h3>
                      <p className="mt-1 text-sm text-[var(--ink-muted)]">{row.provider}</p>
                    </div>
                    <button
                      type="button"
                      className="chip"
                      onClick={() => toggleSelection(row.canonical_model_id, selectedModels, setSelectedModels)}
                    >
                      Remove
                    </button>
                  </div>
                  <SourceLinks row={row} className="source-links-compact mt-3" />
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <MiniStat label="Cost" value={formatCurrency(row.openrouter_blended_price_per_million)} />
                    <MiniStat label="Speed" value={formatSpeed(row.aa_median_tokens_per_second)} />
                    <MiniStat label="Context" value={formatCompact(row.openrouter_context_tokens)} />
                    <MiniStat label="AA intelligence" value={formatNumber(row.aa_intelligence_index, 1)} />
                  </div>
                </article>
              ))}
            </div>
          ) : null}

          <div className="hidden overflow-x-auto lg:block">
            <table className="w-full min-w-[1180px] border-collapse text-left">
              <thead>
                <tr>
                  <th className="table-head">Compare</th>
                  <th className="table-head">Model</th>
                  <th className="table-head">Cost</th>
                  <th className="table-head">Speed</th>
                  <th className="table-head">Context</th>
                  <th className="table-head">AA overall intelligence rating</th>
                  <th className="table-head">Terminal-Bench@2.0 leaderboard rating</th>
                </tr>
              </thead>
              <tbody>
                {tableRows.map((row) => {
                  const selected = selectedModels.includes(row.canonical_model_id)
                  const terminalMetric = getTerminalBenchMetric(row)
                  return (
                    <tr
                      key={row.canonical_model_id}
                      id={modelRowId(row.canonical_model_id)}
                      className={clsx(
                        selected ? 'table-row-selected' : 'table-row',
                        focusedRowId === row.canonical_model_id && 'table-row-focused',
                      )}
                    >
                      <td className="table-cell align-top">
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={() => toggleSelection(row.canonical_model_id, selectedModels, setSelectedModels)}
                          aria-label={`Compare ${row.canonical_family}`}
                        />
                      </td>
                      <td className="table-cell table-model-cell">
                        <p className="font-medium">{row.canonical_family}</p>
                        <p className="mt-1 text-xs uppercase tracking-[0.18em] text-[var(--ink-soft)]">
                          {row.canonical_variant} · {row.provider}
                        </p>
                        <p className="mt-2 text-xs text-[var(--ink-muted)]">
                          {formatReasoningMode(row.reasoning_mode)}
                        </p>
                        <SourceLinks row={row} className="mt-3" />
                      </td>
                      <td className="table-cell align-top">
                        <MetricLink
                          value={formatCurrency(row.openrouter_blended_price_per_million)}
                          href={openRouterSourceUrl(row)}
                          label={`Open cost source for ${row.canonical_family}`}
                        />
                      </td>
                      <td className="table-cell align-top">
                        <MetricLink
                          value={formatSpeed(row.aa_median_tokens_per_second)}
                          href={aaSourceUrl(row)}
                          label={`Open speed source for ${row.canonical_family}`}
                        />
                      </td>
                      <td className="table-cell align-top">
                        <MetricLink
                          value={formatCompact(row.openrouter_context_tokens)}
                          href={openRouterSourceUrl(row)}
                          label={`Open context source for ${row.canonical_family}`}
                        />
                      </td>
                      <td className="table-cell align-top">
                        <MetricLink
                          value={formatNumber(row.aa_intelligence_index, 1)}
                          href={aaSourceUrl(row)}
                          label={`Open AA intelligence source for ${row.canonical_family}`}
                        />
                      </td>
                      <td className="table-cell align-top">
                        <MetricLink
                          value={terminalMetric.value}
                          note={terminalMetric.note}
                          href={terminalMetric.href}
                          label={`Open terminal benchmark source for ${row.canonical_family}`}
                        />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <div className="space-y-3 lg:hidden">
            {tableRows.map((row) => {
              const selected = selectedModels.includes(row.canonical_model_id)
              const terminalMetric = getTerminalBenchMetric(row)
              return (
                <article
                  key={row.canonical_model_id}
                  id={modelRowId(row.canonical_model_id)}
                  className={clsx(
                    'mobile-model-card',
                    selected && 'mobile-model-card-selected',
                    focusedRowId === row.canonical_model_id && 'table-row-focused',
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.24em] text-[var(--ink-soft)]">
                        {formatReasoningMode(row.reasoning_mode)}
                      </p>
                      <h3 className="mt-2 text-lg font-semibold leading-tight">{row.canonical_family}</h3>
                      <p className="mt-1 text-sm text-[var(--ink-muted)]">
                        {row.canonical_variant} · {row.provider}
                      </p>
                    </div>
                    <label className="text-xs text-[var(--ink-muted)]">
                      <input
                        type="checkbox"
                        className="mr-2"
                        checked={selected}
                        onChange={() => toggleSelection(row.canonical_model_id, selectedModels, setSelectedModels)}
                      />
                      Compare
                    </label>
                  </div>
                  <SourceLinks row={row} className="source-links-compact mt-3" />
                  <div className="mt-4 grid gap-2">
                    <MetricLink
                      value={`Cost ${formatCurrency(row.openrouter_blended_price_per_million)}`}
                      href={openRouterSourceUrl(row)}
                      label={`Open cost source for ${row.canonical_family}`}
                    />
                    <MetricLink
                      value={`Speed ${formatSpeed(row.aa_median_tokens_per_second)}`}
                      href={aaSourceUrl(row)}
                      label={`Open speed source for ${row.canonical_family}`}
                    />
                    <MetricLink
                      value={`Context ${formatCompact(row.openrouter_context_tokens)}`}
                      href={openRouterSourceUrl(row)}
                      label={`Open context source for ${row.canonical_family}`}
                    />
                    <MetricLink
                      value={`AA intelligence ${formatNumber(row.aa_intelligence_index, 1)}`}
                      href={aaSourceUrl(row)}
                      label={`Open AA intelligence source for ${row.canonical_family}`}
                    />
                    <MetricLink
                      value={`Terminal-Bench ${terminalMetric.value}`}
                      note={terminalMetric.note}
                      href={terminalMetric.href}
                      label={`Open terminal benchmark source for ${row.canonical_family}`}
                    />
                  </div>
                </article>
              )
            })}
          </div>
        </Panel>
      </section>
    </main>
  )
}

function Panel({
  title,
  icon: Icon,
  children,
}: {
  title: string
  icon: typeof Search
  children: ReactNode
}) {
  return (
    <section className="border border-[var(--ghost-line)] bg-[var(--surface-bright)] p-4 md:p-5">
      <div className="mb-4 flex items-center justify-between gap-3 border-b border-[var(--ghost-line)] pb-3">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-[var(--teal-700)]" />
          <h2 className="font-[var(--font-serif)] text-2xl">{title}</h2>
        </div>
      </div>
      {children}
    </section>
  )
}

function KpiCard({
  label,
  value,
  meta,
}: {
  label: string
  value: string
  meta: string
}) {
  return (
    <div className="border border-[var(--ghost-line)] bg-[var(--surface)] px-3 py-3">
      <p className="text-[11px] uppercase tracking-[0.24em] text-[var(--ink-soft)]">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-[var(--teal-700)]">{value}</p>
      <p className="mt-1 text-xs text-[var(--ink-muted)]">{meta}</p>
    </div>
  )
}

function MetricLink({
  value,
  note,
  href,
  label,
}: {
  value: string
  note?: string | null
  href?: string | null
  label: string
}) {
  if (!href || value === '—') {
    return (
      <div className="metric-link metric-link-static">
        <span>{value}</span>
        {note ? <span className="metric-link-note">{note}</span> : null}
      </div>
    )
  }

  return (
    <a href={href} target="_blank" rel="noreferrer" className="metric-link" aria-label={label}>
      <span className="metric-link-main">
        <span>{value}</span>
        <ArrowUpRight className="h-3.5 w-3.5 shrink-0" />
      </span>
      {note ? <span className="metric-link-note">{note}</span> : null}
    </a>
  )
}

function SourceLinks({
  row,
  className = '',
}: {
  row: GuideRow
  className?: string
}) {
  const links = [
    {
      label: 'OpenRouter',
      href: openRouterSourceUrl(row),
    },
    {
      label: 'AA',
      href: aaSourceUrl(row),
    },
    {
      label: 'Vals',
      href: typeof row.vals_model_url === 'string' ? row.vals_model_url : null,
    },
    {
      label: 'SWE-bench',
      href: typeof row.swebench_leaderboard_url === 'string' ? row.swebench_leaderboard_url : null,
    },
    {
      label: 'Toolathlon',
      href: typeof row.toolathlon_leaderboard_url === 'string' ? row.toolathlon_leaderboard_url : null,
    },
  ].filter((item): item is { label: string; href: string } => Boolean(item.href))

  if (links.length === 0) {
    return null
  }

  return (
    <div className={`source-links flex flex-wrap gap-2 ${className}`.trim()}>
      {links.map((link) => (
        <a
          key={link.label}
          href={link.href}
          target="_blank"
          rel="noreferrer"
          className="chip chip-link"
          aria-label={`Open ${link.label} in a new tab`}
        >
          <span className="chip-link-label">{link.label}</span>
          <span className="chip-link-action" aria-hidden="true">
            <ArrowUpRight className="h-3.5 w-3.5" />
          </span>
        </a>
      ))}
    </div>
  )
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-[var(--ghost-line)] bg-[var(--surface)] px-2 py-2">
      <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--ink-soft)]">{label}</p>
      <p className="mt-1 text-sm">{value}</p>
    </div>
  )
}

function compareScenarioRows(
  left: GuideRow,
  right: GuideRow,
  scenarioScores: Map<string, ScenarioRow>,
  profile: string,
) {
  const leftScenario = scenarioScores.get(`${left.canonical_model_id}::${profile}`)?.scenario_score ?? -1
  const rightScenario = scenarioScores.get(`${right.canonical_model_id}::${profile}`)?.scenario_score ?? -1
  return rightScenario - leftScenario
}

function compareRows(
  left: GuideRow,
  right: GuideRow,
  sortKey: (typeof tableSortOptions)[number]['key'],
  direction: 'asc' | 'desc',
) {
  const multiplier = direction === 'desc' ? -1 : 1
  const terminalLeft = terminalBenchSortValue(left)
  const terminalRight = terminalBenchSortValue(right)
  const valueByKey = {
    model: left.canonical_family.localeCompare(right.canonical_family),
    cost: (left.openrouter_blended_price_per_million ?? 9999) - (right.openrouter_blended_price_per_million ?? 9999),
    speed: (left.aa_median_tokens_per_second ?? -1) - (right.aa_median_tokens_per_second ?? -1),
    context: (left.openrouter_context_tokens ?? 0) - (right.openrouter_context_tokens ?? 0),
    intelligence: (left.aa_intelligence_index ?? -1) - (right.aa_intelligence_index ?? -1),
    terminalbench: terminalLeft - terminalRight,
  }[sortKey]

  if (sortKey === 'model') {
    return valueByKey
  }

  return valueByKey * multiplier
}

function toggleSelection(
  id: string,
  selected: string[],
  setSelected: (value: string[]) => void,
) {
  if (selected.includes(id)) {
    setSelected(selected.filter((item) => item !== id))
    return
  }
  setSelected([...selected, id].slice(-3))
}

function formatReasoningMode(value: string) {
  if (value === 'reasoning / thinking') {
    return 'Thinking mode'
  }
  if (value === 'high reasoning') {
    return 'High reasoning mode'
  }
  if (value === 'standard') {
    return 'Standard mode'
  }
  if (value === 'reasoning') {
    return 'Reasoning mode'
  }
  if (value === 'non_reasoning') {
    return 'Non-reasoning mode'
  }
  return titleCase(value)
}

function formatSpeed(value?: number | null) {
  if (value === null || value === undefined || Number.isNaN(value) || value <= 0) {
    return '—'
  }
  return `${formatNumber(value, 1)} t/s`
}

function formatShortDate(value?: string | null) {
  if (!value) {
    return '—'
  }
  return new Date(value).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
  })
}

function latestManifestDate(manifest: SourceManifest) {
  const values = Object.values(manifest)
    .map((item) => item.fetched_at)
    .filter((item): item is string => Boolean(item))
    .sort()
  return values.at(-1) ?? null
}

function openRouterSourceUrl(row: GuideRow) {
  if (typeof row.openrouter_pricing_url === 'string') {
    return row.openrouter_pricing_url
  }
  if (typeof row.openrouter_page_url === 'string') {
    return row.openrouter_page_url
  }
  return null
}

function aaSourceUrl(row: GuideRow) {
  if (typeof row.aa_model_url === 'string') {
    return row.aa_model_url
  }
  if (typeof row.aa_provider_url === 'string') {
    return row.aa_provider_url
  }
  return null
}

function getTerminalBenchBenchmark(row: GuideRow) {
  return (row.vals_benchmarks ?? []).find((item) => item.benchmark === 'Terminal-Bench 2.0') ?? null
}

function getTerminalBenchMetric(row: GuideRow) {
  const benchmark = getTerminalBenchBenchmark(row)
  if (benchmark && typeof row.vals_model_url === 'string') {
    return {
      value: formatNumber(benchmark.score, 1),
      note:
        benchmark.rank && benchmark.population
          ? `Rank ${benchmark.rank}/${benchmark.population}`
          : 'Vals benchmark',
      href: row.vals_model_url,
    }
  }

  if (row.aa_terminalbench_hard !== null && row.aa_terminalbench_hard !== undefined) {
    return {
      value: `${formatNumber(row.aa_terminalbench_hard * 100, 1)}%`,
      note: 'AA TerminalBench Hard',
      href: aaSourceUrl(row),
    }
  }

  return {
    value: '—',
    note: null,
    href: null,
  }
}

function terminalBenchSortValue(row: GuideRow) {
  const benchmark = getTerminalBenchBenchmark(row)
  if (benchmark?.score !== null && benchmark?.score !== undefined) {
    return benchmark.score
  }
  if (row.aa_terminalbench_hard !== null && row.aa_terminalbench_hard !== undefined) {
    return row.aa_terminalbench_hard * 100
  }
  return -1
}

function modelRowId(id: string) {
  return `model-row-${id}`
}
