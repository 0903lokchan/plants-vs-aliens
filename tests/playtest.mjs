// Automated bot playtest: plays the whole game with a simple strategy, checking for console errors.
import { chromium } from 'playwright';
const url = process.argv[2] || 'http://localhost:4173/';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1040, height: 640 } });
const errors = [];
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', e => errors.push(String(e)));
await page.goto(url, { waitUntil: 'networkidle' });
await page.mouse.click(520, 433); // Play button
await page.waitForTimeout(300);
// real UI interactions: click a card then a lawn cell, press pause twice
await page.mouse.click(145, 50); await page.mouse.click(174, 170);
await page.keyboard.press('p'); const paused = await page.evaluate(() => window.__pva.state); await page.keyboard.press('p');
const result = await page.evaluate(() => {
  const g = window.__pva; let sec = 0;
  while (g.state === 'playing' && sec < 600) {
    g.collectAll();
    const threat = g.threatRows();
    for (const r of threat) if (!g.has(r, 1)) g.tryPlant('seedslinger', r, 1);
    const big = g.bigThreat(); if (big) g.tryPlant('boomberry', big.r, big.c);
    const plan = [['glowpetal',0],['seedslinger',1],['glowpetal',2],['seedslinger',3],['stonegourd',6],['frostfern',4],['seedslinger',5]];
    outer: for (const [k, c] of plan) for (const r of [2,1,3,0,4]) { if (!g.has(r, c)) { g.tryPlant(k, r, c); break outer; } }
    g.step(0.5); sec += 0.5;
  }
  return { ...g.info, sec };
});
await page.waitForTimeout(500);
await page.screenshot({ path: 'end.png' });
console.log(JSON.stringify({ paused, result, errors }));
await browser.close();
process.exit(errors.length ? 1 : 0);
