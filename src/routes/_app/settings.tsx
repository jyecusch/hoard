import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { LogOut, Monitor, Moon, Sun } from 'lucide-react'
import { authClient } from '#/lib/auth-client'
import { useTheme } from '#/lib/theme'
import type { Theme } from '#/lib/theme'
import { Button } from '#/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '#/components/ui/card'
import { Label } from '#/components/ui/label'
import { cn } from '#/lib/utils'

export const Route = createFileRoute('/_app/settings')({
  component: SettingsPage,
})

const THEMES: Array<{ value: Theme; label: string; icon: typeof Sun }> = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Monitor },
]

function SettingsPage() {
  const navigate = useNavigate()
  const { data: session } = authClient.useSession()
  const { theme, setTheme } = useTheme()

  async function signOut() {
    await authClient.signOut()
    navigate({ to: '/login', search: { redirect: undefined } })
  }

  return (
    <main className="mx-auto w-full max-w-lg flex-1 space-y-6 p-4 md:p-8">
      <h1 className="text-2xl font-bold tracking-tight">Settings</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Account</CardTitle>
          <CardDescription>
            {session?.user.name} · {session?.user.email}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" onClick={signOut}>
            <LogOut className="mr-2 h-4 w-4" /> Sign out
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Appearance</CardTitle>
        </CardHeader>
        <CardContent>
          <Label className="mb-2 block">Theme</Label>
          <div className="grid grid-cols-3 gap-2">
            {THEMES.map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                type="button"
                onClick={() => setTheme(value)}
                className={cn(
                  'flex flex-col items-center gap-1 rounded-md border p-3 text-sm hover:bg-accent',
                  theme === value && 'border-primary bg-accent',
                )}
              >
                <Icon className="h-5 w-5" />
                {label}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>
    </main>
  )
}
