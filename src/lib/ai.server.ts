import { createAnthropic } from '@ai-sdk/anthropic'
import { createOpenAI } from '@ai-sdk/openai'
import type { LanguageModel } from 'ai'

/**
 * Provider selection for /api/enrich. SERVER-ONLY — reads provider API keys
 * from env. Configured via:
 *
 *   AI_PROVIDER   'anthropic' (default) | 'openai'
 *   AI_MODEL      model id (defaults per provider below)
 *   ANTHROPIC_API_KEY / OPENAI_API_KEY
 */
const DEFAULT_MODEL = {
  anthropic: 'claude-haiku-4-5',
  openai: 'gpt-4o-mini',
} as const

type AiProvider = keyof typeof DEFAULT_MODEL

function resolveProvider(): AiProvider {
  return process.env.AI_PROVIDER === 'openai' ? 'openai' : 'anthropic'
}

/**
 * The configured vision model, or null when no API key is set for the chosen
 * provider (enrichment is an optional feature — the app runs without it).
 */
export function getEnrichmentModel(): LanguageModel | null {
  const provider = resolveProvider()
  const modelId = process.env.AI_MODEL || DEFAULT_MODEL[provider]

  if (provider === 'openai') {
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) return null
    return createOpenAI({ apiKey })(modelId)
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return null
  return createAnthropic({ apiKey })(modelId)
}
