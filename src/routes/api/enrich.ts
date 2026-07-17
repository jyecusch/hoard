import { createFileRoute } from '@tanstack/react-router'
import { generateObject } from 'ai'
import { z } from 'zod'
import { auth } from '#/lib/auth'
import { getEnrichmentModel } from '#/lib/ai.server'

/**
 * AI capture enrichment: photo in, suggested name + description + search
 * keywords out. Keywords include layman phrasings/synonyms so vague future
 * searches ("wire squeezer thing") still find the item.
 */

// An ~800px capture JPEG is 100–200KB as a data URL; 6MB is a generous cap
// that still stops accidental full-resolution uploads.
const MAX_BODY_BYTES = 6 * 1024 * 1024

const enrichmentSchema = z.object({
  name: z
    .string()
    .describe('Short, specific item name, e.g. "Crimping tool" or "M6 hex bolts"'),
  description: z.string().describe('One sentence describing the item'),
  keywords: z
    .array(z.string())
    .describe(
      'Between 8 and 15 search keywords and synonyms, including layman phrasings (e.g. "wire squeezer", "electrical connector tool" for a crimper)',
    ),
})

const SYSTEM_PROMPT =
  'You identify household items from photos for a home inventory app. ' +
  'Given a photo of an item, suggest a short specific name, a one-sentence ' +
  'description, and 8-15 search keywords. Keywords must cover synonyms, ' +
  'category terms, and layman phrasings a non-expert might type months later ' +
  '(e.g. for a crimping tool: "wire squeezer", "electrical connector tool", ' +
  '"terminal pliers"). Do not include keywords that merely repeat the name.'

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

export const Route = createFileRoute('/api/enrich')({
  server: {
    handlers: {
      POST: async ({ request }: { request: Request }) => {
        const session = await auth.api.getSession({ headers: request.headers })
        if (!session) return json({ error: 'unauthorized' }, 401)

        const contentLength = Number(request.headers.get('content-length') ?? 0)
        if (contentLength > MAX_BODY_BYTES) {
          return json({ error: 'payload-too-large' }, 413)
        }
        const raw = await request.text()
        if (raw.length > MAX_BODY_BYTES) {
          return json({ error: 'payload-too-large' }, 413)
        }

        let body: { image?: unknown; hint?: unknown }
        try {
          body = JSON.parse(raw)
        } catch {
          return json({ error: 'invalid-json' }, 400)
        }

        const image = typeof body.image === 'string' ? body.image : null
        const base64 = image?.startsWith('data:image/jpeg;base64,')
          ? image.slice('data:image/jpeg;base64,'.length)
          : null
        if (!base64) return json({ error: 'invalid-image' }, 400)
        const hint = typeof body.hint === 'string' ? body.hint.slice(0, 200) : null

        const model = getEnrichmentModel()
        if (!model) return json({ error: 'ai-not-configured' }, 503)

        try {
          const { object } = await generateObject({
            model,
            schema: enrichmentSchema,
            system: SYSTEM_PROMPT,
            messages: [
              {
                role: 'user',
                content: [
                  {
                    type: 'text',
                    text:
                      'Identify the main item in this photo.' +
                      (hint ? ` Hint from the user: ${hint}` : ''),
                  },
                  { type: 'image', image: base64, mediaType: 'image/jpeg' },
                ],
              },
            ],
          })
          return json({
            name: object.name,
            description: object.description,
            keywords: object.keywords
              .map((k) => k.trim())
              .filter(Boolean)
              .slice(0, 15),
          })
        } catch {
          return json({ error: 'enrichment-failed' }, 502)
        }
      },
    },
  },
})
