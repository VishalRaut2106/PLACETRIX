import { chromium } from 'playwright';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const SOLUTIONS = {
  4: {
    // Find Peak Element
    '54': `class Solution { public: int findPeakElement(vector<int>& nums) { int l=0, r=nums.size()-1; while(l<r){ int mid=l+(r-l)/2; if(nums[mid]>nums[mid+1]) r=mid; else l=mid+1; } return l; } };`,
    '62': `class Solution { public int findPeakElement(int[] nums) { int l=0, r=nums.length-1; while(l<r){ int mid=l+(r-l)/2; if(nums[mid]>nums[mid+1]) r=mid; else l=mid+1; } return l; } }`,
    '93': `var findPeakElement = function(nums) { let l=0, r=nums.length-1; while(l<r){ let mid=(l+r)>>1; if(nums[mid]>nums[mid+1]) r=mid; else l=mid+1; } return l; };`,
    '71': `class Solution:
    def findPeakElement(self, nums: List[int]) -> int:
        l, r = 0, len(nums)-1
        while l < r:
            mid = (l + r) // 2
            if nums[mid] > nums[mid+1]: r = mid
            else: l = mid + 1
        return l`
  },
  5: {
    // Best Time to Buy and Sell Stock
    '54': `class Solution { public: int maxProfit(vector<int>& prices) { int m=0, minP=1e9; for(int p:prices) { minP=min(minP, p); m=max(m, p-minP); } return m; } };`,
    '62': `class Solution { public int maxProfit(int[] prices) { int m=0, minP=Integer.MAX_VALUE; for(int p:prices) { minP=Math.min(minP, p); m=Math.max(m, p-minP); } return m; } }`,
    '93': `var maxProfit = function(prices) { let m=0, minP=Infinity; for(let p of prices) { minP=Math.min(minP, p); m=Math.max(m, p-minP); } return m; };`,
    '71': `class Solution:
    def maxProfit(self, prices: List[int]) -> int:
        m, minP = 0, float('inf')
        for p in prices:
            minP = min(minP, p)
            m = max(m, p - minP)
        return m`
  },
  6: {
    // Contains Duplicate
    '54': `class Solution { public: bool containsDuplicate(vector<int>& nums) { unordered_set<int> s(nums.begin(), nums.end()); return s.size() < nums.size(); } };`,
    '62': `class Solution { public boolean containsDuplicate(int[] nums) { Set<Integer> s = new HashSet<>(); for(int n:nums) if(!s.add(n)) return true; return false; } }`,
    '93': `var containsDuplicate = function(nums) { return new Set(nums).size < nums.length; };`,
    '71': `class Solution:
    def containsDuplicate(self, nums: List[int]) -> bool:
        return len(set(nums)) < len(nums)`
  },
  7: {
    // Find Minimum in Rotated Sorted Array
    '54': `class Solution { public: int findMin(vector<int>& nums) { int l=0, r=nums.size()-1; while(l<r) { int m=l+(r-l)/2; if(nums[m]>nums[r]) l=m+1; else r=m; } return nums[l]; } };`,
    '62': `class Solution { public int findMin(int[] nums) { int l=0, r=nums.length-1; while(l<r) { int m=l+(r-l)/2; if(nums[m]>nums[r]) l=m+1; else r=m; } return nums[l]; } }`,
    '93': `var findMin = function(nums) { let l=0, r=nums.length-1; while(l<r) { let m=(l+r)>>1; if(nums[m]>nums[r]) l=m+1; else r=m; } return nums[l]; };`,
    '71': `class Solution:
    def findMin(self, nums: List[int]) -> int:
        l, r = 0, len(nums)-1
        while l < r:
            m = (l + r) // 2
            if nums[m] > nums[r]: l = m + 1
            else: r = m
        return nums[l]`
  },
  8: {
    // Container With Most Water
    '54': `class Solution { public: int maxArea(vector<int>& h) { int m=0, l=0, r=h.size()-1; while(l<r) { m=max(m, (r-l)*min(h[l], h[r])); if(h[l]<h[r]) l++; else r--; } return m; } };`,
    '62': `class Solution { public int maxArea(int[] h) { int m=0, l=0, r=h.length-1; while(l<r) { m=Math.max(m, (r-l)*Math.min(h[l], h[r])); if(h[l]<h[r]) l++; else r--; } return m; } }`,
    '93': `var maxArea = function(h) { let m=0, l=0, r=h.length-1; while(l<r) { m=Math.max(m, (r-l)*Math.min(h[l], h[r])); if(h[l]<h[r]) l++; else r--; } return m; };`,
    '71': `class Solution:
    def maxArea(self, h: List[int]) -> int:
        m, l, r = 0, 0, len(h)-1
        while l < r:
            m = max(m, (r-l)*min(h[l], h[r]))
            if h[l] < h[r]: l += 1
            else: r -= 1
        return m`
  },
  9: {
    // Trapping Rain Water
    '54': `class Solution { public: int trap(vector<int>& h) { int n=h.size(); if(!n) return 0; int l=0, r=n-1, lm=h[l], rm=h[r], ans=0; while(l<r){ if(lm<rm){ l++; lm=max(lm,h[l]); ans+=lm-h[l]; } else { r--; rm=max(rm,h[r]); ans+=rm-h[r]; } } return ans; } };`,
    '62': `class Solution { public int trap(int[] h) { int n=h.length; if(n==0) return 0; int l=0, r=n-1, lm=h[l], rm=h[r], ans=0; while(l<r){ if(lm<rm){ l++; lm=Math.max(lm,h[l]); ans+=lm-h[l]; } else { r--; rm=Math.max(rm,h[r]); ans+=rm-h[r]; } } return ans; } }`,
    '93': `var trap = function(h) { let n=h.length; if(!n) return 0; let l=0, r=n-1, lm=h[l], rm=h[r], ans=0; while(l<r){ if(lm<rm){ l++; lm=Math.max(lm,h[l]); ans+=lm-h[l]; } else { r--; rm=Math.max(rm,h[r]); ans+=rm-h[r]; } } return ans; };`,
    '71': `class Solution:
    def trap(self, h: List[int]) -> int:
        if not h: return 0
        l, r = 0, len(h)-1
        lm, rm, ans = h[l], h[r], 0
        while l < r:
            if lm < rm:
                l += 1
                lm = max(lm, h[l])
                ans += lm - h[l]
            else:
                r -= 1
                rm = max(rm, h[r])
                ans += rm - h[r]
        return ans`
  },
  10: {
    // Third Maximum Number
    '54': `class Solution { public: int thirdMax(vector<int>& nums) { long m1=-3e10, m2=-3e10, m3=-3e10; for(int n:nums){ if(n==m1 || n==m2 || n==m3) continue; if(n>m1){ m3=m2; m2=m1; m1=n; } else if(n>m2){ m3=m2; m2=n; } else if(n>m3){ m3=n; } } return m3==-3e10 ? m1 : m3; } };`,
    '62': `class Solution { public int thirdMax(int[] nums) { Integer m1=null, m2=null, m3=null; for(Integer n:nums){ if(n.equals(m1) || n.equals(m2) || n.equals(m3)) continue; if(m1==null || n>m1){ m3=m2; m2=m1; m1=n; } else if(m2==null || n>m2){ m3=m2; m2=n; } else if(m3==null || n>m3){ m3=n; } } return m3==null ? m1 : m3; } }`,
    '93': `var thirdMax = function(nums) { let m1=-Infinity, m2=-Infinity, m3=-Infinity; for(let n of nums){ if(n===m1 || n===m2 || n===m3) continue; if(n>m1){ m3=m2; m2=m1; m1=n; } else if(n>m2){ m3=m2; m2=n; } else if(n>m3){ m3=n; } } return m3===-Infinity ? m1 : m3; };`,
    '71': `class Solution:
    def thirdMax(self, nums: List[int]) -> int:
        s = set(nums)
        if len(s) < 3: return max(s)
        s.remove(max(s))
        s.remove(max(s))
        return max(s)`
  }
};

