import { chromium } from 'playwright';

const SOLUTIONS = {
  1: { // Missing Number
    '70': 'class Solution { public: int missingNumber(vector<int>& nums) { int n = nums.size(); int expected = n * (n + 1) / 2; int actual = 0; for (int x : nums) actual += x; return expected - actual; } };',
    '62': 'class Solution { public int missingNumber(int[] nums) { int n = nums.length; int expected = n * (n + 1) / 2; int actual = 0; for (int x : nums) actual += x; return expected - actual; } }',
    '63': 'var missingNumber = function(nums) { const n = nums.length; let expected = n * (n + 1) / 2; let actual = nums.reduce((a, b) => a + b, 0); return expected - actual; };',
    '71': 'class Solution: \n    def missingNumber(self, nums: List[int]) -> int:\n        return sum(range(len(nums) + 1)) - sum(nums)'
  },
  2: { // Maximum Product
    '70': 'class Solution { public: int maximumProduct(vector<int>& nums) { sort(nums.begin(), nums.end()); int n = nums.size(); return max(nums[0]*nums[1]*nums[n-1], nums[n-3]*nums[n-2]*nums[n-1]); } };',
    '62': 'class Solution { public int maximumProduct(int[] nums) { Arrays.sort(nums); int n = nums.length; return Math.max(nums[0]*nums[1]*nums[n-1], nums[n-3]*nums[n-2]*nums[n-1]); } }',
    '63': 'var maximumProduct = function(nums) { nums.sort((a,b) => a - b); let n = nums.length; return Math.max(nums[0]*nums[1]*nums[n-1], nums[n-3]*nums[n-2]*nums[n-1]); };',
    '71': 'class Solution:\n    def maximumProduct(self, nums: List[int]) -> int:\n        nums.sort()\n        return max(nums[0]*nums[1]*nums[-1], nums[-3]*nums[-2]*nums[-1])'
  },
  3: { // Longest Consecutive Sequence
    '70': 'class Solution { public: int longestConsecutive(vector<int>& nums) { unordered_set<int> s(nums.begin(), nums.end()); int maxLen = 0; for (int x : s) { if (!s.count(x - 1)) { int curr = x; int len = 1; while (s.count(curr + 1)) { curr++; len++; } maxLen = max(maxLen, len); } } return maxLen; } };',
    '62': 'class Solution { public int longestConsecutive(int[] nums) { Set<Integer> set = new HashSet<>(); for (int x : nums) set.add(x); int maxLen = 0; for (int x : set) { if (!set.contains(x - 1)) { int curr = x; int len = 1; while (set.contains(curr + 1)) { curr++; len++; } maxLen = Math.max(maxLen, len); } } return maxLen; } }',
    '63': 'var longestConsecutive = function(nums) { const set = new Set(nums); let maxLen = 0; for (let x of set) { if (!set.has(x - 1)) { let curr = x; let len = 1; while (set.has(curr + 1)) { curr++; len++; } maxLen = Math.max(maxLen, len); } } return maxLen; };',
    '71': 'class Solution:\n    def longestConsecutive(self, nums: List[int]) -> int:\n        s = set(nums)\n        max_len = 0\n        for x in s:\n            if x - 1 not in s:\n                curr = x\n                length = 1\n                while curr + 1 in s:\n                    curr += 1\n                    length += 1\n                max_len = max(max_len, length)\n        return max_len'
  }
};

const LANG_MAP = {
  '70': 'C++',
  '62': 'Java',
  '63': 'JavaScript',
  '71': 'Python'
};

const PROBLEMS = [
  { id: 'fb6f3623-ee1e-4290-8b08-bb985926330b', number: 1, title: 'Missing Number' },
  { id: '84ca90da-1052-469c-a209-f675abe08781', number: 2, title: 'Maximum Product' },
  { id: '99c6683e-22f6-4776-a127-2d39d06c39e2', number: 3, title: 'Longest Consecutive' }
];

