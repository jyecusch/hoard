import { chromium } from 'playwright'
const BASE = process.env.HOARD_URL ?? 'http://localhost:4300'
const email = `smoke7-${Date.now()}@example.com`
const browser = await chromium.launch()
const page = await browser.newPage()
try {
  await page.goto(BASE + '/signup', { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('#name', { timeout: 30000 })
  await page.fill('#name', 'Fav Tester')
  await page.fill('#email', email)
  await page.fill('#password', 'password1234')
  await page.click('button[type=submit]')
  await page.waitForURL(BASE + '/', { timeout: 15000 })
  await page.click('button:has-text("Create your first hoard")')
  await page.fill('#add-name', 'Loft')
  await page.click('button[type=submit]:has-text("Create")')
  await page.click('a:has-text("Loft")')
  await page.waitForSelector('h1:has-text("Loft")')
  // favorite it
  await page.click('button[aria-label="Add to favorites"]')
  await page.waitForSelector('button[aria-label="Remove from favorites"]', { timeout: 10000 })
  console.log('STEP star: OK')
  // dashboard shows favorites
  await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('h2:has-text("Favorites")', { timeout: 15000 })
  console.log('STEP dashboard-fav: OK')
  // settings theme toggle
  await page.goto(BASE + '/settings', { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('h1:has-text("Settings")', { timeout: 15000 })
  await page.click('button:has-text("Dark")')
  const isDark = await page.evaluate(() => document.documentElement.classList.contains('dark'))
  console.log('STEP theme-dark:', isDark ? 'OK' : 'FAIL')
  await page.reload({ waitUntil: 'domcontentloaded' })
  const stillDark = await page.evaluate(() => document.documentElement.classList.contains('dark'))
  console.log('STEP theme-persist:', stillDark ? 'OK' : 'FAIL')
  await page.screenshot({ path: '/tmp/hoard-dark.png' })
  console.log('SMOKE7 PASS')
} catch (err) {
  await page.screenshot({ path: '/tmp/hoard-smoke7-fail.png' }).catch(() => {})
  console.log('SMOKE7 FAIL:', String(err).slice(0, 300))
} finally {
  await browser.close()
}
