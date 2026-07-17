import { chromium } from 'playwright'
const BASE = process.env.HOARD_URL ?? 'http://localhost:4300'
const email = `smoke2-${Date.now()}@example.com`
const browser = await chromium.launch()
const page = await browser.newPage()
try {
  await page.goto(BASE + '/signup', { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('#name', { timeout: 30000 })
  await page.fill('#name', 'Mover')
  await page.fill('#email', email)
  await page.fill('#password', 'password1234')
  await page.click('button[type=submit]')
  await page.waitForURL(BASE + '/', { timeout: 15000 })
  await page.waitForSelector('button:has-text("Create your first hoard")', { timeout: 20000 })
  await page.click('button:has-text("Create your first hoard")')
  await page.fill('#add-name', 'Garage')
  await page.click('button[type=submit]:has-text("Create")')
  await page.waitForSelector('a:has-text("Garage")', { timeout: 10000 })
  // second hoard
  await page.click('button:has-text("New hoard")')
  await page.fill('#add-name', 'Office')
  await page.click('button[type=submit]:has-text("Create")')
  await page.waitForSelector('a:has-text("Office")', { timeout: 10000 })
  // item inside Garage
  await page.click('a:has-text("Garage")')
  await page.waitForSelector('h1:has-text("Garage")')
  await page.click('button:has-text("Item")')
  await page.fill('#add-name', 'Multimeter')
  await page.click('button[type=submit]:has-text("Create")')
  await page.click('a:has-text("Multimeter")')
  await page.waitForSelector('h1:has-text("Multimeter")')
  console.log('STEP setup: OK')
  // move Multimeter to Office
  await page.click('main button:has([class*=lucide-ellipsis])')
  await page.click('[role=menuitem]:has-text("Move")')
  await page.waitForSelector('text=Choose where it should live')
  await page.click('button:has-text("Office")')
  await page.click(`[role=dialog] button:text-is("Move")`)
  await page.waitForSelector('nav >> text=Office', { timeout: 10000 })
  console.log('STEP move: OK')
  // edit details
  await page.click('main button:has([class*=lucide-ellipsis])')
  await page.click('[role=menuitem]:has-text("Edit details")')
  await page.fill('#edit-name', 'Fluke Multimeter')
  await page.click('button[type=submit]:has-text("Save")')
  await page.waitForSelector('h1:has-text("Fluke Multimeter")', { timeout: 10000 })
  console.log('STEP edit: OK')
  // delete it
  await page.click('main button:has([class*=lucide-ellipsis])')
  await page.click('[role=menuitem]:has-text("Delete")')
  await page.waitForSelector('text=This can’t be undone')
  await page.click(`[role=dialog] button:text-is("Delete")`)
  await page.waitForSelector('h1:has-text("Office")', { timeout: 10000 })
  console.log('STEP delete: OK')
  console.log('SMOKE2 PASS')
} catch (err) {
  await page.screenshot({ path: '/tmp/hoard-smoke2-fail.png' }).catch(() => {})
  console.log('SMOKE2 FAIL:', String(err).slice(0, 400))
} finally {
  await browser.close()
}
