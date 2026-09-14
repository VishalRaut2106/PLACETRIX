import { createClient } from '@supabase/supabase-js';
import { generateTemplatesFromSignature } from '../lib/generator/templateGenerator.js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const FIXES = {
  37: { name: 'rotate',        returnType: 'void', args: [{name:'matrix', type:'int[][]'}] },
  45: { name: 'setZeroes',     returnType: 'void', args: [{name:'matrix', type:'int[][]'}] },
  63: { name: 'reverseString', returnType: 'void', args: [{name:'s',      type:'char[]'}]  },
  91: { name: 'solveSudoku',   returnType: 'void', args: [{name:'board',  type:'char[][]'}] },
};

const {data: problems} = await supabase.from('logiclab_problems').select('id, number, title').in('number', [37, 45, 63, 91]);
for (const p of problems) {
  const sig = FIXES[p.number];
  if (!sig) continue;
  const t = generateTemplatesFromSignature(sig);
  const {error} = await supabase.from('logiclab_problems').update({boilerplates: t.boilerplates, driver_codes: t.driverCodes}).eq('id', p.id);
  console.log(error ? `❌ #${p.number} ${error.message}` : `✅ #${p.number} ${p.title}`);
}
