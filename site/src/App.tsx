import { useEffect, useState } from 'react'
import clsx from 'clsx'
import {
  AlertTriangle,
  ArrowUpDown,
  BadgeInfo,
  BrainCircuit,
  Clock3,
  Coins,
  FileClock,
  Filter,
  GitCompareArrows,
  Layers3,
  Microscope,
  Search,
  Sigma,
  Sparkles,
  Workflow,
} from 'lucide-react'
import './index.css'
import type {
  CohortRules,
  GuideRow,
  ScenarioProfiles,
  ScenarioRow,
  SourceManifest,
} from './types'
import {
  formatCompact,
  formatCurrency,
  formatIso,
  formatNumber,
  titleCase,
} from './utils'

type LoadState = {
  cohort: GuideRow[]
  master: GuideRow[]
  scenarios: ScenarioRow[]
  manifest: SourceManifest
  profiles: ScenarioProfiles
  cohortRules: CohortRules
  diagnostics: Array<Record<string, unknown>>
}

const scenarioPresets = [
  { id: 'coding', label: 'Best value coding', icon: Workflow },
  { id: 'reasoning', label: 'Premium reasoning', icon: BrainCircuit },
  { id: 'budget', label: 'Cheapest agent', icon: Coins },
  { id: 'latency', label: 'Low-latency assistant', icon: Clock3 },
  { id: 'long_context', label: 'Long-context workhorse', icon: Layers3 },
]

const tableColumns = [
  { key: 'model', label: 'Model' },
  { key: 'scenario', label: 'Profile score' },
  { key: 'livebench', label: 'LiveBench' },
  { key: 'accuracy', label: 'Vals acc.' },
  { key: 'intelligence', label: 'AA int.' },
  { key: 'speed', label: 'AA t/s' },
  { key: 'cost', label: 'Blended £/M' },
  { key: 'context', label: 'Context' },
]

const aaBenchmarkLabels: Array<[keyof GuideRow, string]> = [
  ['aa_intelligence_index', 'AA Intelligence'],
  ['aa_coding_index', 'AA Coding'],
  ['aa_math_index', 'AA Math'],
  ['aa_gpqa', 'GPQA'],
  ['aa_hle', 'HLE'],
  ['aa_mmlu_pro', 'MMLU-Pro'],
  ['aa_livecodebench', 'LiveCodeBench'],
  ['aa_scicode', 'SciCode'],
  ['aa_terminalbench_hard', 'TerminalBench Hard'],
  ['aa_ifbench', 'IFBench'],
  ['aa_tau2', 'TAU2'],
  ['aa_lcr', 'LCR'],
  ['aa_aime', 'AIME'],
  ['aa_aime_25', 'AIME 2025'],
  ['aa_math_500', 'Math-500'],
]

