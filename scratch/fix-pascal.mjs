import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { generateTemplatesFromSignature } from '../lib/generator/templateGenerator.js';
import fs from 'fs';

dotenv.config();

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const sig = {
    name: "generate",
    returnType: "List<List<Integer>>",
    args: [{ name: "numRows", type: "int" }]
  };
  
  const templates = generateTemplatesFromSignature(sig);
  
  const { data, error } = await supabase.from('logiclab_problems').update({ driver_codes: templates.driverCodes }).eq('number', 69);
  
  if (error) {
    console.error("Error updating problem:", error);
  } else {
    console.log("Successfully updated driver codes for Pascal's Triangle (Problem #69)!");
  }
}

run();
