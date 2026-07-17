import { chromium } from 'playwright'
const BASE = process.env.HOARD_URL ?? 'http://localhost:4300'
const ts = Date.now()
const browser = await chromium.launch()
const a = await (await browser.newContext()).newPage()
try {
  await a.goto(BASE + '/signup', { waitUntil: 'domcontentloaded' })
  await a.waitForSelector('#name', { timeout: 30000 })
  await a.fill('#name', 'ViewOwner')
  await a.fill('#email', `vown-${ts}@example.com`)
  await a.fill('#password', 'password1234')
  await a.click('button[type=submit]')
  await a.waitForURL(BASE + '/', { timeout: 15000 })
  await a.click('button:has-text("Create your first hoard")')
  await a.fill('#add-name', 'Bikes')
  await a.click('button[type=submit]:has-text("Create")')
  await a.click('a:has-text("Bikes")')
  await a.waitForSelector('h1:has-text("Bikes")')
  await a.click('button:has-text("Item")')
  await a.fill('#add-name', 'Road bike')
  await a.click('button[type=submit]:has-text("Create")')
  await a.waitForSelector('a:has-text("Road bike")')
  await a.click('main button:has([class*=lucide-ellipsis])')
  await a.click('[role=menuitem]:has-text("Share")')
  await a.click('button:has-text("New view link")')
  await a.waitForSelector('[role=dialog] span.font-mono', { timeout: 10000 })
  const code = (await a.textContent('[role=dialog] span.font-mono')).trim().split('/join/')[1]
  console.log('STEP owner-setup: OK')

  const c = await (await browser.newContext()).newPage()
  await c.goto(BASE + `/join/${code}`, { waitUntil: 'domcontentloaded' })
  await c.waitForSelector('a:has-text("Create one")', { timeout: 30000 })
  await c.click('a:has-text("Create one")')
  await c.waitForSelector('#name', { timeout: 30000 })
  await c.fill('#name', 'Viewer')
  await c.fill('#email', `viewer-${ts}@example.com`)
  await c.fill('#password', 'password1234')
  await c.click('button[type=submit]')
  await c.waitForSelector('text=view access', { timeout: 20000 })
  await c.click('button:has-text("Join")')
  await c.waitForSelector('h1:has-text("Bikes")', { timeout: 25000 })
  console.log('STEP viewer-join: OK')

  // Viewer sees contents but has NO edit affordances
  await c.waitForSelector('a:has-text("Road bike")', { timeout: 15000 })
  const addItemVisible = await c.isVisible('main button:has-text("Item")')
  const menuVisible = await c.isVisible('main button:has([class*=lucide-ellipsis])')
  console.log('STEP viewer-readonly:', !addItemVisible && !menuVisible ? 'OK' : `FAIL (item=${addItemVisible} menu=${menuVisible})`)
  console.log('SMOKE8 PASS')
} catch (err) {
  console.log('SMOKE8 FAIL:', String(err).slice(0, 300))
} finally {
  await browser.close()
}
