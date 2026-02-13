import { createClient } from "@supabase/supabase-js";

// make sure these values are available in your .env.local
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing supabase environment variables");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
