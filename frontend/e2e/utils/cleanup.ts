/// <reference types="node" />
import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

const E2E_EMAIL = "confirmed-user@sprintmind.ai";
const E2E_PASSWORD = "confirmedpassword";

// Helper to load env variables from frontend/.env file
function loadEnv() {
  const envPath = path.resolve(process.cwd(), ".env");
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, "utf-8");
    content.split(/\r?\n/).forEach((line: string) => {
      const match = line.match(/^\s*([^#\s=]+)\s*=\s*(.*)$/);
      if (match) {
        const key = match[1];
        let val = match[2].trim();
        if (val.startsWith('"') && val.endsWith('"')) {
          val = val.substring(1, val.length - 1);
        } else if (val.startsWith("'") && val.endsWith("'")) {
          val = val.substring(1, val.length - 1);
        }
        process.env[key] = val;
      }
    });
  }
}

export async function cleanupDatabase() {
  loadEnv();

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn("Supabase URL or Anon Key not found in environment. Skipping E2E database cleanup.");
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
    },
  });

  // Authenticate as the E2E test user
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: E2E_EMAIL,
    password: E2E_PASSWORD,
  });

  if (authError || !authData.user) {
    console.error("Failed to authenticate E2E user for database cleanup:", authError?.message);
    return;
  }

  const userId = authData.user.id;

  // 1. Delete tasks owned by E2E user
  const { error: taskError } = await supabase
    .from("tasks")
    .delete()
    .eq("owner_id", userId);

  if (taskError) {
    console.error("Error cleaning up E2E tasks:", taskError.message);
  }

  // 2. Delete projects owned by E2E user
  const { error: projectError } = await supabase
    .from("projects")
    .delete()
    .eq("owner_id", userId);

  if (projectError) {
    console.error("Error cleaning up E2E projects:", projectError.message);
  }

  console.log(`Successfully cleaned up E2E projects and tasks for ${E2E_EMAIL}`);
}
