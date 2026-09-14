import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const JUDGE0_ENDPOINT = process.env.NEXT_PUBLIC_JUDGE0_ENDPOINT || process.env.JUDGE0_ENDPOINT;

const LANG_IDS = {
  "cpp": "54",
  "java": "62",
  "js": "63",
  "python": "71"
};

async function run() {
  const { data: problems, error } = await supabase.from('logiclab_problems').select('id, number, title, boilerplates, driver_codes');
  if (error) {
    console.error("Failed to fetch problems:", error);
    return;
  }
  
  console.log(`Fetched ${problems.length} problems. Testing compilers...`);
  
  let failed = [];
  
  for (const p of problems) {
    if (!p.boilerplates || !p.driver_codes) continue;
    let boilerplates = typeof p.boilerplates === 'string' ? JSON.parse(p.boilerplates) : p.boilerplates;
    let driverCodes = typeof p.driver_codes === 'string' ? JSON.parse(p.driver_codes) : p.driver_codes;
    
    for (const [langName, langId] of Object.entries(LANG_IDS)) {
      const source_code = boilerplates[langId];
      if (!source_code) continue;
      
      // We will just hit the local API endpoint directly to test the compilation
      const payload = {
        problem_id: p.id,
        language_id: parseInt(langId),
        source_code: source_code,
        mode: "problem"
      };
      
      try {
        const res = await fetch('http://localhost:3000/api/logiclab/run', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        
        if (!res.ok) {
           const err = await res.json();
           failed.push({ problem: p.number, title: p.title, lang: langName, reason: `API Error: ${err.error || res.statusText}` });
           continue;
        }
        
        const data = await res.json();
        const token = data.tokens[0];
        
        // Wait for result
        await new Promise(r => setTimeout(r, 1000));
        
        const statusRes = await fetch('http://localhost:3000/api/logiclab/run-status', {
           method: 'POST',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify({ tokens: [token], problem_id: p.id, language_id: parseInt(langId) })
        });
        
        const statusData = await statusRes.json();
        const result = statusData.results[0];
        
        if (result.status === "Compilation Error" || result.status === "System Error" || result.status === "Runtime Error") {
           failed.push({ problem: p.number, title: p.title, lang: langName, reason: result.status, error: result.error });
           console.log(`[FAILED] #${p.number} ${p.title} (${langName}) - ${result.status}`);
        } else {
           // Wrong Answer or Accepted means it compiled successfully
           console.log(`[OK] #${p.number} ${p.title} (${langName})`);
        }
        
      } catch (e) {
        failed.push({ problem: p.number, title: p.title, lang: langName, reason: `Request Failed: ${e.message}` });
      }
    }
  }
  
  console.log("\n--- TEST COMPLETE ---");
  if (failed.length > 0) {
    console.log(`Found ${failed.length} compilation issues:`);
    console.log(JSON.stringify(failed, null, 2));
  } else {
    console.log("All problems compile successfully in all languages!");
  }
}

run();
