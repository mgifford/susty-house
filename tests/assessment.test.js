// tests/assessment.test.js
const { test, expect } = require('@playwright/test');

// Adjust base URL if the app is served from a subdirectory
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000/';

test('Create basic house assessment', async ({ page }) => {
  // Navigate to the app
  await page.goto(BASE_URL);
  await expect(page).toHaveTitle(/Sustainable House Evaluator/);

  // Click the "New Assessment" button (fallback to empty state button)
  const newBtn = page.locator('#btn-new-profile, #btn-new-profile-empty').first();
  await newBtn.click();

  // Wait for the profile form to appear
  await page.waitForSelector('#profile-form', { timeout: 10000 });

  // Fill in the house profile details
  await page.fill('#f-nickname', 'Basic House (3 bedrooms, 9 windows)');
  await page.fill('#f-year', '2020');
  await page.fill('#f-area', '150');
  await page.selectOption('#f-storeys', { label: '2' });
  await page.selectOption('#f-construction', { label: 'Wood frame' });
  await page.selectOption('#f-climate', { label: 'Temperate' });
  await page.fill('#f-occupants', '3');

  // Fill in the owner capacity details
  await page.selectOption('#f-budget', { label: 'Moderate ($1,000–$10,000)' });
  await page.selectOption('#f-time', { label: 'Weekends available (1–2/month)' });
  await page.selectOption('#f-skill', { label: 'Complete novice' });
  await page.selectOption('#f-ambition', { label: 'Meaningful improvements' });

  // Submit the profile
  await page.click('button[type="submit"]');

  // Wait for the assessment view to appear
  await expect(page.locator('#view-assessment')).toBeVisible({ timeout: 15000 });

  // Wait for the windows slider item to load
  await page.waitForSelector('#slider-windows', { timeout: 10000 });

  // Configure "Windows" under Building Envelope category
  await page.evaluate(() => {
    const slider = document.querySelector('#slider-windows');
    slider.value = '3'; // Level 3 = Double pane
    slider.dispatchEvent(new Event('input'));
  });
  await page.fill('#notes-windows', '9 windows in total');

  // Configure "Attic Insulation" under Building Envelope category
  await page.evaluate(() => {
    const slider = document.querySelector('#slider-attic_insulation');
    slider.value = '4'; // Level 4 = Good
    slider.dispatchEvent(new Event('input'));
  });
  await page.fill('#notes-attic_insulation', '3 bedrooms house');

  // Navigate to "Heating & Cooling" category
  await page.click('.cat-nav-btn[data-cat="heating_cooling"]');
  await page.waitForSelector('#slider-air_conditioning', { timeout: 10000 });

  // Configure "Air Conditioning" under Heating & Cooling category
  await page.evaluate(() => {
    const slider = document.querySelector('#slider-air_conditioning');
    slider.value = '3'; // Level 3 = Efficient central AC / Standard central AC
    slider.dispatchEvent(new Event('input'));
  });
  await page.fill('#notes-air_conditioning', 'Standard central AC unit');

  // Go to results view
  await page.click('#btn-view-results');
  await expect(page.locator('#view-results')).toBeVisible({ timeout: 10000 });

  // Verify overall score meter is present
  const scoreText = await page.locator('[role="meter"]').innerText();
  console.log('Final Calculated Score:', scoreText.replace(/\n/g, ' '));
  expect(scoreText).toContain('100'); // denominator /100 should be there

  // Verify export buttons are present and interactive
  const exportYamlBtn = page.locator('#btn-export-yaml');
  await expect(exportYamlBtn).toBeVisible();

  const exportHtmlBtn = page.locator('#btn-export-html');
  await expect(exportHtmlBtn).toBeVisible();
});
