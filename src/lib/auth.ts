import Database from 'better-sqlite3'
import { betterAuth } from 'better-auth'
import { jwt } from 'better-auth/plugins'
import { tanstackStartCookies } from 'better-auth/tanstack-start'
import { mkdirSync } from 'node:fs'

/**
 * Server-side Better Auth instance. Mounted at /api/auth/* by
 * src/routes/api/auth/$.ts. SERVER-ONLY — never import from client code.
 *
 * The `jwt` plugin exposes a JWKS endpoint at /api/auth/jwks; the Jazz sync
 * server validates client JWTs against it, and the JWT `sub` (the Better Auth
 * user id) becomes Jazz's `session.user_id`.
 */
const dbDir = process.env.AUTH_DB_DIR ?? './data'
mkdirSync(dbDir, { recursive: true })

// Better Auth rejects requests whose Origin doesn't match baseURL. Extra
// origins (e.g. http://192.168.1.20:4300 for phone-on-LAN testing) can be
// allowed via a comma-separated env var.
const trustedOrigins = (process.env.BETTER_AUTH_TRUSTED_ORIGINS ?? '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean)

export const auth = betterAuth({
  database: new Database(`${dbDir}/auth.db`),
  baseURL: process.env.BETTER_AUTH_URL ?? 'http://localhost:4300',
  trustedOrigins,
  emailAndPassword: {
    enabled: true,
  },
  plugins: [
    jwt({
      jwks: {
        keyPairConfig: { alg: 'ES256' },
      },
    }),
    tanstackStartCookies(),
  ],
})
