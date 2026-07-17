import { createFileRoute, Link } from '@tanstack/react-router'
import { useState } from 'react'
import { Search } from 'lucide-react'
import { useSearch } from '#/lib/search'
import { Input } from '#/components/ui/input'
import { Skeleton } from '#/components/ui/skeleton'
import {
  SearchNoMatches,
  SearchResultContent,
} from '#/components/search-command'

export const Route = createFileRoute('/_app/search')({
  component: SearchPage,
})

function SearchPage() {
  const [query, setQuery] = useState('')
  const { loading, results } = useSearch(query)
  const trimmed = query.trim()

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 p-4 md:p-8">
      <div className="relative mb-6">
        <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
        <Input
          autoFocus
          type="search"
          aria-label="Search your hoard"
          placeholder="Search your hoard…"
          className="h-14 rounded-xl pl-12 !text-lg"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {!trimmed ? (
        <p className="px-4 py-12 text-center text-sm text-muted-foreground">
          Search your whole hoard — try a vague description, tags, or part of a
          name.
        </p>
      ) : loading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className="h-14 rounded-lg" />
          ))}
        </div>
      ) : results.length === 0 ? (
        <SearchNoMatches className="px-4 py-12" />
      ) : (
        <ul className="divide-y rounded-lg border">
          {results.map((result) => (
            <li key={result.container.id}>
              <Link
                to="/i/$id"
                params={{ id: result.container.id }}
                className="flex items-center gap-3 p-3 hover:bg-accent/50"
              >
                <SearchResultContent result={result} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
