import { chromium } from 'playwright'
const BASE = process.env.HOARD_URL ?? 'http://localhost:4300'
const ts = Date.now()
const browser = await chromium.launch()
const page = await (await browser.newContext()).newPage()
const fail = (msg) => {
  throw new Error(msg)
}
try {
  await page.goto(BASE + '/signup', { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('#name', { timeout: 30000 })
  await page.fill('#name', 'Redo Person')
  await page.fill('#email', `undo-${ts}@example.com`)
  await page.fill('#password', 'password1234')
  await page.click('button[type=submit]')
  await page.waitForURL(BASE + '/', { timeout: 15000 })
  await page.click('button:has-text("Create your first hoard")')
  await page.fill('#add-name', 'Shed')
  await page.click('button[type=submit]:has-text("Create")')
  await page.waitForSelector('a:has-text("Shed")', { timeout: 15000 })

  // capture item with a photo
  await page.goto(BASE + '/capture', { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('h1:has-text("Where are you?")', { timeout: 20000 })
  await page.click('button:has-text("Shed")')
  await page.waitForSelector('[data-testid=capture-count]', { timeout: 10000 })
  await page.setInputFiles('input[type=file]', new URL('./test-photo.png', import.meta.url).pathname)
  await page.waitForSelector('img[src^="blob:"]', { timeout: 10000 })
  await page.fill('#capture-name', 'Angle grinder')
  await page.click('button[type=submit]:has-text("Save & next")')
  await page.waitForSelector('[data-testid=capture-count]:has-text("1 captured")', {
    timeout: 10000,
  })
  await page.waitForSelector('[data-testid=capture-syncing]', {
    state: 'detached',
    timeout: 30000,
  })
  console.log('STEP capture-with-photo: OK (sync settled)')

  // photo landed on the item (background upload)
  await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' })
  await page.click('a:has-text("Shed")')
  await page.waitForSelector('h1:has-text("Shed")', { timeout: 15000 })
  await page.click('a:has-text("Angle grinder")')
  await page.waitForSelector('h1:has-text("Angle grinder")', { timeout: 15000 })
  await page.waitForSelector('h2:has-text("Photos") >> text=(1)', { timeout: 20000 })
  console.log('STEP photo-uploaded: OK')

  // capture a second item, then undo it
  await page.goto(BASE + '/capture', { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('[data-testid=capture-count]', { timeout: 15000 })
  await page.setInputFiles('input[type=file]', new URL('./test-photo.png', import.meta.url).pathname)
  await page.waitForSelector('img[src^="blob:"]', { timeout: 10000 })
  await page.fill('#capture-name', 'Mistake item')
  await page.click('button[type=submit]:has-text("Save & next")')
  await page.waitForSelector('[data-testid=capture-count]:has-text("1 captured")', {
    timeout: 10000,
  })
  await page.click('main button:has-text("Undo")')
  await page.waitForSelector('[data-testid=capture-count]:has-text("0 captured")', {
    timeout: 20000,
  })
  const undoStill = await page.isVisible('main button:has-text("Undo")')
  if (undoStill) fail('undo row still visible after undo')
  console.log('STEP undo: OK')

  // undone item gone from Shed
  await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' })
  await page.click('a:has-text("Shed")')
  await page.waitForSelector('a:has-text("Angle grinder")', { timeout: 15000 })
  await page.waitForTimeout(1500)
  if (await page.isVisible('a:has-text("Mistake item")')) fail('undone item still in Shed')
  console.log('STEP undone-item-gone: OK')

  console.log('CAPTURE-VERIFY2 PASS')
} catch (err) {
  await page.screenshot({ path: 'capture2-fail.png', fullPage: true }).catch(() => {})
  console.log('CAPTURE-VERIFY2 FAIL:', String(err).slice(0, 500))
  process.exitCode = 1
} finally {
  await browser.close()
}
