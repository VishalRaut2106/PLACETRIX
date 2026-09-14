import { createClient } from '@supabase/supabase-js';
import { generateTemplatesFromSignature } from '../lib/generator/templateGenerator.js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// All remaining failures with their correct signatures
const FIXES = {
  // Void return + C++ issues (regenerate)
  24:  { name: "moveZeroes",       returnType: "void",     args: [{ name: "nums", type: "int[]" }] },
  34:  { name: "groupAnagrams",    returnType: "string[][]", args: [{ name: "strs", type: "string[]" }] },
  37:  { name: "rotate",           returnType: "void",     args: [{ name: "matrix", type: "int[][]" }] },
  45:  { name: "setZeroes",        returnType: "void",     args: [{ name: "matrix", type: "int[][]" }] },
  49:  { name: "sortColors",       returnType: "void",     args: [{ name: "nums", type: "int[]" }] },
  62:  { name: "rotate",           returnType: "void",     args: [{ name: "nums", type: "int[]" }, { name: "k", type: "int" }] },
  63:  { name: "reverseString",    returnType: "void",     args: [{ name: "s", type: "char[]" }] },
  89:  { name: "nextPermutation",  returnType: "void",     args: [{ name: "nums", type: "int[]" }] },
  91:  { name: "solveSudoku",      returnType: "void",     args: [{ name: "board", type: "char[][]" }] },
  // Missing return statement — old boilerplates
  59:  { name: "wordBreak",        returnType: "boolean",  args: [{ name: "s", type: "string" }, { name: "wordDict", type: "string[]" }] },
  61:  { name: "findKthLargest",   returnType: "int",      args: [{ name: "nums", type: "int[]" }, { name: "k", type: "int" }] },
  64:  { name: "removeDuplicates", returnType: "int",      args: [{ name: "nums", type: "int[]" }] },
  65:  { name: "intersection",     returnType: "int[]",    args: [{ name: "nums1", type: "int[]" }, { name: "nums2", type: "int[]" }] },
  66:  { name: "removeElement",    returnType: "int",      args: [{ name: "nums", type: "int[]" }, { name: "val", type: "int" }] },
  67:  { name: "canConstruct",     returnType: "boolean",  args: [{ name: "ransomNote", type: "string" }, { name: "magazine", type: "string" }] },
  68:  { name: "mySqrt",           returnType: "int",      args: [{ name: "x", type: "int" }] },
  69:  { name: "generate",         returnType: "int[][]",  args: [{ name: "numRows", type: "int" }] },
  70:  { name: "addBinary",        returnType: "string",   args: [{ name: "a", type: "string" }, { name: "b", type: "string" }] },
  71:  { name: "isIsomorphic",     returnType: "boolean",  args: [{ name: "s", type: "string" }, { name: "t", type: "string" }] },
  72:  { name: "containsNearbyDuplicate", returnType: "boolean", args: [{ name: "nums", type: "int[]" }, { name: "k", type: "int" }] },
  73:  { name: "findDuplicate",    returnType: "int",      args: [{ name: "nums", type: "int[]" }] },
  74:  { name: "isPowerOfTwo",     returnType: "boolean",  args: [{ name: "n", type: "int" }] },
  75:  { name: "validPalindrome",  returnType: "boolean",  args: [{ name: "s", type: "string" }] },
  76:  { name: "isValidSudoku",    returnType: "boolean",  args: [{ name: "board", type: "char[][]" }] },
  77:  { name: "sortedSquares",    returnType: "int[]",    args: [{ name: "nums", type: "int[]" }] },
  78:  { name: "firstUniqChar",    returnType: "int",      args: [{ name: "s", type: "string" }] },
  79:  { name: "hammingWeight",    returnType: "int",      args: [{ name: "n", type: "int" }] },
  80:  { name: "wordPattern",      returnType: "boolean",  args: [{ name: "pattern", type: "string" }, { name: "s", type: "string" }] },
  81:  { name: "maxSlidingWindow", returnType: "int[]",    args: [{ name: "nums", type: "int[]" }, { name: "k", type: "int" }] },
  82:  { name: "threeSumClosest",  returnType: "int",      args: [{ name: "nums", type: "int[]" }, { name: "target", type: "int" }] },
  83:  { name: "fourSum",          returnType: "int[][]",  args: [{ name: "nums", type: "int[]" }, { name: "target", type: "int" }] },
  84:  { name: "letterCombinations", returnType: "string[]", args: [{ name: "digits", type: "string" }] },
  85:  { name: "solveNQueens",     returnType: "string[][]", args: [{ name: "n", type: "int" }] },
  86:  { name: "largestRectangleArea", returnType: "int", args: [{ name: "heights", type: "int[]" }] },
  87:  { name: "generateParenthesis", returnType: "string[]", args: [{ name: "n", type: "int" }] },
  88:  { name: "intToRoman",       returnType: "string",   args: [{ name: "num", type: "int" }] },
  90:  { name: "minWindow",        returnType: "string",   args: [{ name: "s", type: "string" }, { name: "t", type: "string" }] },
  92:  { name: "multiply",         returnType: "string",   args: [{ name: "num1", type: "string" }, { name: "num2", type: "string" }] },
  93:  { name: "generateMatrix",   returnType: "int[][]",  args: [{ name: "n", type: "int" }] },
  94:  { name: "myAtoi",           returnType: "int",      args: [{ name: "s", type: "string" }] },
  95:  { name: "longestValidParentheses", returnType: "int", args: [{ name: "s", type: "string" }] },
  96:  { name: "convert",          returnType: "string",   args: [{ name: "s", type: "string" }, { name: "numRows", type: "int" }] },
  97:  { name: "longestPalindrome",returnType: "string",   args: [{ name: "s", type: "string" }] },
  98:  { name: "reverseWords",     returnType: "string",   args: [{ name: "s", type: "string" }] },
  99:  { name: "strStr",           returnType: "int",      args: [{ name: "haystack", type: "string" }, { name: "needle", type: "string" }] },
  100: { name: "countAndSay",      returnType: "string",   args: [{ name: "n", type: "int" }] },
  105: { name: "scan",             returnType: "int",      args: [{ name: "ballots", type: "string[]" }, { name: "candidates", type: "string[]" }] },
  117: { name: "replay",           returnType: "int[]",    args: [{ name: "scores", type: "int[]" }] },
};

async function run() {
  console.log("🔧 Fixing ALL remaining compilation failures...\n");

  const numbers = Object.keys(FIXES).map(Number);
  const { data: problems } = await supabase
    .from('logiclab_problems')
    .select('id, number, title')
    .in('number', numbers);

  let fixed = 0, failed = 0;

  for (const p of problems) {
    const sig = FIXES[p.number];
    if (!sig) continue;
    try {
      const templates = generateTemplatesFromSignature(sig);
      const { error } = await supabase.from('logiclab_problems').update({
        boilerplates: templates.boilerplates,
        driver_codes: templates.driverCodes,
      }).eq('id', p.id);
      if (error) { console.error(`❌ #${p.number} ${p.title}:`, error.message); failed++; }
      else { console.log(`✅ #${p.number} ${p.title}`); fixed++; }
    } catch (e) {
      console.error(`❌ #${p.number} ${p.title}: generation failed -`, e.message);
      failed++;
    }
  }

  console.log(`\n=============================`);
  console.log(`✅ Fixed: ${fixed} | ❌ Failed: ${failed}`);
}

run().catch(console.error);
