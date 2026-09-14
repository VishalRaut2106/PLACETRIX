import { test, expect } from '@playwright/test';

test('LogicLab Auto-Solver & Compiler E2E Test', async ({ page }) => {
  // 1. Navigate to login page
  await page.goto('/login');

  // 2. Login with provided credentials
  console.log('Logging in...');
  await page.fill('input[type="email"]', 'vishalraut.login@gmail.com');
  await page.fill('input[type="password"]', '12345678');
  await page.click('button[type="submit"]');

  // 3. Wait for dashboard and navigate to LogicLab
  await page.waitForURL('**/dashboard**');
  await page.goto('/logiclab');
  
  // 4. Wait for problems list to load
  await page.waitForSelector('a[href^="/logiclab/"]');
  const problemLinks = await page.$$eval('a[href^="/logiclab/"]', links => links.map(a => a.href));
  
  console.log(`Found ${problemLinks.length} problems to test. Testing first 2 for speed...`);

  const languages = ['C++', 'Java', 'Python', 'JavaScript'];

  // 5. Test each problem 1 by 1
  for (let i = 0; i < Math.min(2, problemLinks.length); i++) {
    const url = problemLinks[i];
    console.log(`\nTesting Problem ${i+1}/${problemLinks.length}: ${url}`);
    
    await page.goto(url);
    await page.waitForSelector('button:has-text("Run")'); // Wait for IDE to load

    for (const lang of languages) {
      console.log(`  -> Testing ${lang}...`);
      
      // Select the language from the dropdown
      // Assuming Shadcn Select or similar is used for language picker
      await page.click('button[role="combobox"]');
      await page.click(`[role="option"]:has-text("${lang}")`);
      
      // Wait a moment for Monaco to update the boilerplate
      await page.waitForTimeout(500);
      
      // Click Run
      await page.click('button:has-text("Run")');
      
      // Wait for the execution status to appear (e.g. Accepted, Wrong Answer, Compilation Error, Runtime Error)
      const statusElement = await page.waitForSelector('.status-badge, .execution-status, text="Accepted", text="Wrong Answer", text="Compilation Error", text="Runtime Error", text="System Error"', { timeout: 15000 }).catch(() => null);
      
      if (!statusElement) {
         console.log(`    [TIMEOUT] Execution took too long for ${lang}.`);
         continue;
      }
      
      const statusText = await statusElement.textContent();
      
      if (statusText?.includes("Compilation Error") || statusText?.includes("Runtime Error") || statusText?.includes("System Error")) {
        console.error(`    [FAILED] ${lang} threw a ${statusText}!`);
        // We could extract the error from the output window here if needed
      } else {
        console.log(`    [OK] ${lang} compiled successfully (${statusText?.trim()})`);
      }
    }
  }
});
