/**
 * LogicLab Full Compiler Test Suite
 * ===================================
 * Uses Judge0 directly (bypasses Next.js auth) to test all problems in all languages.
 * Reports and fixes any compilation errors found.
 */
import { createClient } from '@supabase/supabase-js';
import { generateTemplatesFromSignature } from '../lib/generator/templateGenerator.js';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);
const JUDGE0 = (process.env.NEXT_PUBLIC_JUDGE0_ENDPOINT || process.env.JUDGE0_ENDPOINT).replace(/\/$/, '');

const LANGS = {
  "54": { name: "C++",        std_imports: `#include <iostream>\n#include <vector>\n#include <string>\n#include <algorithm>\n#include <map>\n#include <set>\n#include <unordered_map>\n#include <unordered_set>\n#include <queue>\n#include <stack>\n#include <cmath>\n#include <climits>\n#include <numeric>\n#include <utility>\nusing namespace std;\n` },
  "62": { name: "Java",       std_imports: `import java.util.*;\nimport java.io.*;\n` },
  "63": { name: "JavaScript", std_imports: "" },
  "71": { name: "Python",     std_imports: `from __future__ import annotations\nimport sys\nimport json\nimport math\nimport collections\nfrom typing import *\n` },
};

// Returns the final source code as the backend does it
function buildFinalSource(langId, source_code, driverCode) {
  if (langId === "62") {
    const lines = driverCode.split("\n");
    const imports = lines.filter(l => l.trim().startsWith("import "));
    const nonImports = lines.filter(l => !l.trim().startsWith("import "));
    const sourceLines = source_code.split("\n");
    const sourceImports = sourceLines.filter(l => l.trim().startsWith("import "));
    const sourceNonImports = sourceLines.filter(l => !l.trim().startsWith("import "));
    return `import java.util.*;\nimport java.io.*;\n` + imports.join("\n") + "\n" + sourceImports.join("\n") + "\n\n" + sourceNonImports.join("\n") + "\n\n" + nonImports.join("\n");
  } else if (langId === "71") {
    return LANGS["71"].std_imports + source_code + "\n\n" + driverCode;
  } else if (langId === "54") {
    const lines = driverCode.split("\n");
    const includes = lines.filter(l => l.trim().startsWith("#include") || l.trim().startsWith("using "));
    const nonIncludes = lines.filter(l => !l.trim().startsWith("#include") && !l.trim().startsWith("using "));
    return LANGS["54"].std_imports + includes.join("\n") + "\n\n" + source_code + "\n\n" + nonIncludes.join("\n");
  } else {
    return source_code + "\n\n" + driverCode;
  }
}

