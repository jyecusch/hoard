import { chromium } from 'playwright'
const BASE = process.env.HOARD_URL ?? 'http://localhost:4300'
const ts = Date.now()
const browser = await chromium.launch()

// --- User A: owner ---
const ctxA = await browser.newContext()
const a = await ctxA.newPage()
try {
  await a.goto(BASE + '/signup', { waitUntil: 'domcontentloaded' })
  await a.waitForSelector('#name', { timeout: 30000 })
  await a.fill('#name', 'Owner')
  await a.fill('#email', `owner-${ts}@example.com`)
  await a.fill('#password', 'password1234')
  await a.click('button[type=submit]')
  await a.waitForURL(BASE + '/', { timeout: 15000 })
  await a.click('button:has-text("Create your first hoard")')
  await a.fill('#add-name', 'Workshop')
  await a.click('button[type=submit]:has-text("Create")')
  await a.click('a:has-text("Workshop")')
  await a.waitForSelector('h1:has-text("Workshop")')
  await a.click('button:has-text("Container")')
  await a.fill('#add-name', 'Electronics bench')
  await a.click('button[type=submit]:has-text("Create")')
  await a.waitForSelector('a:has-text("Electronics bench")')
  console.log('STEP owner-setup: OK')

  // Create an editor invite on Workshop
  await a.click('main button:has([class*=lucide-ellipsis])')
  await a.click('[role=menuitem]:has-text("Share")')
  await a.click('button:has-text("New edit link")')
  await a.waitForSelector('[role=dialog] span.font-mono')
  const inviteText = await a.textContent('[role=dialog] span.font-mono')
  const inviteCode = inviteText.trim().split('/join/')[1]
  console.log('STEP invite-created: OK', inviteCode.length, 'chars')

  // --- User B: editor via invite ---
  const ctxB = await browser.newContext()
  const b = await ctxB.newPage()
  await b.goto(BASE + `/join/${inviteCode}`, { waitUntil: 'domcontentloaded' })
  // bounces to login with redirect; hop to signup (link preserves redirect)
  await b.waitForSelector('a:has-text("Create one")', { timeout: 30000 })
  await b.click('a:has-text("Create one")')
  await b.waitForSelector('#name', { timeout: 30000 })
  await b.fill('#name', 'Housemate')
  await b.fill('#email', `mate-${ts}@example.com`)
  await b.fill('#password', 'password1234')
  await b.click('button[type=submit]')
  await b.waitForTimeout(4000)
  console.log('B URL after signup:', b.url())
  await b.screenshot({ path: '/tmp/hoard-b-after-signup.png' })
  await b.waitForSelector('text=You’re invited', { timeout: 20000 })
  console.log('STEP join-page: OK (redirect after signup worked)')
  const logsB = []
  b.on('console', (m) => logsB.push(m.type() + ': ' + m.text().slice(0, 300)))
  await b.click('button:has-text("Join")')
  try {
    await b.waitForTimeout(5000)
    if (!(await b.isVisible('h1:has-text("Workshop")'))) {
      console.log('note: not visible live; trying reload')
      await b.reload({ waitUntil: 'domcontentloaded' })
    }
    await b.waitForSelector('h1:has-text("Workshop")', { timeout: 20000 })
  } catch (e) {
    await b.screenshot({ path: '/tmp/hoard-join-fail.png' })
    console.log('JOIN CONSOLE:', logsB.filter(l => !l.startsWith('debug')).slice(-8).join('\n'))
    throw e
  }
  console.log('STEP join-accept: OK')

  // B can see nested contents and add an item (editor)
  await b.click('a:has-text("Electronics bench")')
  await b.waitForSelector('h1:has-text("Electronics bench")')
  await b.click('button:has-text("Item")')
  await b.fill('#add-name', 'Oscilloscope')
  await b.click('button[type=submit]:has-text("Create")')
  await b.waitForSelector('a:has-text("Oscilloscope")', { timeout: 15000 })
  console.log('STEP editor-write: OK')

  // Owner sees B's item (sync) and B in members list
  await a.keyboard.press('Escape')
  await a.click('a:has-text("Electronics bench")')
  await a.waitForSelector('a:has-text("Oscilloscope")', { timeout: 20000 })
  console.log('STEP sync-to-owner: OK')

  // B's dashboard shows shared root
  await b.goto(BASE + '/', { waitUntil: 'domcontentloaded' })
  await b.waitForSelector('h2:has-text("Shared with me")', { timeout: 15000 })
  await b.waitForSelector('a:has-text("Workshop")')
  console.log('STEP shared-with-me: OK')

  // Owner removes B's access; B's dashboard loses Workshop
  await a.goto(BASE + '/', { waitUntil: 'domcontentloaded' })
  await a.click('a:has-text("Workshop")')
  await a.waitForSelector('h1:has-text("Workshop")')
  await a.click('main button:has([class*=lucide-ellipsis])')
  await a.click('[role=menuitem]:has-text("Share")')
  await a.waitForSelector('text=People with access', { timeout: 10000 })
  await a.click('button[title="Remove access"]')
  await b.reload({ waitUntil: 'domcontentloaded' })
  await b.waitForSelector('h2:has-text("Shared with me")', { state: 'detached', timeout: 20000 })
  console.log('STEP revoke-access: OK')

  console.log('SMOKE6 PASS')
} catch (err) {
  await a.screenshot({ path: '/tmp/hoard-smoke6-a.png' }).catch(() => {})
  console.log('SMOKE6 FAIL:', String(err).slice(0, 500))
} finally {
  await browser.close()
}
