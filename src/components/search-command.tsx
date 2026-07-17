import { useEffect, useRef, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { Box, Boxes, Search, Sparkles } from 'lucide-react'
import { useSearch } from '#/lib/search'
import type { SearchResult } from '#/lib/search'
import { Badge } from '#/components/ui/badge'
import { Dialog, DialogContent, DialogTitle } from '#/components/ui/dialog'
import { cn } from '#/lib/utils'

/**
 * Cmd-K style quick search dialog, mounted once in the app shell.
 * Opens on ⌘K / Ctrl+K, arrow keys move the selection, Enter navigates.
 */
export function SearchCommand() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const navigate = useNavigate()
  const { results } = useSearch(open ? query : '')
  const listRef = useRef<HTMLUListElement>(null)

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setOpen((prev) => !prev)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  // Keep the selection in view as it moves.
  useEffect(() => {
    listRef.current?.children[activeIndex]?.scrollIntoView({ block: 'nearest' })
  }, [activeIndex])

  function handleOpenChange(next: boolean) {
    setOpen(next)
    if (!next) {
      setQuery('')
      setActiveIndex(0)
    }
  }

  function goTo(id: string) {
    handleOpenChange(false)
    navigate({ to: '/i/$id', params: { id } })
  }

  function handleInputKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((i) => Math.min(i + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const active = results.at(activeIndex)
      if (active) goTo(active.container.id)
    }
  }

  const trimmed = query.trim()

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        showCloseButton={false}
        aria-describedby={undefined}
        className="top-24 max-w-xl translate-y-0 gap-0 overflow-hidden p-0"
      >
        <DialogTitle className="sr-only">Search</DialogTitle>
        <div className="flex items-center gap-3 border-b px-4">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
          <input
            autoFocus
            role="combobox"
            aria-expanded={results.length > 0}
            aria-controls="search-command-results"
            aria-label="Search your hoard"
            placeholder="Search your hoard…"
            className="h-12 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setActiveIndex(0)
            }}
            onKeyDown={handleInputKeyDown}
          />
          <kbd className="rounded border bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
            Esc
          </kbd>
        </div>

        {!trimmed ? (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">
            Search your whole hoard — try a vague description, tags, or part of
            a name.
          </p>
        ) : results.length === 0 ? (
          <SearchNoMatches className="px-4 py-8" />
        ) : (
          <ul
            id="search-command-results"
            ref={listRef}
            className="max-h-80 overflow-y-auto p-2"
          >
            {results.map((result, i) => (
              <li key={result.container.id}>
                <button
                  type="button"
                  className={cn(
                    'flex w-full items-center gap-3 rounded-md px-3 py-2 text-left',
                    i === activeIndex && 'bg-accent text-accent-foreground',
                  )}
                  onMouseMove={() => setActiveIndex(i)}
                  onClick={() => goTo(result.container.id)}
                >
                  <SearchResultContent result={result} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  )
}

/** Shared result row body: icon, name, breadcrumb path, tag badges. */
export function SearchResultContent({ result }: { result: SearchResult }) {
  const { container, path } = result
  const ancestors = path.slice(0, -1)
  const Icon = container.isItem ? Box : Boxes

  return (
    <>
      <Icon
        className={cn(
          'h-5 w-5 shrink-0',
          container.isItem ? 'text-muted-foreground' : 'text-primary',
        )}
      />
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{container.name}</p>
        {ancestors.length > 0 && (
          <p className="truncate text-xs text-muted-foreground">
            {ancestors.map((node) => node.name).join(' / ')}
          </p>
        )}
      </div>
      {container.tags.length > 0 && (
        <span className="flex max-w-[45%] shrink-0 flex-wrap justify-end gap-1">
          {container.tags.slice(0, 3).map((tag) => (
            <Badge key={tag} variant="secondary">
              {tag}
            </Badge>
          ))}
        </span>
      )}
    </>
  )
}

/** Shared "no results" empty state. */
export function SearchNoMatches({ className }: { className?: string }) {
  return (
    <div className={cn('text-center', className)}>
      <p className="text-sm font-medium">No matches</p>
      <p className="mx-auto mt-1 flex max-w-sm items-start justify-center gap-1.5 text-xs text-muted-foreground">
        <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        <span>
          Tip: items captured with photos get AI-generated keywords, so vague
          searches improve over time.
        </span>
      </p>
    </div>
  )
}
