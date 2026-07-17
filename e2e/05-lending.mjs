import { chromium } from 'playwright'
const BASE = process.env.HOARD_URL ?? 'http://localhost:4300'
const email = `smoke5-${Date.now()}@example.com`
const browser = await chromium.launch()
const page = await browser.newPage()
try {
  await page.goto(BASE + '/signup', { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('#name', { timeout: 30000 })
  await page.fill('#name', 'Lender')
  await page.fill('#email', email)
  await page.fill('#password', 'password1234')
  await page.click('button[type=submit]')
  await page.waitForURL(BASE + '/', { timeout: 15000 })
  await page.click('button:has-text("Create your first hoard")')
  await page.fill('#add-name', 'Tools')
  await page.click('button[type=submit]:has-text("Create")')
  await page.click('a:has-text("Tools")')
  await page.waitForSelector('h1:has-text("Tools")')
  await page.click('button:has-text("Item")')
  await page.fill('#add-name', 'Angle grinder')
  await page.click('button[type=submit]:has-text("Create")')
  await page.click('a:has-text("Angle grinder")')
  await page.waitForSelector('h1:has-text("Angle grinder")')
  // lend it
  await page.click('main button:has([class*=lucide-ellipsis])')
  await page.click('[role=menuitem]:has-text("Lend")')
  await page.fill('#lend-borrower', 'Sarah')
  await page.fill('#lend-note', 'deck project')
  await page.click('button:has-text("Lend it")')
  await page.waitForSelector('text=Lent to', { timeout: 10000 })
  console.log('STEP lend: OK')
  // dashboard shows lent out
  await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('h2:has-text("Lent out")', { timeout: 15000 })
  await page.waitForSelector('text=Sarah')
  console.log('STEP dashboard-lent: OK')
  // return it
  await page.click('button:has-text("Returned")')
  await page.waitForSelector('h2:has-text("Lent out")', { state: 'detached', timeout: 10000 })
  console.log('STEP return: OK')
  console.log('SMOKE5 PASS')
} catch (err) {
  await page.screenshot({ path: '/tmp/hoard-smoke5-fail.png' }).catch(() => {})
  console.log('SMOKE5 FAIL:', String(err).slice(0, 400))
} finally {
  await browser.close()
}
