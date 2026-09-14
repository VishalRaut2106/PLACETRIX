import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const JUDGE0_ENDPOINT = process.env.NEXT_PUBLIC_JUDGE0_ENDPOINT || process.env.JUDGE0_ENDPOINT;

const LANG_IDS = {
  "cpp": "54",
  "java": "62",
  "js": "63",
  "python": "71"
};

const pLimit = (await import('p-limit')).default;

async function run() {
  const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
    email: 'vishalraut.login@gmail.com',
    password: '12345678'
  });
  
  if (authErr) {
    console.error("Login failed:", authErr.message);
    return;
  }
  
  const token = authData.session.access_token;
  
  const { data: problems, error } = await supabase.from('logiclab_problems').select('id, number, title, boilerplates, driver_codes');
  if (error) {
    console.error("Failed to fetch problems:", error);
    return;
  }
  
  console.log(`Logged in as vishalraut.login@gmail.com. Fetched ${problems.length} problems. Testing compilers in parallel...`);
  
  let failed = [];
  const limit = pLimit(20); // 20 concurrent requests
  const tasks = [];
  
  for (const p of problems) {
    if (!p.boilerplates || !p.driver_codes) continue;
    let boilerplates = typeof p.boilerplates === 'string' ? JSON.parse(p.boilerplates) : p.boilerplates;
    
    for (const [langName, langId] of Object.entries(LANG_IDS)) {
      const source_code = boilerplates[langId];
      if (!source_code) continue;
      
      const payload = {
        problem_id: p.id,
        language_id: parseInt(langId),
        source_code: source_code,
        mode: "problem"
      };
      
      tasks.push(limit(async () => {
        try {
          const res = await fetch('http://localhost:3000/api/logiclab/run', {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}` 
            },
            body: JSON.stringify(payload)
          });
          
          if (!res.ok) {
             const err = await res.json();
             failed.push({ problem: p.number, title: p.title, lang: langName, reason: `API Error: ${err.error || res.statusText}` });
             return;
          }
          
          const data = await res.json();
          const runToken = data.tokens[0];
          
          await new Promise(r => setTimeout(r, 1500)); // Wait for Judge0
          
          const statusRes = await fetch('http://localhost:3000/api/logiclab/run-status', {
             method: 'POST',
             headers: { 
               'Content-Type': 'application/json',
               'Authorization': `Bearer ${token}` 
             },
             body: JSON.stringify({ tokens: [runToken], problem_id: p.id, language_id: parseInt(langId) })
          });
          
          const statusData = await statusRes.json();
          const result = statusData.results[0];
          
          if (result.status === "Compilation Error" || result.status === "System Error" || result.status === "Runtime Error") {
             failed.push({ problem: p.number, title: p.title, lang: langName, reason: result.status, error: result.error });
             console.log(`[FAILED] #${p.number} ${p.title} (${langName}) - ${result.status}`);
          } else {
             console.log(`[OK] #${p.number} ${p.title} (${langName})`);
          }
        } catch (e) {
          failed.push({ problem: p.number, title: p.title, lang: langName, reason: `Request Failed: ${e.message}` });
        }
      }));
    }
  }
  
  await Promise.all(tasks);
  
  console.log("\n--- TEST COMPLETE ---");
  fs.writeFileSync('scratch/compiler_test_results.json', JSON.stringify(failed, null, 2));
  console.log(`Found ${failed.length} compilation issues. Results saved to scratch/compiler_test_results.json`);
}

run();