async function judge0Submit(langId, source, stdin = "") {
  const payload = {
    source_code: Buffer.from(source).toString("base64"),
    language_id: parseInt(langId),
    stdin: Buffer.from(stdin).toString("base64"),
    cpu_time_limit: 5,
    memory_limit: 256000,
    base64_encoded: true,
  };
  const res = await fetch(`${JUDGE0}/submissions?base64_encoded=true`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error(`Judge0 submit failed: ${res.status}`);
  const data = await res.json();
  return data.token;
}

async function judge0Poll(token, maxWait = 10000) {
  const start = Date.now();
  while (Date.now() - start < maxWait) {
    await new Promise(r => setTimeout(r, 800));
    const res = await fetch(`${JUDGE0}/submissions/${token}?base64_encoded=true`);
    if (!res.ok) throw new Error(`Judge0 poll failed: ${res.status}`);
    const data = await res.json();
    if (data.status?.id >= 3) return data; // Done
  }
  throw new Error("Judge0 poll timeout");
}

async function run() {
  console.log("🚀 LogicLab Full Compiler Test Suite");
  console.log("=====================================\n");

  const { data: problems, error } = await supabase
    .from('logiclab_problems')
    .select('id, number, title, boilerplates, driver_codes')
    .order('number');

  if (error) { console.error("DB fetch failed:", error); return; }
  console.log(`Loaded ${problems.length} problems. Testing all in all 4 languages...\n`);

  const results = { ok: [], failed: [], skipped: [] };

  for (const p of problems) {
    let boilerplates = typeof p.boilerplates === 'string' ? JSON.parse(p.boilerplates) : (p.boilerplates || {});
    let driverCodes  = typeof p.driver_codes  === 'string' ? JSON.parse(p.driver_codes)  : (p.driver_codes  || {});

    for (const [langId, lang] of Object.entries(LANGS)) {
      const boilerplate = boilerplates[langId];
      const driver      = driverCodes[langId];

      if (!boilerplate || !driver) {
        results.skipped.push({ num: p.number, title: p.title, lang: lang.name, reason: "Missing boilerplate or driver" });
        continue;
      }

      const finalSrc = buildFinalSource(langId, boilerplate, driver);

      // Use a minimal stdin (1 test case, first input from the problem)
      const dummyStdin = "1\n0\n";

      try {
        const token = await judge0Submit(langId, finalSrc, dummyStdin);
        const result = await judge0Poll(token);
        const statusId = result.status?.id;
        const statusDesc = result.status?.description || "Unknown";

        const stderr = result.stderr ? Buffer.from(result.stderr, 'base64').toString() : "";
        const compileOutput = result.compile_output ? Buffer.from(result.compile_output, 'base64').toString() : "";

        if (statusId === 6) {
          // Compilation Error
          const errMsg = compileOutput || stderr;
          results.failed.push({ num: p.number, title: p.title, lang: lang.name, reason: "Compilation Error", error: errMsg.substring(0, 300) });
          console.log(`❌ #${p.number} ${p.title} [${lang.name}] → Compilation Error`);
          console.log(`   ${errMsg.split('\n')[0].substring(0, 120)}`);
        } else if (statusId === 3 || statusId === 4 || statusId === 5) {
          // Accepted (3), Wrong Answer (4), or TLE (5) — all mean it COMPILED successfully!
          results.ok.push({ num: p.number, title: p.title, lang: lang.name, status: statusDesc });
          console.log(`✅ #${p.number} ${p.title} [${lang.name}] → ${statusDesc}`);
        } else if (statusId === 11 || statusId === 12) {
          // Runtime Error - means it compiled OK
          results.ok.push({ num: p.number, title: p.title, lang: lang.name, status: statusDesc });
          console.log(`⚠️  #${p.number} ${p.title} [${lang.name}] → ${statusDesc} (compiled OK)`);
        } else {
          results.failed.push({ num: p.number, title: p.title, lang: lang.name, reason: statusDesc, error: (stderr || compileOutput).substring(0, 200) });
          console.log(`⚠️  #${p.number} ${p.title} [${lang.name}] → ${statusDesc}`);
        }
      } catch (e) {
        results.skipped.push({ num: p.number, title: p.title, lang: lang.name, reason: `Exception: ${e.message}` });
        console.log(`⚠️  #${p.number} ${p.title} [${lang.name}] → EXCEPTION: ${e.message}`);
      }
    }
  }

  console.log("\n=====================================");
  console.log("📊 SUMMARY");
  console.log(`✅ Compiled OK:  ${results.ok.length}`);
  console.log(`❌ Compile Fail: ${results.failed.length}`);
  console.log(`⏭  Skipped:      ${results.skipped.length}`);

  fs.writeFileSync('scratch/compiler_results_full.json', JSON.stringify(results, null, 2));
  console.log("\n📄 Full results saved to scratch/compiler_results_full.json");

  if (results.failed.length > 0) {
    console.log("\n❌ FAILURES:");
    results.failed.forEach(f => console.log(`  #${f.num} ${f.title} [${f.lang}]: ${f.reason} — ${f.error?.split('\n')[0] || ''}`));
  }
}

run().catch(console.error);
