import { Link, useNavigate } from '@tanstack/react-router'
import {
  Home,
  LogOut,
  Package,
  ScanLine,
  Search,
  Settings,
  Tags,
  Zap,
} from 'lucide-react'
import { authClient } from '#/lib/auth-client'
import { SearchCommand } from '#/components/search-command'
import { Button } from '#/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '#/components/ui/dropdown-menu'
import { cn } from '#/lib/utils'

// Desktop sidebar gets everything; mobile gets the on-the-go actions
// (label PDFs are printed from a computer) plus Settings.
const NAV = [
  { to: '/', label: 'Home', icon: Home },
  { to: '/search', label: 'Search', icon: Search },
  { to: '/scan', label: 'Scan', icon: ScanLine, accent: true },
  { to: '/capture', label: 'Capture', icon: Zap },
  { to: '/labels', label: 'Labels', icon: Tags },
] as const

const MOBILE_NAV = [
  { to: '/', label: 'Home', icon: Home },
  { to: '/search', label: 'Search', icon: Search },
  { to: '/scan', label: 'Scan', icon: ScanLine, accent: true },
  { to: '/capture', label: 'Capture', icon: Zap },
  { to: '/settings', label: 'Settings', icon: Settings },
] as const

export function AppShell({
  userName,
  userEmail,
  children,
}: {
  userName: string
  userEmail: string
  children: React.ReactNode
}) {
  const navigate = useNavigate()

  async function signOut() {
    await authClient.signOut()
    navigate({ to: '/login', search: { redirect: undefined } })
  }

  return (
    <div className="flex min-h-svh">
      <SearchCommand />

      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-svh w-56 shrink-0 flex-col border-r bg-sidebar md:flex">
        <Link to="/" className="flex items-center gap-2.5 px-5 pb-6 pt-5">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary">
            <Package className="h-4.5 w-4.5 text-primary-foreground" strokeWidth={2} />
          </span>
          <span className="font-display text-xl font-extrabold tracking-tight">Hoard</span>
        </Link>
        <nav className="flex flex-1 flex-col gap-0.5 px-3">
          {NAV.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              className="group flex items-center gap-3 rounded-md border-l-2 border-transparent px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground [&.active]:border-primary [&.active]:bg-accent/60 [&.active]:text-foreground"
              activeOptions={{ exact: to === '/' }}
            >
              <Icon className="h-4 w-4 opacity-70 group-[.active]:text-primary group-[.active]:opacity-100" />
              {label}
              {to === '/search' && (
                <kbd className="ml-auto rounded border bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                  ⌘K
                </kbd>
              )}
            </Link>
          ))}
        </nav>
        <div className="border-t p-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="w-full justify-start gap-2 px-3"
              >
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                  {userName.slice(0, 1).toUpperCase()}
                </span>
                <span className="truncate text-sm">{userName}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-52">
              <DropdownMenuLabel className="truncate text-xs font-normal text-muted-foreground">
                {userEmail}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link to="/settings">
                  <Settings className="mr-2 h-4 w-4" /> Settings
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={signOut}>
                <LogOut className="mr-2 h-4 w-4" /> Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex min-w-0 flex-1 flex-col pb-16 md:pb-0">
        {children}
      </div>

      {/* Mobile bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-40 flex items-stretch justify-around border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
        {MOBILE_NAV.map(({ to, label, icon: Icon, ...rest }) => {
          const accent = 'accent' in rest && rest.accent
          return (
            <Link
              key={to}
              to={to}
              activeOptions={{ exact: to === '/' }}
              className={cn(
                'flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-medium text-muted-foreground [&.active]:text-primary',
              )}
            >
              <span
                className={cn(
                  accent &&
                    '-mt-4 flex h-11 w-11 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg',
                )}
              >
                <Icon className={cn('h-5 w-5', accent && 'h-5 w-5')} />
              </span>
              {label}
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
