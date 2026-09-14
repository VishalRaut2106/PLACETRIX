/**
 * Regenerate driver codes for all 21 failing problems
 * and update them in the database.
 */
import { createClient } from '@supabase/supabase-js';
import { generateTemplatesFromSignature, normalizeArgType } from '../lib/generator/templateGenerator.js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// Manually define the known signatures for each failing problem
// based on their boilerplate function signatures
const PROBLEM_FIXES = {
  24:  { name: "moveZeroes",       returnType: "void",     args: [{ name: "nums",      type: "int[]"    }] },
  31:  { name: "findMaxConsecutiveOnes", returnType: "int", args: [{ name: "nums",     type: "int[]"    }] },
  32:  { name: "isPalindrome",     returnType: "boolean",  args: [{ name: "x",         type: "int"      }] },
  33:  { name: "threeSum",         returnType: "int[][]",  args: [{ name: "nums",      type: "int[]"    }] },
  34:  { name: "groupAnagrams",    returnType: "string[][]", args: [{ name: "strs",    type: "string[]" }] },
  37:  { name: "rotate",           returnType: "void",     args: [{ name: "matrix",    type: "int[][]"  }] },
  38:  { name: "exist",            returnType: "boolean",  args: [{ name: "board",     type: "char[][]" }, { name: "word", type: "string" }] },
  40:  { name: "numIslands",       returnType: "int",      args: [{ name: "grid",      type: "char[][]" }] },
  42:  { name: "longestCommonPrefix", returnType: "string", args: [{ name: "strs",     type: "string[]" }] },
  43:  { name: "permute",          returnType: "int[][]",  args: [{ name: "nums",      type: "int[]"    }] },
  44:  { name: "combinationSum",   returnType: "int[][]",  args: [{ name: "candidates", type: "int[]"  }, { name: "target", type: "int" }] },
  45:  { name: "setZeroes",        returnType: "void",     args: [{ name: "matrix",    type: "int[][]"  }] },
  48:  { name: "subsets",          returnType: "int[][]",  args: [{ name: "nums",      type: "int[]"    }] },
  49:  { name: "sortColors",       returnType: "void",     args: [{ name: "nums",      type: "int[]"    }] },
};

async function run() {
  console.log("🔧 Regenerating driver codes for all 21 failing problems...\n");

  const numbers = Object.keys(PROBLEM_FIXES).map(Number);
  const { data: problems, error } = await supabase
    .from('logiclab_problems')
    .select('id, number, title')
    .in('number', numbers);

  if (error || !problems) { console.error("DB fetch error:", error); return; }

  let fixed = 0;
  let failed = 0;

  for (const p of problems) {
    const sig = PROBLEM_FIXES[p.number];
    if (!sig) { console.log(`⚠️  No fix defined for #${p.number}`); continue; }

    try {
      const templates = generateTemplatesFromSignature(sig);
      
      const { error: updateError } = await supabase
        .from('logiclab_problems')
        .update({
          boilerplates: templates.boilerplates,
          driver_codes: templates.driverCodes,
        })
        .eq('id', p.id);

      if (updateError) {
        console.error(`❌ #${p.number} ${p.title}: DB update failed -`, updateError.message);
        failed++;
      } else {
        console.log(`✅ #${p.number} ${p.title}: Driver codes regenerated`);
        fixed++;
      }
    } catch (e) {
      console.error(`❌ #${p.number} ${p.title}: Template generation failed -`, e.message);
      failed++;
    }
  }

  console.log(`\n=============================`);
  console.log(`✅ Fixed:  ${fixed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`\nAll done! Run the compiler test again to verify.`);
}

run().catch(console.error);
