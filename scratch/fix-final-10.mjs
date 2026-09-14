import { createClient } from '@supabase/supabase-js';
import { generateTemplatesFromSignature } from '../lib/generator/templateGenerator.js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const FIXES = {
  24:  { name: "moveZeroes",      returnType: "void",       args: [{ name: "nums", type: "int[]" }] },
  34:  { name: "groupAnagrams",   returnType: "string[][]", args: [{ name: "strs", type: "string[]" }] },
  37:  { name: "rotate",          returnType: "void",       args: [{ name: "matrix", type: "int[][]" }] },
  45:  { name: "setZeroes",       returnType: "void",       args: [{ name: "matrix", type: "int[][]" }] },
  49:  { name: "sortColors",      returnType: "void",       args: [{ name: "nums", type: "int[]" }] },
  62:  { name: "rotate",          returnType: "void",       args: [{ name: "nums", type: "int[]" }, { name: "k", type: "int" }] },
  63:  { name: "reverseString",   returnType: "void",       args: [{ name: "s", type: "char[]" }] },
  85:  { name: "solveNQueens",    returnType: "string[][]", args: [{ name: "n", type: "int" }] },
  89:  { name: "nextPermutation", returnType: "void",       args: [{ name: "nums", type: "int[]" }] },
  91:  { name: "solveSudoku",     returnType: "void",       args: [{ name: "board", type: "char[][]" }] },
};

async function run() {
  console.log("🔧 Final 10 — fixing C++ void boilerplate and string[][] print...\n");
  const { data: problems } = await supabase.from('logiclab_problems').select('id, number, title').in('number', Object.keys(FIXES).map(Number));
  let fixed = 0, failed = 0;
  for (const p of problems) {
    const sig = FIXES[p.number];
    if (!sig) continue;
    try {
      const templates = generateTemplatesFromSignature(sig);
      const { error } = await supabase.from('logiclab_problems').update({ boilerplates: templates.boilerplates, driver_codes: templates.driverCodes }).eq('id', p.id);
      if (error) { console.error(`❌ #${p.number} ${p.title}:`, error.message); failed++; }
      else { console.log(`✅ #${p.number} ${p.title}`); fixed++; }
    } catch (e) { console.error(`❌ #${p.number} ${p.title}:`, e.message); failed++; }
  }
  console.log(`\n✅ Fixed: ${fixed} | ❌ Failed: ${failed}`);
}

run().catch(console.error);
