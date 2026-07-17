import { chromium } from 'playwright'
const BASE = process.env.HOARD_URL ?? 'http://localhost:4300'
const email = `smoke4-${Date.now()}@example.com`
const browser = await chromium.launch()
const page = await browser.newPage()
try {
  await page.goto(BASE + '/signup', { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('#name', { timeout: 30000 })
  await page.fill('#name', 'Coder')
  await page.fill('#email', email)
  await page.fill('#password', 'password1234')
  await page.click('button[type=submit]')
  await page.waitForURL(BASE + '/', { timeout: 15000 })
  await page.click('button:has-text("Create your first hoard")')
  await page.fill('#add-name', 'Attic')
  await page.click('button[type=submit]:has-text("Create")')
  await page.waitForSelector('a:has-text("Attic")')

  // Visit an unassigned code -> claim page
  await page.goto(BASE + '/c/x7k2mfp9qa', { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('text=New label scanned', { timeout: 15000 })
  console.log('STEP claim-page: OK')

  // Create a container attached to the code, inside Attic
  await page.fill('#claim-name', 'Xmas decorations tub')
  await page.click('button:has-text("Attic")') // picker entry
  await page.click('button:has-text("Create & attach label")')
  await page.waitForSelector('h1:has-text("Xmas decorations tub")', { timeout: 15000 })
  console.log('STEP claim-create: OK')

  // Code badge shows on the page
  await page.waitForSelector('text=x7k2mfp9qa')
  console.log('STEP code-badge: OK')

  // Re-visiting the code now redirects to the container
  await page.goto(BASE + '/c/x7k2mfp9qa', { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('h1:has-text("Xmas decorations tub")', { timeout: 15000 })
  console.log('STEP code-resolve: OK')

  // Manual code entry on /scan
  await page.goto(BASE + '/scan', { waitUntil: 'domcontentloaded' })
  await page.fill('input[placeholder*="type the code"]', 'x7k2mfp9qa')
  await page.click('button:has-text("Go")')
  await page.waitForSelector('h1:has-text("Xmas decorations tub")', { timeout: 15000 })
  console.log('STEP scan-manual: OK')

  // Detach the code via badge dialog
  await page.click('button:has(.font-mono:has-text("x7k2mfp9qa"))')
  await page.click('button:has-text("Detach")')
  await page.waitForSelector('text=Add label', { timeout: 10000 })
  console.log('STEP detach: OK')
  console.log('SMOKE4 PASS')
} catch (err) {
  await page.screenshot({ path: '/tmp/hoard-smoke4-fail.png' }).catch(() => {})
  console.log('SMOKE4 FAIL:', String(err).slice(0, 400))
} finally {
  await browser.close()
}
