import { chromium } from 'playwright'
const BASE = process.env.HOARD_URL ?? 'http://localhost:4300'
const ts = Date.now()
const browser = await chromium.launch()
const page = await (await browser.newContext()).newPage()
const fail = (msg) => {
  throw new Error(msg)
}
try {
  // --- fresh user ---
  await page.goto(BASE + '/signup', { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('#name', { timeout: 30000 })
  await page.fill('#name', 'Capture Tester')
  await page.fill('#email', `capture-${ts}@example.com`)
  await page.fill('#password', 'password1234')
  await page.click('button[type=submit]')
  await page.waitForURL(BASE + '/', { timeout: 15000 })
  console.log('STEP signup: OK')

  // --- create hoard "Garage" ---
  await page.click('button:has-text("Create your first hoard")')
  await page.fill('#add-name', 'Garage')
  await page.click('button[type=submit]:has-text("Create")')
  await page.waitForSelector('a:has-text("Garage")', { timeout: 15000 })
  console.log('STEP create-hoard: OK')

  // --- capture: pick target ---
  await page.goto(BASE + '/capture', { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('h1:has-text("Where are you?")', { timeout: 20000 })
  await page.click('button:has-text("Garage")')
  await page.waitForSelector('[data-testid=capture-count]', { timeout: 10000 })
  const count0 = (await page.textContent('[data-testid=capture-count]')).trim()
  if (!count0.startsWith('0 captured')) fail('count did not start at 0: ' + count0)
  console.log('STEP pick-target: OK')

  // --- add photo via file input ---
  await page.setInputFiles('input[type=file]', new URL('./test-photo.png', import.meta.url).pathname)
  await page.waitForSelector('img[src^="blob:"]', { timeout: 10000 })
  console.log('STEP photo: OK')

  // --- AI hints hidden (server returns 503, no key configured) ---
  await page.waitForTimeout(2500)
  const suggestionVisible = await page.isVisible('[data-testid=ai-suggestion]')
  const identifyingVisible = await page.isVisible('text=Identifying')
  if (suggestionVisible || identifyingVisible)
    fail(`AI hints visible despite 503 (suggestion=${suggestionVisible} loading=${identifyingVisible})`)
  console.log('STEP ai-hidden-on-503: OK')

  // --- name + save ---
  await page.fill('#capture-name', 'Socket set')
  await page.screenshot({ path: 'capture-filled.png', fullPage: true })
  await page.click('button[type=submit]:has-text("Save & next")')
  await page.waitForSelector('[data-testid=capture-count]:has-text("1 captured")', {
    timeout: 10000,
  })
  const nameAfter = await page.inputValue('#capture-name')
  if (nameAfter !== '') fail('form did not reset after save')
  const undoVisible = await page.isVisible('button:has-text("Undo")')
  if (!undoVisible) fail('undo affordance missing after save')
  console.log('STEP save-and-count: OK (undo visible)')
  await page.screenshot({ path: 'capture-after-save.png', fullPage: true })

  // --- verify item landed in Garage ---
  await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' })
  await page.click('a:has-text("Garage")')
  await page.waitForSelector('h1:has-text("Garage")', { timeout: 15000 })
  await page.waitForSelector('a:has-text("Socket set")', { timeout: 15000 })
  console.log('STEP item-in-garage: OK')

  // --- capture remembers the target (localStorage) ---
  await page.goto(BASE + '/capture', { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('[data-testid=capture-count]', { timeout: 15000 })
  const chip = await page.textContent('main button[title="Change target container"]')
  if (!chip.includes('Garage')) fail('target not remembered: ' + chip)
  console.log('STEP target-remembered: OK')

  console.log('CAPTURE-VERIFY PASS')
} catch (err) {
  await page.screenshot({ path: 'capture-fail.png', fullPage: true }).catch(() => {})
  console.log('CAPTURE-VERIFY FAIL:', String(err).slice(0, 500))
  process.exitCode = 1
} finally {
  await browser.close()
}