async function run() {
  console.log("🚀 Starting LogicLab Auto-Solver (Robust Mode)...");
  const browser = await chromium.launch({ headless: false, args: ['--start-maximized'] });
  const context = await browser.newContext({ viewport: null });
  const page = await context.newPage();

  console.log("🔐 Logging in...");
  await page.goto('http://localhost:3000/auth/login');
  await page.fill('input[type="email"]', 'vishalraut.login@gmail.com');
  await page.fill('input[type="password"]', '12345678');
  await page.click('button[type="submit"]');
  await page.waitForURL('http://localhost:3000/home', { timeout: 15000 });
  console.log("✅ Logged in successfully!\n");

  for (const p of PROBLEMS) {
    console.log(`🎯 Solving Problem #${p.number}: ${p.title}`);
    await page.goto(`http://localhost:3000/logiclab/problems/${p.id}`);
    
    // Wait for Monaco editor to attach to DOM
    await page.waitForSelector('.monaco-editor', { state: 'attached', timeout: 30000 });
    await page.waitForTimeout(2000); // UI stabilization

    const solutions = SOLUTIONS[p.number];
    if (!solutions) continue;

    let currentLanguageText = "JavaScript"; // default on load

    for (const [langId, code] of Object.entries(solutions)) {
      const langName = LANG_MAP[langId];
      console.log(`  👨‍💻 Submitting ${langName}...`);

      // 1. Wait for Language Combobox to be attached
      await page.waitForSelector('button[role="combobox"]', { state: 'attached' });
      await page.waitForTimeout(500);

      // 2. Click language dropdown robustly
      await page.evaluate((currentLang) => {
        const btns = Array.from(document.querySelectorAll('button[role="combobox"]'));
        const btn = btns.find(b => b.textContent.trim().includes(currentLang));
        if (btn) btn.click();
      }, currentLanguageText);
      
      // 3. Wait for Option to appear in DOM
      await page.waitForSelector('div[role="option"]', { state: 'attached', timeout: 5000 }).catch(() => {});
      await page.waitForTimeout(500);
      
      // 4. Click option robustly
      await page.evaluate((langToSelect) => {
        const options = Array.from(document.querySelectorAll('div[role="option"]'));
        const opt = options.find(o => o.textContent.includes(langToSelect));
        if (opt) opt.click();
      }, langName);
      
      await page.waitForTimeout(500);
      currentLanguageText = langName;

      // 5. Find visible editor and insert text to trigger React onChange
      const editors = await page.locator('.monaco-editor').all();
      for (const ed of editors) {
        if (await ed.isVisible()) {
          await ed.click({ force: true });
          await page.keyboard.press('Control+A');
          await page.keyboard.press('Delete');
          await page.keyboard.insertText(code);
          break;
        }
      }
      
      await page.waitForTimeout(1000);

      // 6. Click submit robustly using DOM click on the visible button
      await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const submitBtn = btns.find(b => 
          b.textContent.includes('Submit') && 
          !b.textContent.includes('Submits') && 
          b.offsetParent !== null && 
          !b.disabled // Must not be disabled
        );
        if (submitBtn) submitBtn.click();
      });
      
      try {
        const resultElement = await page.waitForSelector('text=/Accepted|Wrong Answer|Compilation Error|Runtime Error|Time Limit Exceeded/', { timeout: 15000 });
        const text = await resultElement.textContent();
        if (text.includes('Accepted')) {
          console.log(`    ✅ Success: ${langName}`);
        } else {
          console.log(`    ❌ Failed: ${langName} - ${text}`);
        }
      } catch (err) {
        console.log(`    ⚠️ Timeout waiting for result for ${langName}`);
      }
      
      await page.waitForTimeout(1000);
    }
  }

  console.log("\n🎉 Finished batch!");
  await browser.close();
}

run().catch(console.error);
