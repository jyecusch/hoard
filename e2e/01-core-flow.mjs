import { chromium } from 'playwright'

const BASE = process.env.HOARD_URL ?? 'http://localhost:4300'
const email = `smoke-${Date.now()}@example.com`

const browser = await chromium.launch()
const page = await browser.newPage()
const errors = []
page.on('console', (msg) => {
  if (msg.type() === 'error') errors.push(msg.text().slice(0, 300))
})
page.on('pageerror', (err) => errors.push('PAGEERROR: ' + String(err).slice(0, 300)))

try {
  // Sign up
  await page.goto(BASE + '/signup', { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('#name', { timeout: 30000 }); await page.fill('#name', 'Smoke Tester')
  await page.fill('#email', email)
  await page.fill('#password', 'password1234')
  await page.click('button[type=submit]')
  await page.waitForURL(BASE + '/', { timeout: 15000 })
  console.log('STEP signup: OK')

  // Dashboard empty state
  await page.waitForSelector('text=Create your first hoard', { timeout: 20000 })
  console.log('STEP dashboard-empty: OK')

  // Create hoard
  await page.click('button:has-text("Create your first hoard")')
  await page.fill('#add-name', 'Garage')
  await page.fill('#add-description', 'Everything in the garage')
  await page.fill('#add-tags', 'tools, storage')
  await page.click('button[type=submit]:has-text("Create")')
  await page.waitForSelector('a:has-text("Garage")', { timeout: 15000 })
  console.log('STEP create-hoard: OK')

  // Open it, add a container and an item
  await page.click('a:has-text("Garage")')
  await page.waitForSelector('h1:has-text("Garage")', { timeout: 10000 })
  await page.click('button:has-text("Container")')
  await page.fill('#add-name', 'Blue tub')
  await page.click('button[type=submit]:has-text("Create")')
  await page.waitForSelector('a[href*="/i/"]:has-text("Blue tub")', { timeout: 10000 })
  console.log('STEP add-container: OK')

  await page.click('a:has-text("Blue tub")')
  await page.waitForSelector('h1:has-text("Blue tub")', { timeout: 10000 })
  await page.click('button:has-text("Item")')
  await page.fill('#add-name', 'Crimping tool')
  await page.click('button[type=submit]:has-text("Create")')
  await page.waitForSelector('a[href*="/i/"]:has-text("Crimping tool")', { timeout: 10000 })
  console.log('STEP add-item: OK')

  // Breadcrumbs
  await page.click('a:has-text("Crimping tool")')
  await page.waitForSelector('nav >> text=Garage', { timeout: 10000 })
  console.log('STEP breadcrumbs: OK')

  // Reload — data must persist (server sync + local storage)
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.waitForSelector('h1:has-text("Crimping tool")', { timeout: 20000 })
  console.log('STEP persistence: OK')

  await page.screenshot({ path: process.env.SHOT || '/tmp/hoard-smoke.png', fullPage: true })
  console.log('SMOKE PASS')
} catch (err) {
  await page.screenshot({ path: '/tmp/hoard-smoke-fail.png', fullPage: true }).catch(() => {})
  console.log('SMOKE FAIL:', String(err).slice(0, 500))
} finally {
  if (errors.length) console.log('CONSOLE ERRORS:\n' + errors.slice(0, 10).join('\n'))
  await browser.close()
}
