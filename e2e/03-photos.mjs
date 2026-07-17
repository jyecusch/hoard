import { chromium } from 'playwright'
const BASE = process.env.HOARD_URL ?? 'http://localhost:4300'
const email = `smoke3-${Date.now()}@example.com`
const browser = await chromium.launch()
const page = await browser.newPage()
try {
  await page.goto(BASE + '/signup', { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('#name', { timeout: 30000 })
  await page.fill('#name', 'Photo Tester')
  await page.fill('#email', email)
  await page.fill('#password', 'password1234')
  await page.click('button[type=submit]')
  await page.waitForURL(BASE + '/', { timeout: 15000 })
  await page.click('button:has-text("Create your first hoard")')
  await page.fill('#add-name', 'Shed')
  await page.click('button[type=submit]:has-text("Create")')
  await page.click('a:has-text("Shed")')
  await page.waitForSelector('h1:has-text("Shed")')
  // upload photo
  await page.setInputFiles('input[type=file]', new URL('./test-photo.png', import.meta.url).pathname)
  await page.waitForSelector('section img', { timeout: 20000 })
  console.log('STEP upload: OK')
  // open viewer
  await page.click('section button:has(img)')
  await page.waitForSelector('[role=dialog] img', { timeout: 10000 })
  console.log('STEP viewer: OK')
  // reload persistence (blob roundtrip through jazz)
  await page.keyboard.press('Escape')
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.waitForSelector('section img', { timeout: 20000 })
  console.log('STEP blob-persist: OK')
  // delete via viewer
  await page.click('section button:has(img)')
  await page.waitForSelector('[role=dialog] img')
  await page.click('[role=dialog] button:has([class*=lucide-trash])')
  await page.waitForSelector('[role=dialog] img', { state: 'detached', timeout: 10000 })
  await page.waitForSelector('section img', { state: 'detached', timeout: 10000 })
  console.log('STEP delete: OK')
  console.log('SMOKE3 PASS')
} catch (err) {
  await page.screenshot({ path: '/tmp/hoard-smoke3-fail.png' }).catch(() => {})
  console.log('SMOKE3 FAIL:', String(err).slice(0, 400))
} finally {
  await browser.close()
}
