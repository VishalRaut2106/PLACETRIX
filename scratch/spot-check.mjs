/**
 * Spot-check: submit KNOWN CORRECT solutions to 5 problems
 * and verify they get "Accepted". Also submit a WRONG solution
 * and verify "Wrong Answer".
 */
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const JUDGE0 = (process.env.NEXT_PUBLIC_JUDGE0_ENDPOINT || process.env.JUDGE0_ENDPOINT).replace(/\/$/, '');

const TESTS = [
  // #24 Move Zeroes — void return C++ (correct solution)
  { num: 24, lang: "54", langName: "C++", expect: "Accepted", code: `class Solution {
public:
    void moveZeroes(vector<int>& nums) {
        int pos = 0;
        for (int n : nums) if (n != 0) nums[pos++] = n;
        while (pos < nums.size()) nums[pos++] = 0;
    }
};` },
  // #38 Word Search — char[][] Java (correct solution)
  { num: 38, lang: "62", langName: "Java", expect: "Accepted", code: `class Solution {
    public boolean exist(char[][] board, String word) {
        for (int i = 0; i < board.length; i++)
            for (int j = 0; j < board[0].length; j++)
                if (dfs(board, word, i, j, 0)) return true;
        return false;
    }
    private boolean dfs(char[][] board, String word, int i, int j, int k) {
        if (k == word.length()) return true;
        if (i < 0 || i >= board.length || j < 0 || j >= board[0].length || board[i][j] != word.charAt(k)) return false;
        char tmp = board[i][j]; board[i][j] = '#';
        boolean found = dfs(board, word, i+1, j, k+1) || dfs(board, word, i-1, j, k+1) || dfs(board, word, i, j+1, k+1) || dfs(board, word, i, j-1, k+1);
        board[i][j] = tmp;
        return found;
    }
}` },
  // #28 Two Sum — basic (correct)
  { num: 28, lang: "71", langName: "Python", expect: "Accepted", code: `class Solution:
    def twoSum(self, nums: List[int], target: int) -> List[int]:
        seen = {}
        for i, n in enumerate(nums):
            if target - n in seen:
                return [seen[target - n], i]
            seen[n] = i
        return []` },
  // #28 Two Sum — WRONG solution (should get Wrong Answer)
  { num: 28, lang: "71", langName: "Python (WRONG)", expect: "Wrong Answer", code: `class Solution:
    def twoSum(self, nums: List[int], target: int) -> List[int]:
        return [0, 1]  # Always wrong` },
  // #69 Pascal's Triangle — List<List<Integer>> Java
  { num: 69, lang: "62", langName: "Java", expect: "Accepted", code: `class Solution {
    public List<List<Integer>> generate(int numRows) {
        List<List<Integer>> triangle = new ArrayList<>();
        for (int i = 0; i < numRows; i++) {
            List<Integer> row = new ArrayList<>();
            for (int j = 0; j <= i; j++) {
                if (j == 0 || j == i) row.add(1);
                else row.add(triangle.get(i-1).get(j-1) + triangle.get(i-1).get(j));
            }
            triangle.add(row);
        }
        return triangle;
    }
}` },
  // #34 Group Anagrams — string[][] C++ (correct)
  { num: 34, lang: "54", langName: "C++", expect: "Accepted", code: `class Solution {
public:
    vector<vector<string>> groupAnagrams(vector<string>& strs) {
        unordered_map<string, vector<string>> mp;
        for (auto& s : strs) {
            string key = s; sort(key.begin(), key.end());
            mp[key].push_back(s);
        }
        vector<vector<string>> res;
        for (auto& [k, v] : mp) res.push_back(v);
        return res;
    }
};` },
];

async function submit(source, langId) {
  const res = await fetch(`${JUDGE0}/submissions?base64_encoded=true`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      source_code: Buffer.from(source).toString("base64"),
      language_id: parseInt(langId),
      stdin: Buffer.from("1\n0\n").toString("base64"),
      base64_encoded: true,
      cpu_time_limit: 5,
    })
  });
  return (await res.json()).token;
}

async function poll(token) {
  for (let i = 0; i < 12; i++) {
    await new Promise(r => setTimeout(r, 1000));
    const res = await fetch(`${JUDGE0}/submissions/${token}?base64_encoded=true`);
    const d = await res.json();
    if (d.status?.id >= 3) return d;
  }
  return null;
}

async function run() {
  // Fetch driver codes
  const nums = [...new Set(TESTS.map(t => t.num))];
  const { data: problems } = await supabase.from('logiclab_problems')
    .select('number, driver_codes').in('number', nums);
  const driverMap = Object.fromEntries(problems.map(p => [p.number, typeof p.driver_codes === 'string' ? JSON.parse(p.driver_codes) : p.driver_codes]));

  console.log("🧪 Spot-checking correct + wrong solutions\n");

  for (const t of TESTS) {
    const drivers = driverMap[t.num];
    if (!drivers?.[t.lang]) { console.log(`⚠️  #${t.num} [${t.langName}]: no driver`); continue; }

    // Build final source like the backend does
    const driver = drivers[t.lang];
    let finalSrc;
    if (t.lang === "62") {
      // Java: merge imports
      const dLines = driver.split("\n"); const sLines = t.code.split("\n");
      const dImports = dLines.filter(l => l.trim().startsWith("import "));
      const sImports = sLines.filter(l => l.trim().startsWith("import "));
      const rest = sLines.filter(l => !l.trim().startsWith("import ")).join("\n");
      finalSrc = `import java.util.*;\nimport java.io.*;\n${dImports.join("\n")}\n${sImports.join("\n")}\n\n${rest}\n\n${dLines.filter(l => !l.trim().startsWith("import ")).join("\n")}`;
    } else if (t.lang === "71") {
      finalSrc = `from __future__ import annotations\nimport sys,json,math,collections\nfrom typing import *\n${t.code}\n\n${driver}`;
    } else {
      finalSrc = `${t.code}\n\n${driver}`;
    }

    try {
      const token = await submit(finalSrc, t.lang);
      await new Promise(r => setTimeout(r, 1500));
      const result = await poll(token);
      const status = result?.status?.description || "Timeout";
      const pass = status.toLowerCase().includes(t.expect.toLowerCase().split(" ")[0].toLowerCase());
      console.log(`${pass ? "✅" : "❌"} #${t.num} [${t.langName}]: ${status} (expected: ${t.expect})`);
      if (!pass && result?.compile_output) {
        const ce = Buffer.from(result.compile_output, 'base64').toString();
        console.log(`   Compile error: ${ce.split('\n')[0]}`);
      }
    } catch (e) {
      console.log(`⚠️  #${t.num} [${t.langName}]: ${e.message}`);
    }
  }
}

run().catch(console.error);
