import { useEffect, useState, type ReactNode } from 'react'
import clsx from 'clsx'
import {
  AlertTriangle,
  ArrowUpRight,
  ArrowUpDown,
  BadgeInfo,
  BrainCircuit,
  ChevronDown,
  Clock3,
  Coins,
  FileClock,
  GitCompareArrows,
  Layers3,
  Microscope,
  Search,
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
  {
    id: 'coding',
    label: 'Best coding model',
    shortLabel: 'Coding',
    icon: Workflow,
    goal: 'Pick the strongest coding model for implementation, debugging, and review work.',
  },
  {
    id: 'reasoning',
    label: 'Premium reasoning',
    shortLabel: 'Reasoning',
    icon: BrainCircuit,
    goal: 'Handle harder planning, analysis, and multi-step problem solving.',
  },
  {
    id: 'budget',
    label: 'Cheap all-rounder',
    shortLabel: 'Budget',
    icon: Coins,
    goal: 'Stay genuinely cheap without falling apart on reasoning, coding, or speed.',
  },
  {
    id: 'latency',
    label: 'Low-latency assistant',
    shortLabel: 'Latency',
    icon: Clock3,
    goal: 'Respond fast enough for chat, copilots, and interactive tools.',
  },
  {
    id: 'long_context',
    label: 'Long-context workhorse',
    shortLabel: 'Context',
    icon: Layers3,
    goal: 'Handle large context windows while still feeling usable as an everyday workhorse.',
  },
] as const

const tableSortOptions = [
  { key: 'scenario', label: 'Best fit', direction: 'desc' },
  { key: 'cost', label: 'Lowest cost', direction: 'asc' },
  { key: 'speed', label: 'Fastest output', direction: 'desc' },
  { key: 'intelligence', label: 'Highest reasoning', direction: 'desc' },
  { key: 'context', label: 'Most context', direction: 'desc' },
  { key: 'model', label: 'Model A-Z', direction: 'asc' },
] as const

