import { chromium } from 'playwright'

const BASE = process.env.HOARD_URL ?? 'http://localhost:4300'
const SHOT_DIR = new URL('.', import.meta.url).pathname

function fail(msg) {
  console.error('FAIL: ' + msg)
  process.exitCode = 1
}

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })
page.on('pageerror', (err) => console.log('pageerror:', err.message))

// --- Sign up a fresh user ---
const stamp = Date.now()
await page.goto(BASE + '/signup')
await page.fill('#name', 'Search Tester')
await page.fill('#email', `search-${stamp}@example.com`)
await page.fill('#password', 'hunter2hunter2')
await page.click('button[type="submit"]')
await page.waitForURL(BASE + '/', { timeout: 20000 })
console.log('signed up')

// --- Create hoard "Garage" ---
await page.waitForSelector('button:has-text("Create your first hoard")', {
  timeout: 20000,
})
await page.click('button:has-text("Create your first hoard")')
await page.fill('#add-name', 'Garage')
await page.click('button[type=submit]:has-text("Create")')
await page.waitForSelector('a:has-text("Garage")', { timeout: 15000 })
console.log('hoard created')

// --- Open it, add item ---
await page.click('a:has-text("Garage")')
await page.waitForSelector('h1:has-text("Garage")', { timeout: 15000 })
await page.click('button:has-text("Item")')
await page.fill('#add-name', 'Crimping tool')
await page.fill('#add-tags', 'electronics, wiring')
await page.click('button[type=submit]:has-text("Create")')
await page.waitForSelector('text=Crimping tool', { timeout: 15000 })
console.log('item created')

// --- Search page: "crimp" ---
await page.goto(BASE + '/search')
const input = page.locator('input[type="search"]')
await input.waitFor({ timeout: 15000 })
const focused = await input.evaluate((el) => document.activeElement === el)
console.log('search input autofocused:', focused)
if (!focused) fail('search input not autofocused')

await input.fill('crimp')
const row = page.locator('main a', { hasText: 'Crimping tool' })
await row.waitFor({ timeout: 10000 })
const rowText = await row.innerText()
console.log('result row text:', JSON.stringify(rowText))
if (!rowText.includes('Garage')) fail('result row missing path "Garage"')
if (!rowText.includes('electronics')) fail('result row missing tag badge')
await page.screenshot({ path: SHOT_DIR + 'search-page-crimp.png' })

// --- Typo fuzzy match: "wirng" ---
await input.fill('wirng')
await page
  .locator('main a', { hasText: 'Crimping tool' })
  .waitFor({ timeout: 10000 })
console.log('fuzzy typo "wirng" matched Crimping tool')

// --- Result click navigates ---
await page.locator('main a', { hasText: 'Crimping tool' }).click()
await page.waitForURL(/\/i\//, { timeout: 10000 })
console.log('clicking result navigated to', page.url())

// --- Cmd+K dialog ---
await page.goto(BASE + '/')
await page.waitForSelector('text=Garage', { timeout: 15000 })
await page.keyboard.press('Meta+KeyK')
const dialog = page.locator('[data-slot="dialog-content"]')
await dialog.waitFor({ timeout: 10000 })
console.log('cmd+k dialog opened')

const dlgInput = dialog.locator('input')
const dlgFocused = await dlgInput.evaluate(
  (el) => document.activeElement === el,
)
console.log('dialog input autofocused:', dlgFocused)
await dlgInput.fill('wire squezer')
// keywords are AI-generated (none here) but name/tag fuzz should still work
await dlgInput.fill('crimp')
const dlgRow = dialog.locator('button', { hasText: 'Crimping tool' })
await dlgRow.waitFor({ timeout: 10000 })
const dlgRowText = await dlgRow.innerText()
console.log('dialog row text:', JSON.stringify(dlgRowText))
if (!dlgRowText.includes('Garage')) fail('dialog row missing path')
await page.waitForTimeout(400) // let the open animation settle
await page.screenshot({ path: SHOT_DIR + 'search-command-dialog.png' })

// --- Keyboard nav: Enter navigates and closes ---
await page.keyboard.press('Enter')
await page.waitForURL(/\/i\//, { timeout: 10000 })
const dialogGone = await dialog
  .waitFor({ state: 'detached', timeout: 5000 })
  .then(() => true)
  .catch(() => false)
console.log('enter navigated to', page.url(), '| dialog closed:', dialogGone)
if (!dialogGone) fail('dialog did not close on Enter')

// --- Cmd+K toggles closed too ---
await page.keyboard.press('Meta+KeyK')
await dialog.waitFor({ timeout: 5000 })
await page.keyboard.press('Escape')
await dialog.waitFor({ state: 'detached', timeout: 5000 })
console.log('escape closes dialog')

// --- Empty states ---
await page.goto(BASE + '/search')
await page.waitForSelector('text=Search your whole hoard', { timeout: 10000 })
console.log('empty-query hint shown')
await page.fill('input[type="search"]', 'zzqx-nonexistent')
await page.waitForSelector('text=No matches', { timeout: 10000 })
console.log('no-matches state shown')

await browser.close()
console.log(process.exitCode ? 'DONE WITH FAILURES' : 'ALL CHECKS PASSED')
