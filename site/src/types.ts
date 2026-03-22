export type SourceManifest = Record<
  string,
  {
    fetched_at?: string
    source_url?: string
    parser_version?: string
    record_count?: number
  }
>

export type Explanation = Record<
  string,
  { weight: number; normalized_input: number | null; contribution: number }
>

export type GuideRow = {
  canonical_model_id: string
  canonical_family: string
  canonical_variant: string
  provider: string
  reasoning_mode: string
  match_strategy: string
  normalization_notes: string
  has_openrouter: boolean
  has_aa: boolean
  has_vals: boolean
  has_livebench: boolean
  openrouter_slug?: string | null
  openrouter_input_price_per_million?: number | null
  openrouter_output_price_per_million?: number | null
  openrouter_blended_price_per_million?: number | null
  openrouter_context_tokens?: number | null
  openrouter_release_date?: string | null
  aa_intelligence_index?: number | null
  aa_coding_index?: number | null
  aa_median_tokens_per_second?: number | null
  vals_accuracy?: number | null
  vals_release_date?: string | null
  vals_latency_seconds?: number | null
  vals_cost_per_test?: number | null
  vals_benchmarks?: Array<{
    benchmark: string
    score: number | null
    ci_plus_minus: number | null
    rank: number
    population: number
  }>
  vals_index_rank?: number | null
  vals_index_population?: number | null
  livebench_overall_score?: number | null
  livebench_categories?: Record<string, number>
  cohort_eligible: boolean
  strict_cohort_eligible: boolean
  vals_enriched?: boolean
  livebench_enriched?: boolean
  exclusion_reasons: string
  coverage_score: number
  source_flags: Record<string, boolean>
  [key: string]: unknown
}

export type ScenarioRow = {
  canonical_model_id: string
  scenario_profile: string
  scenario_label: string
  scenario_score: number
  explanation: Explanation
}

export type ScenarioProfiles = {
  version: number
  profiles: Record<string, { label: string; weights: Record<string, number> }>
}

export type CohortRules = {
  version: number
  description: string
  required_sources: string[]
  required_metrics: string[]
  strict_required_sources?: string[]
  strict_required_metrics?: string[]
  preferred_sources?: string[]
}
