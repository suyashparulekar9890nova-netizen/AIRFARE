import puppeteer from 'puppeteer-core';
import fs from 'node:fs';

const chromePaths = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Users\\Suyas\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe',
];

const executablePath = chromePaths.find(p => fs.existsSync(p));

async function main() {
  const browser = await puppeteer.launch({
    executablePath,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1440,900']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  // 1. Dark Mode Capture (Hero Aesthetic)
  await page.goto('http://localhost:4174', { waitUntil: 'networkidle2' });
  await page.evaluate(() => {
    localStorage.setItem('airindex_active_persona', 'mospi');
    document.documentElement.classList.add('dark');
  });
  await new Promise(r => setTimeout(r, 500));
  await page.screenshot({ path: 'artifacts/nike_style_dark_hero.png', fullPage: false });
  console.log('Nike-style dark hero captured!');

  // 2. Light Mode Capture (High Contrast Gallery)
  await page.evaluate(() => {
    document.documentElement.classList.remove('dark');
  });
  await new Promise(r => setTimeout(r, 500));
  await page.screenshot({ path: 'artifacts/nike_style_light_hero.png', fullPage: false });
  console.log('Nike-style light hero captured!');

  await browser.close();
}

main().catch(console.error);
