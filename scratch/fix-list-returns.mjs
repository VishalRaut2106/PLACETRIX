import { createClient } from '@supabase/supabase-js';
import { generateTemplatesFromSignature } from '../lib/generator/templateGenerator.js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// Problems that return List<List<Integer>>, List<String> etc in Java
// — need var res fix in driver
const FIXES = {
  33:  { name: 'threeSum',            returnType: 'int[][]',    args: [{name:'nums', type:'int[]'}] },
  43:  { name: 'permute',             returnType: 'int[][]',    args: [{name:'nums', type:'int[]'}] },
  44:  { name: 'combinationSum',      returnType: 'int[][]',    args: [{name:'candidates', type:'int[]'}, {name:'target', type:'int'}] },
  48:  { name: 'subsets',             returnType: 'int[][]',    args: [{name:'nums', type:'int[]'}] },
  69:  { name: 'generate',            returnType: 'int[][]',    args: [{name:'numRows', type:'int'}] },
  83:  { name: 'fourSum',             returnType: 'int[][]',    args: [{name:'nums', type:'int[]'}, {name:'target', type:'int'}] },
  84:  { name: 'letterCombinations',  returnType: 'string[]',   args: [{name:'digits', type:'string'}] },
  85:  { name: 'solveNQueens',        returnType: 'string[][]', args: [{name:'n', type:'int'}] },
  87:  { name: 'generateParenthesis', returnType: 'string[]',   args: [{name:'n', type:'int'}] },
  34:  { name: 'groupAnagrams',       returnType: 'string[][]', args: [{name:'strs', type:'string[]'}] },
};

async function run() {
  const nums = Object.keys(FIXES).map(Number);
  const {data: problems} = await supabase.from('logiclab_problems').select('id, number, title').in('number', nums);
  let fixed = 0, failed = 0;
  for (const p of problems) {
    const sig = FIXES[p.number];
    if (!sig) continue;
    try {
      const t = generateTemplatesFromSignature(sig);
      const {error} = await supabase.from('logiclab_problems').update({
        boilerplates: t.boilerplates,
        driver_codes: t.driverCodes
      }).eq('id', p.id);
      if (error) { console.error(`❌ #${p.number}:`, error.message); failed++; }
      else { console.log(`✅ #${p.number} ${p.title}`); fixed++; }
    } catch(e) { console.error(`❌ #${p.number}:`, e.message); failed++; }
  }
  console.log(`\nFixed: ${fixed} | Failed: ${failed}`);
}

run().catch(console.error);
