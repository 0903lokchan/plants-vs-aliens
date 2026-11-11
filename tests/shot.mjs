import { chromium } from 'playwright';
const url = process.argv[2] || 'http://localhost:4173/';
const out = process.argv[3] || 'screenshot.png';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1040, height: 640 } });
const errors = [];
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', e => errors.push(String(e)));
await page.goto(url, { waitUntil: 'networkidle' });
await page.waitForTimeout(800);
await page.screenshot({ path: 'title.png' });
// real click on Play
await page.mouse.click(520, 433);
await page.waitForTimeout(300);
const st = await page.evaluate(() => window.__pva.state);
await page.evaluate(() => {
  const g = window.__pva;
  const P = [['glowpetal',0,0],['glowpetal',1,0],['glowpetal',2,0],['glowpetal',3,0],['glowpetal',4,0],
    ['seedslinger',0,1],['seedslinger',1,1],['frostfern',2,1],['seedslinger',3,1],['seedslinger',4,1],
    ['seedslinger',0,2],['frostfern',1,2],['seedslinger',3,2],['stonegourd',1,4],['stonegourd',3,4],['stonegourd',2,5],['boomberry',4,6]];
  for (const [k,r,c] of P) g.plant(k,r,c);
  g.spawn('grunt',0,700); g.spawn('domehead',1,640); g.spawn('zoomer',2,860); g.spawn('grunt',3,560); g.spawn('bloop',4,980);
  g.spawn('domehead',2,760); g.spawn('grunt',1,900);
  g.setTime(60); g.setWave(6);
  g.step(2.2);
});
// collect: real click on a card to test seed bar interaction
await page.waitForTimeout(400);
await page.screenshot({ path: out });
// playtest: run the full game simulated quickly
const res = await page.evaluate(() => { const g = window.__pva; for (let i=0;i<400 && (g.state==='playing');i++) g.step(1); return g.info; });
await page.waitForTimeout(300);
await page.screenshot({ path: 'end.png' });
console.log(JSON.stringify({ startState: st, end: res, errors }));
await browser.close();
