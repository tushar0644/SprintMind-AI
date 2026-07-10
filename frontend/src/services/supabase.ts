import { createClient } from "@supabase/supabase-js";
import { config } from "../config";

// Instantiate the Supabase Client SDK for frontend operations
export const supabase = createClient(
  config.supabaseUrl,
  config.supabaseAnonKey
);