const LANG_MAP = {
  '54': 'C++',
  '62': 'Java',
  '93': 'JavaScript',
  '71': 'Python'
};

async function run() {
  console.log('🚀 Starting LogicLab Auto-Solver (Batch 2: Problems 4-10)...');
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

  const {data: problems} = await sb.from('logiclab_problems').select('id, number, title').in('number', [4,5,6,7,8,9,10]).order('number');

  for (const p of problems) {
    console.log(`\n🎯 Solving Problem #${p.number}: ${p.title}`);
    await page.goto(`http://localhost:3000/logiclab/problems/${p.id}`);
    await page.waitForSelector('.monaco-editor', { state: 'attached' });
    await page.waitForTimeout(2000);

    const solutions = SOLUTIONS[p.number];
    if (!solutions) continue;

    let currentLanguageText = "JavaScript";

    for (const [langId, code] of Object.entries(solutions)) {
      const langName = LANG_MAP[langId];
      console.log(`  👨‍💻 Submitting ${langName}...`);

      // Click language dropdown robustly
      await page.evaluate((currentLang) => {
        const btns = Array.from(document.querySelectorAll('button[role="combobox"]'));
        const regex = new RegExp(`^${currentLang}$|C\\+\\+|Java|Python`, 'i');
        const btn = btns.find(b => regex.test(b.textContent));
        if (btn) btn.click();
      }, currentLanguageText);
      
      await page.waitForTimeout(500);
      
      // Click option robustly
      await page.evaluate((langToSelect) => {
        const options = Array.from(document.querySelectorAll('div[role="option"]'));
        const opt = options.find(o => o.textContent.includes(langToSelect));
        if (opt) opt.click();
      }, langName);
      
      await page.waitForTimeout(500);
      currentLanguageText = langName;

      // Paste code using Monaco API
      await page.evaluate((c) => {
        if (window.monaco) {
          window.monaco.editor.getModels()[0].setValue(c);
        } else {
          const el = document.querySelector('.monaco-editor');
          if (el) {
            const dt = new DataTransfer();
            dt.setData('text/plain', c);
            const evt = new ClipboardEvent('paste', { clipboardData: dt, bubbles: true });
            el.dispatchEvent(evt);
          }
        }
      }, code);
      
      await page.waitForTimeout(500);

      // Click submit robustly
      await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const submitBtn = btns.find(b => b.textContent.includes('Submit'));
        if (submitBtn) submitBtn.click();
      });
      
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
  console.log('\n✅ Done with Batch 2!');
}

run().catch(console.error);