export default function App() {
  const [data, setData] = useState<LoadState | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [activeProfile, setActiveProfile] = useState('coding')
  const [providerFilter, setProviderFilter] = useState('all')
  const [reasoningFilter, setReasoningFilter] = useState('all')
  const [budgetCeiling, setBudgetCeiling] = useState(15)
  const [contextFloor, setContextFloor] = useState(32000)
  const [sortKey, setSortKey] = useState('scenario')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')
  const [selectedModels, setSelectedModels] = useState<string[]>([])

  useEffect(() => {
    const base = import.meta.env.BASE_URL
    Promise.all([
      fetch(`${base}data/latest/guide_cohort.json`).then((r) => r.json()),
      fetch(`${base}data/latest/master_registry.json`).then((r) => r.json()),
      fetch(`${base}data/latest/scenario_scores.json`).then((r) => r.json()),
      fetch(`${base}data/latest/source_manifest.json`).then((r) => r.json()),
      fetch(`${base}data/latest/scenario_profiles.json`).then((r) => r.json()),
      fetch(`${base}data/latest/cohort_rules.json`).then((r) => r.json()),
      fetch(`${base}data/latest/mapping_diagnostics.json`).then((r) => r.json()),
    ])
      .then(([cohort, master, scenarios, manifest, profiles, cohortRules, diagnostics]) =>
        setData({ cohort, master, scenarios, manifest, profiles, cohortRules, diagnostics }),
      )
      .catch((fetchError) => {
        console.error(fetchError)
        setError('Generated datasets are missing or failed to load.')
      })
  }, [])

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

  const scenarioScores = new Map<string, ScenarioRow>()
  for (const row of data.scenarios) {
    scenarioScores.set(`${row.canonical_model_id}::${row.scenario_profile}`, row)
  }

  const providers = ['all', ...new Set(data.cohort.map((row) => row.provider).sort())]
  const filteredRows = data.cohort
    .filter((row) => row.canonical_family.toLowerCase().includes(search.toLowerCase()))
    .filter((row) => providerFilter === 'all' || row.provider === providerFilter)
    .filter((row) => reasoningFilter === 'all' || row.reasoning_mode === reasoningFilter)
    .filter((row) => (row.openrouter_blended_price_per_million ?? 10_000) <= budgetCeiling)
    .filter((row) => (row.openrouter_context_tokens ?? 0) >= contextFloor)
    .sort((left, right) =>
      compareRows(left, right, sortKey, sortDirection, scenarioScores, activeProfile),
    )

  const selectedDetails = filteredRows.filter((row) => selectedModels.includes(row.canonical_model_id))
  const topRecommendation = filteredRows[0]
  const topScenario = topRecommendation
    ? scenarioScores.get(`${topRecommendation.canonical_model_id}::${activeProfile}`)
    : null
  const excludedCount = data.master.filter((row) => !row.cohort_eligible).length
  const strictCount = data.master.filter((row) => row.strict_cohort_eligible).length
  const valsEnrichedCount = data.master.filter((row) => row.vals_enriched).length
  const livebenchCount = data.master.filter((row) => row.livebench_enriched).length
  const workbookUrl = `${import.meta.env.BASE_URL}downloads/model-intelligence-workbook.xlsx`

  return (
    <main className="min-h-screen bg-[var(--surface)] text-[var(--ink)]">
      <header className="border-b border-[var(--ghost-line)] bg-[var(--surface-bright)]">
        <div className="mx-auto max-w-[1600px] px-4 py-5 md:px-6">
          <div className="grid gap-4 lg:grid-cols-[2.2fr_1fr]">
            <div>
              <p className="text-[11px] uppercase tracking-[0.34em] text-[var(--teal-700)]">
                Model Intelligence Guide
              </p>
              <div className="mt-3 flex flex-wrap items-end gap-x-6 gap-y-3">
                <h1 className="font-[var(--font-serif)] text-4xl leading-none md:text-6xl">
                  What model should I use?
                </h1>
                <p className="max-w-2xl text-sm leading-6 text-[var(--ink-muted)]">
                  Daily-built recommendations from OpenRouter pricing, Artificial Analysis,
                  Vals, and LiveBench. Any model with matched OpenRouter + Artificial Analysis
                  coverage reaches the live guide; Vals and LiveBench remain explicit enrichment
                  layers instead of silent hard gates.
                </p>
              </div>
            </div>
            <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-5">
              <Stat label="Guide cohort" value={`${data.cohort.length}`} meta="OpenRouter + AA" />
              <Stat label="Vals enriched" value={`${valsEnrichedCount}`} meta="application-quality rows" />
              <Stat label="LiveBench enriched" value={`${livebenchCount}`} meta="benchmark rows" />
              <Stat label="Vals strict" value={`${strictCount}`} meta="OpenRouter + AA + Vals" />
              <Stat label="Registry backlog" value={`${excludedCount}`} meta="tracked but excluded" />
              <Stat
                label="Workbook"
                value="Download"
                meta={<a className="underline" href={workbookUrl}>latest XLSX</a>}
              />
            </div>
          </div>

          <div className="mt-5 grid gap-3 border-t border-[var(--ghost-line)] pt-4 md:grid-cols-4">
            {Object.entries(data.manifest).map(([name, manifest]) => (
              <div key={name} className="border-l border-[var(--ghost-line)] pl-3 first:border-l-0 first:pl-0">
                <p className="text-[11px] uppercase tracking-[0.28em] text-[var(--ink-soft)]">
                  {titleCase(name)}
                </p>
                <p className="mt-1 text-sm font-medium text-[var(--ink)]">
                  {formatIso(manifest.fetched_at)}
                </p>
                <p className="text-xs text-[var(--ink-muted)]">
                  {manifest.record_count ?? '—'} records
                </p>
              </div>
            ))}
          </div>
        </div>
      </header>

      <section className="mx-auto grid max-w-[1600px] gap-5 px-4 py-5 md:px-6 xl:grid-cols-[280px_minmax(0,1fr)_320px]">
        <aside className="space-y-4 xl:sticky xl:top-4 xl:h-fit">
          <Panel title="Scenario presets" icon={Sparkles}>
            <div className="grid gap-2">
              {scenarioPresets.map((preset) => {
                const Icon = preset.icon
                const active = preset.id === activeProfile
                return (
                  <button
                    key={preset.id}
                    className={clsx(
                      'flex items-center justify-between border px-3 py-2 text-left transition',
                      active
                        ? 'border-[var(--teal-700)] bg-[var(--teal-ink)] text-white'
                        : 'border-[var(--ghost-line)] bg-[var(--surface)] hover:bg-[var(--surface-2)]',
                    )}
                    onClick={() => setActiveProfile(preset.id)}
                  >
                    <span className="flex items-center gap-2 text-sm">
                      <Icon className="h-4 w-4" />
                      {preset.label}
                    </span>
                    <span className="text-[10px] uppercase tracking-[0.26em]">
                      {data.profiles.profiles[preset.id]?.label ?? preset.id}
                    </span>
                  </button>
                )
              })}
            </div>
          </Panel>

          <Panel title="Filters" icon={Filter}>
            <label className="block">
              <span className="field-label">Search</span>
              <div className="field-shell">
                <Search className="h-4 w-4 text-[var(--ink-soft)]" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  className="field-input"
                  placeholder="Search family or variant"
                />
              </div>
            </label>

            <label className="block pt-3">
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

            <label className="block pt-3">
              <span className="field-label">Reasoning mode</span>
              <select
                className="field-select"
                value={reasoningFilter}
                onChange={(event) => setReasoningFilter(event.target.value)}
              >
                <option value="all">All modes</option>
                <option value="standard">Standard</option>
                <option value="reasoning">Reasoning</option>
                <option value="non_reasoning">Non-reasoning</option>
              </select>
            </label>

            <label className="block pt-3">
              <span className="field-label">Max blended cost / M</span>
              <input
                type="range"
                min={1}
                max={50}
                value={budgetCeiling}
                onChange={(event) => setBudgetCeiling(Number(event.target.value))}
                className="w-full accent-[var(--teal-700)]"
              />
              <p className="mt-1 text-xs text-[var(--ink-muted)]">{formatCurrency(budgetCeiling)}</p>
            </label>

            <label className="block pt-3">
              <span className="field-label">Minimum context window</span>
              <input
                type="range"
                min={8000}
                max={2000000}
                step={8000}
                value={contextFloor}
                onChange={(event) => setContextFloor(Number(event.target.value))}
                className="w-full accent-[var(--teal-700)]"
              />
              <p className="mt-1 text-xs text-[var(--ink-muted)]">{formatCompact(contextFloor)} tokens</p>
            </label>
          </Panel>

          <Panel title="Cohort contract" icon={Sigma}>
            <p className="text-sm leading-6 text-[var(--ink-muted)]">
              {data.cohortRules.description}
            </p>
            <div className="mt-3">
              <p className="field-label">Required sources</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {data.cohortRules.required_sources.map((source) => (
                  <span key={source} className="chip">
                    {titleCase(source)}
                  </span>
                ))}
              </div>
            </div>
            {data.cohortRules.preferred_sources?.length ? (
              <div className="mt-3">
                <p className="field-label">Strict enrichment</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {data.cohortRules.preferred_sources.map((source) => (
                    <span key={source} className="chip chip-good">
                      {titleCase(source)}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
          </Panel>
        </aside>

        <section className="space-y-5">
          <Panel title="Scenario shortlist" icon={Microscope}>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {scenarioPresets.map((preset) => {
                const leader = [...data.cohort]
                  .sort((left, right) =>
                    compareRows(left, right, 'scenario', 'desc', scenarioScores, preset.id),
                  )[0]
                const scenario = leader
                  ? scenarioScores.get(`${leader.canonical_model_id}::${preset.id}`)
                  : null
                return (
                  <button
                    key={preset.id}
                    onClick={() => setActiveProfile(preset.id)}
                    className={clsx(
                      'scorecard',
                      preset.id === activeProfile && 'scorecard-active',
                    )}
                  >
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.28em] text-[var(--ink-soft)]">
                        {preset.label}
                      </p>
                      <h3 className="mt-2 font-[var(--font-serif)] text-xl leading-tight">
                        {leader?.canonical_family ?? 'No eligible model'}
                      </h3>
                    </div>
                    <div className="mt-4 flex items-end justify-between">
                      <span className="text-3xl font-semibold tabular-nums text-[var(--teal-700)]">
                        {formatNumber(scenario?.scenario_score, 2)}
                      </span>
                      <span className="text-xs uppercase tracking-[0.24em] text-[var(--ink-muted)]">
                        {leader?.canonical_variant ?? '—'}
                      </span>
                    </div>
                  </button>
                )
              })}
            </div>
          </Panel>

          <Panel title="Sortable guide cohort" icon={ArrowUpDown}>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3 border-b border-[var(--ghost-line)] pb-3">
              <div>
                <p className="text-[11px] uppercase tracking-[0.28em] text-[var(--ink-soft)]">
                  Active weighting
                </p>
                <h2 className="mt-1 font-[var(--font-serif)] text-2xl">
                  {data.profiles.profiles[activeProfile]?.label}
                </h2>
              </div>
              <p className="max-w-xl text-sm leading-6 text-[var(--ink-muted)]">
                Rows update instantly as you change filters, with the selected weighting profile
                controlling the lead recommendation and the main comparison score.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] border-collapse text-left">
                <thead>
                  <tr>
                    <th className="table-sticky table-head">Compare</th>
                    {tableColumns.map((column) => (
                      <th
                        key={column.key}
                        className="table-head cursor-pointer"
                        onClick={() => toggleSort(column.key, sortKey, sortDirection, setSortKey, setSortDirection)}
                      >
                        <span className="inline-flex items-center gap-2">
                          {column.label}
                          {sortKey === column.key ? (sortDirection === 'desc' ? '↓' : '↑') : ''}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map((row) => {
                    const scenario = scenarioScores.get(`${row.canonical_model_id}::${activeProfile}`)
                    const selected = selectedModels.includes(row.canonical_model_id)
                    return (
                      <tr key={row.canonical_model_id} className={selected ? 'table-row-selected' : 'table-row'}>
                        <td className="table-sticky border-b border-[var(--ghost-line)] bg-inherit px-3 py-3">
                          <input
                            type="checkbox"
                            checked={selected}
                            onChange={() => toggleSelection(row.canonical_model_id, selectedModels, setSelectedModels)}
                            aria-label={`Compare ${row.canonical_family}`}
                          />
                        </td>
                        <td className="border-b border-[var(--ghost-line)] px-3 py-3">
                          <p className="font-medium">{row.canonical_family}</p>
                          <p className="text-xs uppercase tracking-[0.22em] text-[var(--ink-soft)]">
                            {row.canonical_variant} · {row.provider}
                          </p>
                          <SourceLinks row={row} className="mt-2" />
                        </td>
                        <td className="table-cell-strong">{formatNumber(scenario?.scenario_score, 2)}</td>
                        <td className="table-cell">{formatNumber(row.livebench_overall_score, 2)}</td>
                        <td className="table-cell">{formatNumber(row.vals_accuracy, 2)}%</td>
                        <td className="table-cell">{formatNumber(row.aa_intelligence_index, 2)}</td>
                        <td className="table-cell">{formatNumber(row.aa_median_tokens_per_second, 1)}</td>
                        <td className="table-cell">{formatCurrency(row.openrouter_blended_price_per_million)}</td>
                        <td className="table-cell">{formatCompact(row.openrouter_context_tokens)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </Panel>

          <Panel title="Benchmarks and caveats" icon={BadgeInfo}>
            <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
              <div className="space-y-4">
                <h3 className="font-[var(--font-serif)] text-2xl">
                  {topRecommendation?.canonical_family ?? 'No recommendation available'}
                </h3>
                {topRecommendation ? (
                  <>
                    <div className="border border-[var(--ghost-line)] bg-[var(--surface)] p-3">
                      <p className="text-[11px] uppercase tracking-[0.28em] text-[var(--ink-soft)]">
                        Artificial Analysis benchmark sweep
                      </p>
                      <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                        {aaBenchmarkEntries(topRecommendation).map((metric) => (
                          <MiniStat
                            key={metric.label}
                            label={metric.label}
                            value={formatNumber(metric.value, 1)}
                          />
                        ))}
                      </div>
                    </div>

                    <div className="border border-[var(--ghost-line)] bg-[var(--surface)] p-3">
                      <p className="text-[11px] uppercase tracking-[0.28em] text-[var(--ink-soft)]">
                        Artificial Analysis routing and pricing
                      </p>
                      <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                        {aaRoutingStats(topRecommendation).map((metric) => (
                          <MiniStat key={metric.label} label={metric.label} value={metric.value} />
                        ))}
                      </div>
                    </div>

                    {Object.keys(topRecommendation.livebench_categories ?? {}).length ? (
                      <div className="border-t border-[var(--ghost-line)] pt-4">
                        <p className="text-[11px] uppercase tracking-[0.28em] text-[var(--ink-soft)]">
                          LiveBench categories
                        </p>
                        <div className="mt-3 grid gap-3 md:grid-cols-2">
                          {Object.entries(topRecommendation.livebench_categories ?? {}).map(([category, score]) => (
                            <MetricBar key={category} label={titleCase(category)} value={score} />
                          ))}
                        </div>
                      </div>
                    ) : null}

                    {(topRecommendation.vals_benchmarks ?? []).length ? (
                      <div className="space-y-2 border-t border-[var(--ghost-line)] pt-4">
                        <p className="text-[11px] uppercase tracking-[0.28em] text-[var(--ink-soft)]">
                          Vals benchmark ranks
                        </p>
                        {(topRecommendation.vals_benchmarks ?? []).slice(0, 8).map((benchmark) => (
                          <div key={benchmark.benchmark} className="flex items-center justify-between gap-3 text-sm">
                            <span className="text-[var(--ink)]">{benchmark.benchmark}</span>
                            <span className="text-[var(--ink-muted)]">
                              rank {benchmark.rank}/{benchmark.population}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </>
                ) : null}
              </div>
              <div className="space-y-4 border-l border-[var(--ghost-line)] pl-0 lg:pl-5">
                <p className="text-[11px] uppercase tracking-[0.28em] text-[var(--ink-soft)]">
                  Methodology notes
                </p>
                <p className="text-sm leading-6 text-[var(--ink-muted)]">
                  Vals and LiveBench are not measuring the same thing. This guide keeps both side by
                  side, exposes freshness and coverage, and never fabricates missing values just to
                  make the ranking feel cleaner.
                </p>
                <div className="space-y-2">
                  <Glossary term="Guide cohort">
                    Models with matched OpenRouter and Artificial Analysis coverage for the live
                    guide metrics. This is the default recommendation universe shown in the app.
                  </Glossary>
                  <Glossary term="Registry backlog">
                    Discovered candidates with partial or ambiguous coverage. They remain visible in
                    the data pipeline and workbook diagnostics instead of silently disappearing.
                  </Glossary>
                  <Glossary term="Vals strict cohort">
                    Guide cohort rows that are also backed by Vals. This is the tighter
                    application-quality subset when you want an additional benchmark layer instead
                    of raw OpenRouter + AA coverage alone.
                  </Glossary>
                  <Glossary term="LiveBench enriched">
                    A badge, not an admission rule. Models with matched LiveBench data expose
                    category and task scores, but missing LiveBench does not exclude them from the
                    live guide.
                  </Glossary>
                  <Glossary term="Scenario score">
                    A weighted blend of normalized cost, coding, reasoning, latency, context, and
                    value metrics. The right rail exposes the exact contribution breakdown.
                  </Glossary>
                </div>
              </div>
            </div>
          </Panel>
        </section>

        <aside className="space-y-4 xl:sticky xl:top-4 xl:h-fit">
          <Panel title="Why this recommendation" icon={GitCompareArrows}>
            {topRecommendation && topScenario ? (
              <>
                <p className="text-[11px] uppercase tracking-[0.28em] text-[var(--ink-soft)]">
                  Lead pick for {data.profiles.profiles[activeProfile]?.label}
                </p>
                <h2 className="mt-2 font-[var(--font-serif)] text-3xl leading-tight">
                  {topRecommendation.canonical_family}
                </h2>
                <p className="mt-2 text-sm leading-6 text-[var(--ink-muted)]">
                  {topRecommendation.canonical_variant} · {topRecommendation.provider} · score{' '}
                  {formatNumber(topScenario.scenario_score, 2)}
                </p>
                <SourceLinks row={topRecommendation} className="mt-3" />
                <div className="mt-4 space-y-2">
                  {Object.entries(topScenario.explanation).map(([factor, detail]) => (
                    <div key={factor} className="border-l-2 border-[var(--teal-700)] pl-3">
                      <div className="flex items-center justify-between gap-3 text-sm">
                        <span>{titleCase(factor)}</span>
                        <span className="font-mono text-[var(--ink-muted)]">
                          w {formatNumber(detail.weight, 2)}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-[var(--ink-muted)]">
                        normalized {formatNumber(detail.normalized_input, 2)} · contribution{' '}
                        {formatNumber(detail.contribution, 2)}
                      </p>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <p className="text-sm text-[var(--ink-muted)]">
                No eligible model remains under the current filters.
              </p>
            )}
          </Panel>

          <Panel title="Coverage and freshness" icon={FileClock}>
            {topRecommendation ? (
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  {Object.entries(topRecommendation.source_flags).map(([source, present]) => (
                    <span key={source} className={clsx('chip', present ? 'chip-good' : 'chip-bad')}>
                      {titleCase(source)} {present ? 'present' : 'missing'}
                    </span>
                  ))}
                </div>
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between gap-3">
                    <dt className="text-[var(--ink-muted)]">OpenRouter release</dt>
                    <dd>{topRecommendation.openrouter_release_date ?? '—'}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-[var(--ink-muted)]">AA release</dt>
                    <dd>{topRecommendation.aa_release_date ?? '—'}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-[var(--ink-muted)]">Vals page release</dt>
                    <dd>{topRecommendation.vals_release_date ?? '—'}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-[var(--ink-muted)]">Coverage score</dt>
                    <dd>{formatNumber(topRecommendation.coverage_score * 100, 0)}%</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-[var(--ink-muted)]">Vals enriched</dt>
                    <dd>{topRecommendation.vals_enriched ? 'Yes' : 'No'}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-[var(--ink-muted)]">LiveBench enriched</dt>
                    <dd>{topRecommendation.livebench_enriched ? 'Yes' : 'No'}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-[var(--ink-muted)]">AA JSON support</dt>
                    <dd>{topRecommendation.aa_json_support ?? '—'}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-[var(--ink-muted)]">AA function calling</dt>
                    <dd>{topRecommendation.aa_function_calling ?? '—'}</dd>
                  </div>
                </dl>
              </div>
            ) : (
              <p className="text-sm text-[var(--ink-muted)]">Freshness details appear here for the active lead model.</p>
            )}
          </Panel>

          <Panel title="Comparison tray" icon={GitCompareArrows}>
            {selectedDetails.length === 0 ? (
              <p className="text-sm leading-6 text-[var(--ink-muted)]">
                Tick a few rows in the cohort table to compare cost, speed, reasoning strength, and
                benchmark posture side by side.
              </p>
            ) : (
              <div className="space-y-4">
                {selectedDetails.slice(0, 3).map((row) => {
                  const scenario = scenarioScores.get(`${row.canonical_model_id}::${activeProfile}`)
                  return (
                    <div key={row.canonical_model_id} className="border-l-2 border-[var(--teal-700)] pl-3">
                      <h3 className="font-medium">{row.canonical_family}</h3>
                      <p className="text-xs uppercase tracking-[0.2em] text-[var(--ink-soft)]">
                        {row.canonical_variant}
                      </p>
                      <SourceLinks row={row} className="mt-2" />
                      <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                        <MiniStat label="Score" value={formatNumber(scenario?.scenario_score, 2)} />
                        <MiniStat label="Cost" value={formatCurrency(row.openrouter_blended_price_per_million)} />
                        <MiniStat label="AA int." value={formatNumber(row.aa_intelligence_index, 2)} />
                        <MiniStat label="LiveBench" value={formatNumber(row.livebench_overall_score, 2)} />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </Panel>
        </aside>
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
  children: React.ReactNode
}) {
  return (
    <section className="border border-[var(--ghost-line)] bg-[var(--surface-bright)] p-4">
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
      href:
        typeof row.openrouter_page_url === 'string'
          ? row.openrouter_page_url
          : typeof row.openrouter_pricing_url === 'string'
            ? row.openrouter_pricing_url
            : null,
    },
    {
      label: 'AA',
      href:
        typeof row.aa_model_url === 'string'
          ? row.aa_model_url
          : typeof row.aa_provider_url === 'string'
            ? row.aa_provider_url
            : null,
    },
    {
      label: 'Vals',
      href: typeof row.vals_model_url === 'string' ? row.vals_model_url : null,
    },
  ].filter((item): item is { label: string; href: string } => Boolean(item.href))

  if (links.length === 0) {
    return null
  }

  return (
    <div className={`flex flex-wrap gap-2 ${className}`.trim()}>
      {links.map((link) => (
        <a
          key={link.label}
          href={link.href}
          target="_blank"
          rel="noreferrer"
          className="chip hover:border-[var(--teal-700)] hover:text-[var(--teal-700)]"
        >
          {link.label}
        </a>
      ))}
    </div>
  )
}

function Stat({
  label,
  value,
  meta,
}: {
  label: string
  value: string
  meta: React.ReactNode
}) {
  return (
    <div className="border border-[var(--ghost-line)] bg-[var(--surface)] px-3 py-3">
      <p className="text-[11px] uppercase tracking-[0.24em] text-[var(--ink-soft)]">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-[var(--teal-700)]">{value}</p>
      <div className="mt-1 text-xs text-[var(--ink-muted)]">{meta}</div>
    </div>
  )
}

function MetricBar({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-3 text-sm">
        <span>{label}</span>
        <span className="font-mono text-[var(--ink-muted)]">{formatNumber(value, 1)}</span>
      </div>
      <div className="h-2 bg-[var(--surface-2)]">
        <div className="h-full bg-[var(--teal-700)]" style={{ width: `${value}%` }} />
      </div>
    </div>
  )
}

function aaBenchmarkEntries(row: GuideRow) {
  return aaBenchmarkLabels
    .map(([key, label]) => {
      const value = row[key]
      return typeof value === 'number' ? { label, value } : null
    })
    .filter((item): item is { label: string; value: number } => item !== null)
}

function aaRoutingStats(row: GuideRow) {
  return [
    { label: 'AA t/s', value: formatNumber(row.aa_median_tokens_per_second, 1) },
    { label: 'AA TTFT', value: `${formatNumber(row.aa_median_ttft_seconds, 2)}s` },
    { label: 'AA TTFAT', value: `${formatNumber(row.aa_median_ttfat_seconds, 2)}s` },
    { label: 'AA in $/M', value: formatCurrency(row.aa_input_price_per_million) },
    { label: 'AA out $/M', value: formatCurrency(row.aa_output_price_per_million) },
    { label: 'AA blend $/M', value: formatCurrency(row.aa_blended_price_per_million) },
    {
      label: 'Fastest route',
      value:
        row.aa_fastest_provider && row.aa_fastest_tokens_per_second !== null && row.aa_fastest_tokens_per_second !== undefined
          ? `${row.aa_fastest_provider} · ${formatNumber(row.aa_fastest_tokens_per_second, 1)} t/s`
          : row.aa_fastest_provider ?? '—',
    },
    {
      label: 'Lowest latency',
      value:
        row.aa_lowest_latency_provider && row.aa_lowest_latency_seconds !== null && row.aa_lowest_latency_seconds !== undefined
          ? `${row.aa_lowest_latency_provider} · ${formatNumber(row.aa_lowest_latency_seconds, 2)}s`
          : row.aa_lowest_latency_provider ?? '—',
    },
    {
      label: 'Cheapest route',
      value:
        row.aa_cheapest_provider && row.aa_cheapest_blended_price_per_million !== null && row.aa_cheapest_blended_price_per_million !== undefined
          ? `${row.aa_cheapest_provider} · ${formatCurrency(row.aa_cheapest_blended_price_per_million)}`
          : row.aa_cheapest_provider ?? '—',
    },
  ]
}

function Glossary({
  term,
  children,
}: {
  term: string
  children: React.ReactNode
}) {
  return (
    <div className="border-l-2 border-[var(--ghost-line)] pl-3">
      <p className="text-[11px] uppercase tracking-[0.24em] text-[var(--ink-soft)]">{term}</p>
      <p className="mt-1 text-sm leading-6 text-[var(--ink-muted)]">{children}</p>
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

function compareRows(
  left: GuideRow,
  right: GuideRow,
  sortKey: string,
  direction: 'asc' | 'desc',
  scenarioScores: Map<string, ScenarioRow>,
  activeProfile: string,
) {
  const multiplier = direction === 'desc' ? -1 : 1
  const leftScenario = scenarioScores.get(`${left.canonical_model_id}::${activeProfile}`)?.scenario_score ?? -1
  const rightScenario = scenarioScores.get(`${right.canonical_model_id}::${activeProfile}`)?.scenario_score ?? -1
  const valueByKey = {
    model: left.canonical_family.localeCompare(right.canonical_family),
    scenario: leftScenario - rightScenario,
    livebench: (left.livebench_overall_score ?? -1) - (right.livebench_overall_score ?? -1),
    accuracy: (left.vals_accuracy ?? -1) - (right.vals_accuracy ?? -1),
    intelligence: (left.aa_intelligence_index ?? -1) - (right.aa_intelligence_index ?? -1),
    speed: (left.aa_median_tokens_per_second ?? -1) - (right.aa_median_tokens_per_second ?? -1),
    cost: (left.openrouter_blended_price_per_million ?? 9999) - (right.openrouter_blended_price_per_million ?? 9999),
    context: (left.openrouter_context_tokens ?? 0) - (right.openrouter_context_tokens ?? 0),
  }[sortKey] ?? 0

  return valueByKey * multiplier
}

function toggleSort(
  key: string,
  currentKey: string,
  currentDirection: 'asc' | 'desc',
  setKey: (value: string) => void,
  setDirection: (value: 'asc' | 'desc') => void,
) {
  if (currentKey === key) {
    setDirection(currentDirection === 'desc' ? 'asc' : 'desc')
    return
  }
  setKey(key)
  setDirection(key === 'cost' ? 'asc' : 'desc')
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