const factorLabels: Record<string, string> = {
  coding: 'Coding strength',
  value: 'Value for price',
  budget: 'Budget fit',
  latency: 'Interactive speed',
  reasoning: 'Reasoning strength',
  long_context: 'Context headroom',
}

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
  const [visibleCount, setVisibleCount] = useState(20)
  const [sourceCoverageOpen, setSourceCoverageOpen] = useState(true)
  const [comparePicksOpen, setComparePicksOpen] = useState(false)

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
  const presetRankedRows = [...data.cohort].sort((left, right) =>
    compareRows(left, right, 'scenario', 'desc', scenarioScores, activeProfile),
  )
  const browseEligibleRows = data.cohort
    .filter((row) => {
      const needle = search.toLowerCase()
      return (
        row.canonical_family.toLowerCase().includes(needle) ||
        row.canonical_variant.toLowerCase().includes(needle)
      )
    })
    .filter((row) => providerFilter === 'all' || row.provider === providerFilter)
    .filter((row) => reasoningFilter === 'all' || row.reasoning_mode === reasoningFilter)
    .filter((row) => (row.openrouter_blended_price_per_million ?? 10_000) <= budgetCeiling)
    .filter((row) => (row.openrouter_context_tokens ?? 0) >= contextFloor)
  const tableRows = [...browseEligibleRows].sort((left, right) =>
    compareRows(left, right, sortKey, sortDirection, scenarioScores, activeProfile),
  )

  const topRecommendation = presetRankedRows[0]
  const topScenario = topRecommendation
    ? scenarioScores.get(`${topRecommendation.canonical_model_id}::${activeProfile}`)
    : null
  const selectedDetails = presetRankedRows.filter((row) => selectedModels.includes(row.canonical_model_id))
  const alternatives = buildAlternativeCards(presetRankedRows, topRecommendation, activeProfile)
  const visibleRows = tableRows.slice(0, visibleCount)
  const excludedCount = data.master.filter((row) => !row.cohort_eligible).length
  const valsEnrichedCount = data.master.filter((row) => row.vals_enriched).length
  const livebenchCount = data.master.filter((row) => row.livebench_enriched).length
  const latestRefresh = latestManifestDate(data.manifest)
  const workbookUrl = `${import.meta.env.BASE_URL}downloads/model-intelligence-workbook.xlsx`
  const activePreset = scenarioPresets.find((preset) => preset.id === activeProfile) ?? scenarioPresets[0]
  const prioritySentence = buildPrioritySentence(data.profiles, activeProfile)
  const winnerReasons = topRecommendation && topScenario ? describeWhyItWon(topRecommendation, topScenario) : []
  const winnerWarnings = topRecommendation ? describeTradeoffs(topRecommendation) : []

  return (
    <main className="min-h-screen bg-[var(--surface)] text-[var(--ink)]">
      <header className="border-b border-[var(--ghost-line)] bg-[var(--surface-bright)]">
        <div className="mx-auto max-w-[1600px] px-4 py-5 md:px-6">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-4xl">
              <p className="text-[11px] uppercase tracking-[0.34em] text-[var(--teal-700)]">
                Model Intelligence Guide
              </p>
              <h1 className="mt-3 font-[var(--font-serif)] text-4xl leading-none md:text-6xl">
                Pick the best model for the job, fast.
              </h1>
              <p className="mt-4 max-w-3xl text-sm leading-6 text-[var(--ink-muted)] md:text-base">
                Choose the task first. We surface the strongest current fit from matched OpenRouter
                and Artificial Analysis coverage, explain why it wins in plain language, and keep
                cost, speed, context, Vals, and LiveBench tradeoffs visible instead of hidden in a
                score blob.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:w-[520px]">
              <KpiCard label="Matched guide models" value={`${data.cohort.length}`} meta="OpenRouter + AA" />
              <KpiCard label="Vals enriched" value={`${valsEnrichedCount}`} meta="Workflow-style evals" />
              <KpiCard label="LiveBench enriched" value={`${livebenchCount}`} meta="Public benchmark layer" />
              <KpiCard label="Last rebuild" value={formatShortDate(latestRefresh)} meta="Static daily output" />
            </div>
          </div>

          <section className="mt-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="section-kicker">Task presets</p>
                <p className="section-copy">
                  Start with the task, not the table. Presets choose the winner above; browse filters only affect the table below.
                </p>
              </div>
              <a className="text-xs underline text-[var(--ink-muted)]" href={workbookUrl}>
                Download workbook
              </a>
            </div>
            <div className="preset-rail mt-3">
              {scenarioPresets.map((preset) => {
                const leader = [...data.cohort]
                  .sort((left, right) =>
                    compareRows(left, right, 'scenario', 'desc', scenarioScores, preset.id),
                  )[0]
                const scenario = leader
                  ? scenarioScores.get(`${leader.canonical_model_id}::${preset.id}`)
                  : null
                const Icon = preset.icon
                return (
                  <button
                    key={preset.id}
                    onClick={() => {
                      setActiveProfile(preset.id)
                      setVisibleCount(20)
                    }}
                    className={clsx('preset-card', preset.id === activeProfile && 'preset-card-active')}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-[11px] uppercase tracking-[0.28em] text-[var(--ink-soft)]">
                          {preset.shortLabel}
                        </p>
                        <h2 className="mt-2 text-lg font-semibold leading-tight">{preset.label}</h2>
                      </div>
                      <Icon className="mt-1 h-4 w-4 text-[var(--teal-700)]" />
                    </div>
                    <p className="mt-2 text-sm leading-6 text-[var(--ink-muted)]">{preset.goal}</p>
                    <div className="mt-4 border-t border-[var(--ghost-line)] pt-3">
                      <p className="text-[11px] uppercase tracking-[0.24em] text-[var(--ink-soft)]">
                        Current best fit
                      </p>
                      <div className="mt-1 flex items-end justify-between gap-3">
                        <div>
                          <p className="font-medium leading-tight">{leader?.canonical_family ?? '—'}</p>
                          <p className="mt-1 text-xs text-[var(--ink-muted)]">
                            {leader ? shortModelLine(leader) : 'No current match'}
                          </p>
                        </div>
                        <span className="text-sm font-semibold text-[var(--teal-700)]">
                          {formatFitScore(scenario?.scenario_score)}
                        </span>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </section>

        </div>
      </header>

      <section className="mx-auto max-w-[1600px] space-y-5 px-4 py-5 md:px-6">
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.65fr)_360px]">
          <section className="space-y-5">
          {topRecommendation && topScenario ? (
            <Panel title="Best model for this preset right now" icon={Sparkles}>
              <div className="grid gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)]">
                <div className="winner-shell">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="chip chip-good">Best fit for {activePreset.shortLabel}</span>
                    <span className="chip">Rank #1 of {presetRankedRows.length}</span>
                    <span className="chip">Fit {formatFitScore(topScenario.scenario_score)}</span>
                  </div>
                  <h2 className="mt-4 font-[var(--font-serif)] text-4xl leading-none md:text-5xl">
                    {topRecommendation.canonical_family}
                  </h2>
                  <p className="mt-3 max-w-3xl text-base leading-7 text-[var(--ink-muted)]">
                    {buildWinnerSummary(topRecommendation, activeProfile)}
                  </p>
                  <p className="mt-3 text-sm text-[var(--ink-muted)]">{shortModelLine(topRecommendation)}</p>
                  <SourceLinks row={topRecommendation} className="mt-4" />

                  <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <MetricCard label="Input cost / M" value={formatCurrency(topRecommendation.openrouter_input_price_per_million)} />
                    <MetricCard label="Output cost / M" value={formatCurrency(topRecommendation.openrouter_output_price_per_million)} />
                    <MetricCard label="Output speed" value={formatSpeed(topRecommendation.aa_median_tokens_per_second)} />
                    <MetricCard label="Context window" value={`${formatCompact(topRecommendation.openrouter_context_tokens)} tokens`} />
                    <MetricCard label="Reasoning score" value={formatNumber(topRecommendation.aa_intelligence_index, 1)} />
                    <MetricCard label="Coding score" value={formatNumber(topRecommendation.aa_coding_index, 1)} />
                    <MetricCard label="SWE-bench bash" value={formatPercent(topRecommendation.swebench_bash_resolved)} />
                    <MetricCard label="Toolathlon Pass@1" value={formatPercent(topRecommendation.toolathlon_pass_at_1)} />
                    <MetricCard label="Vals accuracy" value={formatPercent(topRecommendation.vals_accuracy)} />
                    <MetricCard label="LiveBench" value={formatNumber(topRecommendation.livebench_overall_score, 1)} />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="surface-panel">
                    <p className="section-kicker">Why it wins</p>
                    <p className="mt-2 text-sm leading-6 text-[var(--ink-muted)]">{prioritySentence}</p>
                    <div className="mt-4 space-y-3">
                      {winnerReasons.map((item) => (
                        <InsightRow key={item.label} title={item.label} body={item.body} metric={item.metric} />
                      ))}
                    </div>
                  </div>

                  <div className="surface-panel">
                    <p className="section-kicker">Watch-outs</p>
                    <div className="mt-3 space-y-3">
                      {winnerWarnings.map((warning) => (
                        <p key={warning} className="text-sm leading-6 text-[var(--ink-muted)]">
                          {warning}
                        </p>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </Panel>
          ) : (
            <Panel title="Best model for this preset right now" icon={Sparkles}>
              <p className="text-sm text-[var(--ink-muted)]">
                No preset winner is available from the current matched cohort.
              </p>
            </Panel>
          )}

          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <Panel title="Other good options" icon={Microscope}>
              <div className="grid gap-3 md:grid-cols-3">
                {alternatives.map((item) => {
                  const scenario = scenarioScores.get(`${item.row.canonical_model_id}::${activeProfile}`)
                  return (
                    <article key={item.row.canonical_model_id} className="surface-panel">
                      <p className="section-kicker">{item.label}</p>
                      <h3 className="mt-2 text-lg font-semibold leading-tight">{item.row.canonical_family}</h3>
                      <p className="mt-2 text-sm leading-6 text-[var(--ink-muted)]">
                        {item.body}
                      </p>
                      <p className="mt-3 text-xs text-[var(--ink-muted)]">{shortModelLine(item.row)}</p>
                      <SourceLinks row={item.row} className="source-links-compact mt-3" />
                      <div className="mt-4 grid gap-2">
                        <MiniStat label="Fit" value={formatFitScore(scenario?.scenario_score)} />
                        <MiniStat label="Cost" value={formatCurrency(item.row.openrouter_blended_price_per_million)} />
                        <MiniStat label="Speed" value={formatSpeed(item.row.aa_median_tokens_per_second)} />
                      </div>
                    </article>
                  )
                })}
              </div>
            </Panel>

            <Panel title="Why this preset picked it" icon={BadgeInfo}>
              <div className="surface-panel">
                <p className="text-sm leading-6 text-[var(--ink-muted)]">
                  {prioritySentence} Fit scores are normalized internal ranking numbers. We keep them
                  small because what matters is the ordering, the tradeoffs, and whether a model is
                  strong enough for your task at the right price.
                </p>
                <div className="mt-4 space-y-3">
                  {friendlyExplanation(topScenario ?? null).map((item) => (
                    <InsightRow key={item.label} title={item.label} body={item.body} metric={item.metric} />
                  ))}
                </div>
              </div>
            </Panel>
          </div>

          </section>

          <aside className="space-y-5 xl:sticky xl:top-4 xl:h-fit">
            <DisclosurePanel
              title="Source coverage"
              icon={FileClock}
              open={sourceCoverageOpen}
              onToggle={() => setSourceCoverageOpen((value) => !value)}
            >
              {topRecommendation ? (
                <div className="space-y-4">
                  <div className="surface-panel space-y-3">
                    <p className="section-kicker">Current winner coverage</p>
                    <CompactFact label="OpenRouter release" value={topRecommendation.openrouter_release_date ?? '—'} />
                    <CompactFact label="AA release" value={topRecommendation.aa_release_date ?? '—'} />
                    <CompactFact label="Vals release" value={topRecommendation.vals_release_date ?? '—'} />
                    <CompactFact label="SWE-bench bash" value={formatPercent(topRecommendation.swebench_bash_resolved)} />
                    <CompactFact label="Toolathlon Pass@1" value={formatPercent(topRecommendation.toolathlon_pass_at_1)} />
                    <CompactFact label="Coverage score" value={`${formatNumber(topRecommendation.coverage_score * 100, 0)}%`} />
                    <CompactFact label="Winner Vals data" value={topRecommendation.vals_enriched ? 'Matched' : 'Not matched'} />
                    <CompactFact label="Winner LiveBench data" value={topRecommendation.livebench_enriched ? 'Matched' : 'Not matched'} />
                  </div>

                  <div className="surface-panel">
                    <p className="section-kicker">Source freshness</p>
                    <div className="mt-3 space-y-2 text-sm text-[var(--ink-muted)]">
                      {Object.entries(data.manifest).map(([name, manifest]) => (
                        <div key={name} className="flex items-center justify-between gap-3">
                          <span>{formatSourceLabel(name)}</span>
                          <span>{formatShortDate(manifest.fetched_at)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-[var(--ink-muted)]">Source coverage appears here for the current winner.</p>
              )}
            </DisclosurePanel>

            <DisclosurePanel
              title="Compare picks"
              icon={GitCompareArrows}
              open={comparePicksOpen}
              onToggle={() => setComparePicksOpen((value) => !value)}
            >
              {selectedDetails.length === 0 ? (
                <p className="text-sm leading-6 text-[var(--ink-muted)]">
                  Pick up to three rows from the shortlist to compare tradeoffs side by side.
                </p>
              ) : (
                <div className="space-y-3">
                  {selectedDetails.map((row) => {
                    const scenario = scenarioScores.get(`${row.canonical_model_id}::${activeProfile}`)
                    return (
                      <article key={row.canonical_model_id} className="surface-panel">
                        <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--ink-soft)]">
                          {shortModelLine(row)}
                        </p>
                        <h3 className="mt-2 text-lg font-semibold leading-tight">{row.canonical_family}</h3>
                        <SourceLinks row={row} className="source-links-compact mt-3" />
                        <div className="mt-4 grid grid-cols-2 gap-2">
                          <MiniStat label="Fit" value={formatFitScore(scenario?.scenario_score)} />
                          <MiniStat label="Cost" value={formatCurrency(row.openrouter_blended_price_per_million)} />
                          <MiniStat label="Speed" value={formatSpeed(row.aa_median_tokens_per_second)} />
                          <MiniStat label="Reasoning" value={formatNumber(row.aa_intelligence_index, 1)} />
                        </div>
                      </article>
                    )
                  })}
                </div>
              )}
            </DisclosurePanel>
          </aside>
        </div>

        <Panel title="Browse matched models" icon={ArrowUpDown}>
          <div className="filter-band mb-4">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
              <div>
                <p className="section-kicker">Narrow the table</p>
                <p className="section-copy">
                  These controls only change the browse table below. They do not change the preset winner above.
                </p>
              </div>
              <div className="flex flex-wrap gap-2 text-xs text-[var(--ink-muted)]">
                <span className="chip">Rows shown: {browseEligibleRows.length} of {data.cohort.length}</span>
                <span className="chip">Backlog excluded: {excludedCount}</span>
                <span className="chip">Preset focus: {data.profiles.profiles[activeProfile]?.label}</span>
              </div>
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-[minmax(0,2fr)_220px_220px_220px_220px_240px]">
              <label className="block">
                <span className="field-label">Search</span>
                <div className="field-shell">
                  <Search className="h-4 w-4 text-[var(--ink-soft)]" />
                  <input
                    value={search}
                    onChange={(event) => {
                      setSearch(event.target.value)
                      setVisibleCount(20)
                    }}
                    className="field-input"
                    placeholder="Model family or variant"
                  />
                </div>
              </label>

              <label className="block">
                <span className="field-label">Provider</span>
                <select
                  className="field-select"
                  value={providerFilter}
                  onChange={(event) => {
                    setProviderFilter(event.target.value)
                    setVisibleCount(20)
                  }}
                >
                  {providers.map((provider) => (
                    <option key={provider} value={provider}>
                      {provider === 'all' ? 'All providers' : provider}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="field-label">Reasoning mode</span>
                <select
                  className="field-select"
                  value={reasoningFilter}
                  onChange={(event) => {
                    setReasoningFilter(event.target.value)
                    setVisibleCount(20)
                  }}
                >
                  <option value="all">All modes</option>
                  <option value="standard">Standard</option>
                  <option value="reasoning">Reasoning</option>
                  <option value="non_reasoning">Non-reasoning</option>
                </select>
              </label>

              <label className="block">
                <span className="field-label">Max blended cost / M</span>
                <input
                  type="range"
                  min={1}
                  max={50}
                  value={budgetCeiling}
                  onChange={(event) => {
                    setBudgetCeiling(Number(event.target.value))
                    setVisibleCount(20)
                  }}
                  className="w-full accent-[var(--teal-700)]"
                />
                <p className="mt-1 text-xs text-[var(--ink-muted)]">{formatCurrency(budgetCeiling)}</p>
              </label>

              <label className="block">
                <span className="field-label">Minimum context</span>
                <input
                  type="range"
                  min={8000}
                  max={2000000}
                  step={8000}
                  value={contextFloor}
                  onChange={(event) => {
                    setContextFloor(Number(event.target.value))
                    setVisibleCount(20)
                  }}
                  className="w-full accent-[var(--teal-700)]"
                />
                <p className="mt-1 text-xs text-[var(--ink-muted)]">{formatCompact(contextFloor)} tokens</p>
              </label>

              <label className="block">
                <span className="field-label">Sort rows by</span>
                <select
                  className="field-select"
                  value={sortKey}
                  onChange={(event) => {
                    const option = tableSortOptions.find((item) => item.key === event.target.value)
                    setSortKey(event.target.value)
                    setSortDirection((option?.direction ?? 'desc') as 'asc' | 'desc')
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
          </div>

          <div className="hidden overflow-x-auto lg:block">
            <table className="w-full min-w-[920px] border-collapse text-left">
              <thead>
                <tr>
                  <th className="table-head">Compare</th>
                  <th className="table-head">Rank</th>
                  <th className="table-head">Model</th>
                  <th className="table-head">Why consider it</th>
                  <th className="table-head">Fit</th>
                  <th className="table-head">Cost</th>
                  <th className="table-head">Speed</th>
                  <th className="table-head">Context</th>
                </tr>
              </thead>
              <tbody>
                {visibleRows.map((row, index) => {
                  const scenario = scenarioScores.get(`${row.canonical_model_id}::${activeProfile}`)
                  const selected = selectedModels.includes(row.canonical_model_id)
                  return (
                    <tr key={row.canonical_model_id} className={selected ? 'table-row-selected' : 'table-row'}>
                      <td className="table-cell">
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={() => toggleSelection(row.canonical_model_id, selectedModels, setSelectedModels)}
                          aria-label={`Compare ${row.canonical_family}`}
                        />
                      </td>
                      <td className="table-cell text-sm font-medium text-[var(--ink-muted)]">#{index + 1}</td>
                      <td className="table-cell">
                        <p className="font-medium">{row.canonical_family}</p>
                        <p className="mt-1 text-xs uppercase tracking-[0.18em] text-[var(--ink-soft)]">
                          {row.canonical_variant} · {row.provider}
                        </p>
                        <SourceLinks row={row} className="mt-2" />
                      </td>
                      <td className="table-cell max-w-[280px] text-sm leading-6 text-[var(--ink-muted)]">
                        {buildAlternativeSummary(row, topRecommendation)}
                      </td>
                      <td className="table-cell-strong">{formatFitScore(scenario?.scenario_score)}</td>
                      <td className="table-cell">{formatCurrency(row.openrouter_blended_price_per_million)}</td>
                      <td className="table-cell">{formatSpeed(row.aa_median_tokens_per_second)}</td>
                      <td className="table-cell">{formatCompact(row.openrouter_context_tokens)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <div className="space-y-3 lg:hidden">
            {visibleRows.map((row, index) => {
              const scenario = scenarioScores.get(`${row.canonical_model_id}::${activeProfile}`)
              const selected = selectedModels.includes(row.canonical_model_id)
              return (
                <article
                  key={row.canonical_model_id}
                  className={clsx('mobile-model-card', selected && 'mobile-model-card-selected')}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.28em] text-[var(--ink-soft)]">
                        Rank #{index + 1}
                      </p>
                      <h3 className="mt-2 text-lg font-semibold leading-tight">{row.canonical_family}</h3>
                      <p className="mt-2 text-sm text-[var(--ink-muted)]">{shortModelLine(row)}</p>
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
                  <p className="mt-3 text-sm leading-6 text-[var(--ink-muted)]">
                    {buildAlternativeSummary(row, topRecommendation)}
                  </p>
                  <SourceLinks row={row} className="source-links-compact mt-3" />
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <MiniStat label="Fit" value={formatFitScore(scenario?.scenario_score)} />
                    <MiniStat label="Cost" value={formatCurrency(row.openrouter_blended_price_per_million)} />
                    <MiniStat label="Speed" value={formatSpeed(row.aa_median_tokens_per_second)} />
                    <MiniStat label="Context" value={`${formatCompact(row.openrouter_context_tokens)} tok`} />
                  </div>
                </article>
              )
            })}
          </div>

          {visibleCount < tableRows.length ? (
            <div className="mt-4 flex justify-center">
              <button className="chip chip-good" onClick={() => setVisibleCount((count) => count + 20)}>
                Show 20 more
              </button>
            </div>
          ) : null}
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

function DisclosurePanel({
  title,
  icon: Icon,
  open,
  onToggle,
  children,
}: {
  title: string
  icon: typeof Search
  open: boolean
  onToggle: () => void
  children: ReactNode
}) {
  return (
    <section className="border border-[var(--ghost-line)] bg-[var(--surface-bright)] p-4 md:p-5">
      <button
        type="button"
        className="mb-4 flex w-full items-center justify-between gap-3 border-b border-[var(--ghost-line)] pb-3 text-left"
        onClick={onToggle}
        aria-expanded={open}
      >
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-[var(--teal-700)]" />
          <h2 className="font-[var(--font-serif)] text-2xl">{title}</h2>
        </div>
        <ChevronDown className={clsx('h-4 w-4 text-[var(--teal-700)] transition-transform', open && 'rotate-180')} />
      </button>
      {open ? children : null}
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

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-[var(--ghost-line)] bg-[var(--surface)] px-3 py-3">
      <p className="text-[10px] uppercase tracking-[0.22em] text-[var(--ink-soft)]">{label}</p>
      <p className="mt-2 text-lg font-semibold text-[var(--ink)]">{value}</p>
    </div>
  )
}

function InsightRow({
  title,
  body,
  metric,
}: {
  title: string
  body: string
  metric?: string
}) {
  return (
    <div className="border-l-2 border-[var(--teal-700)] pl-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium">{title}</p>
        {metric ? <span className="text-xs text-[var(--teal-700)]">{metric}</span> : null}
      </div>
      <p className="mt-1 text-sm leading-6 text-[var(--ink-muted)]">{body}</p>
    </div>
  )
}

function CompactFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="text-[var(--ink-muted)]">{label}</span>
      <span>{value}</span>
    </div>
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

function shortModelLine(row: GuideRow) {
  return `${formatReasoningMode(row.reasoning_mode)} · ${row.provider}`
}

function formatFitScore(score?: number | null) {
  if (score === null || score === undefined || Number.isNaN(score)) {
    return '—'
  }
  return `${Math.round(score * 100)}/100`
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

function formatSourceLabel(value: string) {
  const labels: Record<string, string> = {
    artificialanalysis_api: 'Artificial Analysis API',
    artificialanalysis_provider_pages: 'Artificial Analysis provider pages',
    livebench: 'LiveBench',
    openrouter_api: 'OpenRouter API',
    openrouter_pages: 'OpenRouter pages',
    swebench: 'SWE-bench',
    toolathlon: 'Toolathlon',
    vals_bundle: 'Vals bundle',
  }

  return labels[value] ?? titleCase(value)
}

function formatPercent(value?: number | null) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return '—'
  }
  return `${formatNumber(value, 1)}%`
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

function buildPrioritySentence(profiles: ScenarioProfiles, activeProfile: string) {
  const profileLabel = profiles.profiles[activeProfile]?.label ?? titleCase(activeProfile)
  const narratives: Record<string, string> = {
    coding: 'This preset privileges coding-specific and tool-use benchmark strength first, using AA, SWE-bench, and Toolathlon where available before checking speed, reasoning, and context.',
    reasoning: 'This preset is willing to pay for top-end reasoning, as long as the model still feels credible on coding and context-heavy work.',
    budget: 'This preset only treats a model as budget-worthy if it stays cheap and still clears a minimum usefulness bar on reasoning, coding, and speed.',
    latency: 'This preset prioritises interactive responsiveness first, then checks that the fast model is still worth using.',
    long_context: 'This preset requires real large-context headroom and enough throughput to behave like a workhorse instead of a paper spec.',
  }
  return narratives[activeProfile] ?? `${profileLabel} blends multiple factors into a single preset ranking.`
}

function buildWinnerSummary(row: GuideRow, activeProfile: string) {
  const context = row.openrouter_context_tokens
    ? `${formatCompact(row.openrouter_context_tokens)}-token context`
    : 'usable context headroom'
  const summaries: Record<string, string> = {
    coding: `${row.canonical_family} wins coding because it leads on the coding benchmark blend, including tool-use and software-engineering leaderboards where available, while still preserving ${context} and usable throughput.`,
    reasoning: `${row.canonical_family} wins reasoning because it leads on harder analysis without turning into a slow or brittle specialist pick.`,
    budget: `${row.canonical_family} wins budget because it stays genuinely inexpensive while still clearing the usefulness bar on speed and core capability.`,
    latency: `${row.canonical_family} wins latency because it is fast enough for interactive work without collapsing on the basics that make a model usable.`,
    long_context: `${row.canonical_family} wins long context because it pairs large context headroom with enough throughput to behave like a practical workhorse.`,
  }
  return summaries[activeProfile] ?? `${row.canonical_family} comes out on top for the current preset.`
}

function describeWhyItWon(row: GuideRow, scenario: ScenarioRow) {
  const topFactors = Object.entries(scenario.explanation)
    .sort((left, right) => right[1].contribution - left[1].contribution)
    .slice(0, 3)

  return topFactors.map(([factor, detail]) => ({
    label: factorLabels[factor] ?? titleCase(factor),
    title: factorLabels[factor] ?? titleCase(factor),
    body: factorExplanation(factor, detail.normalized_input),
    metric: factorMetric(factor, row),
  }))
}

function factorExplanation(factor: string, normalizedInput: number | null) {
  const normalized = normalizedInput ?? 0
  if (factor === 'coding') {
    return normalized >= 0.75
      ? 'Its coding and tool-use benchmark stack is near the top of the current preset cohort.'
      : 'Its coding benchmark stack is solid enough to stay competitive for implementation-heavy work.'
  }
  if (factor === 'reasoning') {
    return normalized >= 0.75
      ? 'It stays strong on harder planning and reasoning tasks, not just straightforward prompts.'
      : 'Reasoning remains a support strength rather than a weak spot for this preset.'
  }
  if (factor === 'budget') {
    return 'Its routed pricing is low enough to qualify for the budget lane without making the model feel throwaway.'
  }
  if (factor === 'latency') {
    return 'Its response speed keeps it usable in interactive flows where lag breaks the experience.'
  }
  if (factor === 'long_context') {
    return 'It has enough context headroom to handle large files and long chats without failing the workhorse test.'
  }
  return 'This factor meaningfully helps the model stay near the top of the current ranking.'
}

function factorMetric(factor: string, row: GuideRow) {
  if (factor === 'coding') {
    const parts = [
      row.aa_coding_index !== null && row.aa_coding_index !== undefined
        ? `AA ${formatNumber(row.aa_coding_index, 1)}`
        : null,
      row.swebench_bash_resolved !== null && row.swebench_bash_resolved !== undefined
        ? `SWE ${formatNumber(row.swebench_bash_resolved, 1)}%`
        : null,
      row.toolathlon_pass_at_1 !== null && row.toolathlon_pass_at_1 !== undefined
        ? `Tool ${formatNumber(row.toolathlon_pass_at_1, 1)}%`
        : null,
    ].filter((value): value is string => Boolean(value))
    return parts.join(' · ')
  }
  if (factor === 'reasoning') {
    return `AA int. ${formatNumber(row.aa_intelligence_index, 1)}`
  }
  if (factor === 'budget') {
    return formatCurrency(row.openrouter_blended_price_per_million)
  }
  if (factor === 'latency') {
    return formatSpeed(row.aa_median_tokens_per_second)
  }
  if (factor === 'long_context') {
    return `${formatCompact(row.openrouter_context_tokens)} tok`
  }
  return ''
}

function describeTradeoffs(row: GuideRow) {
  const warnings: string[] = []
  if (!row.vals_enriched) {
    warnings.push('No Vals application-style benchmark is matched yet, so workflow quality is less proven than for Vals-backed rows.')
  }
  if (!row.livebench_enriched) {
    warnings.push('No LiveBench match is available yet, so public benchmark cross-checking is thinner here.')
  }
  if ((row.openrouter_blended_price_per_million ?? 0) > 5) {
    warnings.push('This is not a budget-first pick. Cheaper alternatives exist if raw spend matters more than top-end capability.')
  }
  if ((row.aa_median_ttft_seconds ?? 0) > 10) {
    warnings.push('Time to first token is relatively slow, so it may feel less snappy in interactive chat than the latency-focused picks.')
  }
  if (warnings.length === 0) {
    warnings.push('Tradeoffs are moderate rather than severe, but you should still check the cheaper and faster alternatives below before locking it in.')
  }
  return warnings.slice(0, 2)
}

function buildAlternativeSummary(row: GuideRow, leader?: GuideRow) {
  if (!leader) {
    return 'Useful alternative in the matched model set.'
  }
  if (row.canonical_model_id === leader.canonical_model_id) {
    return 'Top current fit for the active preset.'
  }

  const notes: string[] = []
  if ((row.openrouter_blended_price_per_million ?? 9999) < (leader.openrouter_blended_price_per_million ?? 9999)) {
    notes.push('lower cost')
  }
  if ((row.aa_median_tokens_per_second ?? 0) > (leader.aa_median_tokens_per_second ?? 0)) {
    notes.push('faster output')
  }
  if ((row.openrouter_context_tokens ?? 0) > (leader.openrouter_context_tokens ?? 0)) {
    notes.push('more context headroom')
  }
  if ((row.vals_accuracy ?? -1) > (leader.vals_accuracy ?? -1)) {
    notes.push('stronger Vals accuracy')
  }
  if ((row.livebench_overall_score ?? -1) > (leader.livebench_overall_score ?? -1)) {
    notes.push('stronger LiveBench')
  }
  if ((row.swebench_bash_resolved ?? -1) > (leader.swebench_bash_resolved ?? -1)) {
    notes.push('stronger SWE-bench')
  }
  if ((row.toolathlon_pass_at_1 ?? -1) > (leader.toolathlon_pass_at_1 ?? -1)) {
    notes.push('stronger Toolathlon')
  }
  if (notes.length === 0) {
    return 'Still competitive if you want a different balance of cost, speed, or context than the current winner.'
  }
  return `Worth a look if you want ${notes.slice(0, 2).join(' and ')} instead of the current winner's balance.`
}

function buildAlternativeCards(
  rankedRows: GuideRow[],
  leader: GuideRow | undefined,
  activeProfile: string,
) {
  if (!leader) {
    return []
  }

  const pool = rankedRows.filter((row) => row.canonical_model_id !== leader.canonical_model_id)
  const used = new Set<string>()
  const cards: Array<{ label: string; body: string; row: GuideRow }> = []

  const take = (
    label: string,
    predicate: (row: GuideRow) => boolean,
    body: (row: GuideRow) => string,
  ) => {
    const candidate = pool.find((row) => !used.has(row.canonical_model_id) && predicate(row))
    if (!candidate) {
      return
    }
    used.add(candidate.canonical_model_id)
    cards.push({ label, body: body(candidate), row: candidate })
  }

  if (activeProfile === 'coding') {
    take(
      'Cheaper coding default',
      (row) => (row.openrouter_blended_price_per_million ?? 9999) < (leader.openrouter_blended_price_per_million ?? 9999),
      (row) => `${row.canonical_family} is the lower-cost coding option if you want to save money without dropping out of the top preset lane.`,
    )
    take(
      'Faster coding option',
      (row) => (row.aa_median_tokens_per_second ?? 0) > Math.max((leader.aa_median_tokens_per_second ?? 0) + 20, 40),
      (row) => `${row.canonical_family} is the quicker coding pick when output speed matters more than squeezing out the last bit of coding quality.`,
    )
    take(
      'Benchmark-backed coding pick',
      (row) => Boolean(row.vals_enriched || row.livebench_enriched),
      (row) => `${row.canonical_family} keeps more public benchmark evidence attached, so it is easier to justify if you want a more proven coding option.`,
    )
  } else if (activeProfile === 'reasoning') {
    take(
      'Cheaper reasoner',
      (row) => (row.openrouter_blended_price_per_million ?? 9999) < (leader.openrouter_blended_price_per_million ?? 9999),
      (row) => `${row.canonical_family} is the cheaper reasoning pick if you want to cut spend before you give up on analysis quality.`,
    )
    take(
      'Faster reasoner',
      (row) => (row.aa_median_tokens_per_second ?? 0) > (leader.aa_median_tokens_per_second ?? 0),
      (row) => `${row.canonical_family} is the faster reasoning alternative if you want a premium-feeling model that is more responsive in chat.`,
    )
    take(
      'More benchmark-backed reasoner',
      (row) => Boolean(row.vals_enriched || row.livebench_enriched),
      (row) => `${row.canonical_family} keeps more benchmark evidence attached, which makes it the easier reasoning pick to defend with external signal.`,
    )
  } else if (activeProfile === 'budget') {
    take(
      'Faster cheap pick',
      (row) => (row.aa_median_tokens_per_second ?? 0) > (leader.aa_median_tokens_per_second ?? 0),
      (row) => `${row.canonical_family} is the faster low-cost alternative if responsiveness matters more to you than the current budget winner's balance.`,
    )
    take(
      'Smarter cheap pick',
      (row) => (row.aa_intelligence_index ?? -1) > (leader.aa_intelligence_index ?? -1),
      (row) => `${row.canonical_family} costs more or runs slower in exchange for a stronger reasoning ceiling while still staying in budget territory.`,
    )
    take(
      'Bigger-context cheap pick',
      (row) => (row.openrouter_context_tokens ?? 0) > (leader.openrouter_context_tokens ?? 0),
      (row) => `${row.canonical_family} is the low-cost option to check if large context matters more than pure responsiveness.`,
    )
  } else if (activeProfile === 'latency') {
    take(
      'Cheaper fast pick',
      (row) => (row.openrouter_blended_price_per_million ?? 9999) < (leader.openrouter_blended_price_per_million ?? 9999),
      (row) => `${row.canonical_family} is the cheaper fast model if you want to keep the UI snappy without paying for the current winner.`,
    )
    take(
      'Smarter fast pick',
      (row) => (row.aa_intelligence_index ?? -1) > (leader.aa_intelligence_index ?? -1),
      (row) => `${row.canonical_family} is the smarter latency-conscious option when you want more headroom on reasoning and can accept a slightly slower response.`,
    )
    take(
      'Longer-context fast pick',
      (row) => (row.openrouter_context_tokens ?? 0) > (leader.openrouter_context_tokens ?? 0),
      (row) => `${row.canonical_family} is the better fast option if your chats or files get large enough that context starts to matter.`,
    )
  } else if (activeProfile === 'long_context') {
    take(
      'Cheaper long-context pick',
      (row) => (row.openrouter_blended_price_per_million ?? 9999) < (leader.openrouter_blended_price_per_million ?? 9999),
      (row) => `${row.canonical_family} gives you large context headroom for less money if the current winner feels too premium for the job.`,
    )
    take(
      'Faster long-context pick',
      (row) => (row.aa_median_tokens_per_second ?? 0) > (leader.aa_median_tokens_per_second ?? 0),
      (row) => `${row.canonical_family} is the better long-context option if you want a big window that still feels faster in practice.`,
    )
    take(
      'Smarter long-context pick',
      (row) => (row.aa_intelligence_index ?? -1) > (leader.aa_intelligence_index ?? -1),
      (row) => `${row.canonical_family} is the long-context alternative to check when you want more reasoning headroom, not just a large context number.`,
    )
  }

  for (const row of pool) {
    if (cards.length >= 3) {
      break
    }
    if (used.has(row.canonical_model_id)) {
      continue
    }
    used.add(row.canonical_model_id)
    cards.push({
      label: 'Also worth a look',
      body: buildAlternativeSummary(row, leader),
      row,
    })
  }

  return cards.slice(0, 3)
}

function friendlyExplanation(scenario: ScenarioRow | null) {
  if (!scenario) {
    return []
  }
  return Object.entries(scenario.explanation)
    .sort((left, right) => right[1].contribution - left[1].contribution)
    .slice(0, 4)
    .map(([factor, detail]) => ({
      label: factorLabels[factor] ?? titleCase(factor),
      body:
        detail.normalized_input === null
          ? 'This factor had no usable input for the winner, so it did not materially lift the rank.'
          : `${factorLabels[factor] ?? titleCase(factor)} accounts for ${Math.round(detail.weight * 100)}% of this preset and materially influenced the final ordering.`,
      metric:
        detail.normalized_input === null
          ? 'No current signal'
          : `${Math.round(detail.contribution * 100)} fit points`,
    }))
}
