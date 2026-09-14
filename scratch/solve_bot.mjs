import { chromium } from 'playwright';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const SOLUTIONS = {
  1: {
    // Missing Number
    '54': `class Solution {
public:
    int missingNumber(vector<int>& nums) {
        int n = nums.size();
        int expected = n * (n + 1) / 2;
        int actual = 0;
        for (int x : nums) actual += x;
        return expected - actual;
    }
};`,
    '62': `class Solution {
    public int missingNumber(int[] nums) {
        int n = nums.length;
        int expected = n * (n + 1) / 2;
        int actual = 0;
        for (int x : nums) actual += x;
        return expected - actual;
    }
}`,
    '93': `var missingNumber = function(nums) {
    const n = nums.length;
    let expected = n * (n + 1) / 2;
    let actual = nums.reduce((a, b) => a + b, 0);
    return expected - actual;
};`,
    '71': `class Solution:
    def missingNumber(self, nums: List[int]) -> int:
        return sum(range(len(nums) + 1)) - sum(nums)`
  },
  2: {
    // Maximum Product of Three Numbers
    '54': `class Solution {
public:
    int maximumProduct(vector<int>& nums) {
        sort(nums.begin(), nums.end());
        int n = nums.size();
        return max(nums[0]*nums[1]*nums[n-1], nums[n-3]*nums[n-2]*nums[n-1]);
    }
};`,
    '62': `class Solution {
    public int maximumProduct(int[] nums) {
        Arrays.sort(nums);
        int n = nums.length;
        return Math.max(nums[0]*nums[1]*nums[n-1], nums[n-3]*nums[n-2]*nums[n-1]);
    }
}`,
    '93': `var maximumProduct = function(nums) {
    nums.sort((a,b) => a - b);
    let n = nums.length;
    return Math.max(nums[0]*nums[1]*nums[n-1], nums[n-3]*nums[n-2]*nums[n-1]);
};`,
    '71': `class Solution:
    def maximumProduct(self, nums: List[int]) -> int:
        nums.sort()
        return max(nums[0]*nums[1]*nums[-1], nums[-3]*nums[-2]*nums[-1])`
  },
  3: {
    // Longest Consecutive Sequence
    '54': `class Solution {
public:
    int longestConsecutive(vector<int>& nums) {
        unordered_set<int> s(nums.begin(), nums.end());
        int maxLen = 0;
        for (int x : s) {
            if (!s.count(x - 1)) {
                int curr = x;
                int len = 1;
                while (s.count(curr + 1)) {
                    curr++;
                    len++;
                }
                maxLen = max(maxLen, len);
            }
        }
        return maxLen;
    }
};`,
    '62': `class Solution {
    public int longestConsecutive(int[] nums) {
        Set<Integer> set = new HashSet<>();
        for (int x : nums) set.add(x);
        int maxLen = 0;
        for (int x : set) {
            if (!set.contains(x - 1)) {
                int curr = x;
                int len = 1;
                while (set.contains(curr + 1)) {
                    curr++;
                    len++;
                }
                maxLen = Math.max(maxLen, len);
            }
        }
        return maxLen;
    }
}`,
    '93': `var longestConsecutive = function(nums) {
    const set = new Set(nums);
    let maxLen = 0;
    for (let x of set) {
        if (!set.has(x - 1)) {
            let curr = x;
            let len = 1;
            while (set.has(curr + 1)) {
                curr++;
                len++;
            }
            maxLen = Math.max(maxLen, len);
        }
    }
    return maxLen;
};`,
    '71': `class Solution:
    def longestConsecutive(self, nums: List[int]) -> int:
        s = set(nums)
        max_len = 0
        for x in s:
            if x - 1 not in s:
                curr = x
                length = 1
                while curr + 1 in s:
                    curr += 1
                    length += 1
                max_len = max(max_len, length)
        return max_len`
  }
};

const LANG_MAP = {
  '54': 'C++',
  '62': 'Java',
  '93': 'JavaScript',
  '71': 'Python'
};

async function run() {
  console.log('🚀 Starting LogicLab Auto-Solver...');
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  console.log('🔐 Logging in...');
  await page.goto('http://localhost:3000/auth/login');
  await page.fill('input[type="email"]', 'vishalraut.login@gmail.com');
  await page.fill('input[type="password"]', '12345678');
  await page.click('button[type="submit"]');
  await page.waitForURL('http://localhost:3000/home');
  console.log('✅ Logged in successfully!');

  const {data: problems} = await sb.from('logiclab_problems').select('id, number, title').in('number', [1, 2, 3]).order('number');

  for (const p of problems) {
    console.log(`\n🎯 Solving Problem #${p.number}: ${p.title}`);
    await page.goto(`http://localhost:3000/logiclab/problems/${p.id}`);
    await page.waitForSelector('.monaco-editor', { state: 'attached' });
    await page.waitForTimeout(2000); // give it a sec to mount fully

    const solutions = SOLUTIONS[p.number];
    if (!solutions) continue;

    let currentLanguageText = "JavaScript";

    for (const [langId, code] of Object.entries(solutions)) {
      const langName = LANG_MAP[langId];
      console.log(`  👨‍💻 Submitting ${langName}...`);

      // Click the language dropdown using direct DOM click to bypass Playwright visibility checks
      await page.evaluate((currentLang) => {
        const btns = Array.from(document.querySelectorAll('button[role="combobox"]'));
        const regex = new RegExp(`^${currentLang}$|C\\+\\+|Java|Python`, 'i');
        const btn = btns.find(b => regex.test(b.textContent));
        if (btn) btn.click();
      }, currentLanguageText);
      
      await page.waitForTimeout(500);
      
      // Click the option using direct DOM click
      await page.evaluate((langToSelect) => {
        const options = Array.from(document.querySelectorAll('div[role="option"]'));
        const opt = options.find(o => o.textContent.includes(langToSelect));
        if (opt) opt.click();
      }, langName);
      await page.waitForTimeout(500);
      currentLanguageText = langName;

      // Paste code using Monaco API for instant and robust insertion
      await page.evaluate((c) => {
        if (window.monaco) {
          window.monaco.editor.getModels()[0].setValue(c);
        } else {
          // Fallback if monaco is not globally exposed
          const el = document.querySelector('.monaco-editor');
          if (el) {
            // Attempt to dispatch a paste event
            const dt = new DataTransfer();
            dt.setData('text/plain', c);
            const evt = new ClipboardEvent('paste', { clipboardData: dt, bubbles: true });
            el.dispatchEvent(evt);
          }
        }
      }, code);

      await page.waitForTimeout(500);

      // Submit using direct DOM click
      await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const submitBtn = btns.find(b => b.textContent.trim() === 'Submit');
        if (submitBtn) submitBtn.click();
      });

      // Wait for result
      try {
        const resultElement = await page.waitForSelector('text=/Accepted|Wrong Answer|Compilation Error|Runtime Error|Time Limit Exceeded/', { timeout: 15000 });
        const resultText = await resultElement.textContent();
        console.log(`    => Result: ${resultText}`);
      } catch (e) {
        console.log(`    => Result: Timeout waiting for result`);
      }
    }
  }

  await browser.close();
  console.log('\n✅ Done with batch!');
}

run().catch(console.error);
