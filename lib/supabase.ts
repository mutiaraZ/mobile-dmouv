import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  "https://sfcpobdfasoyxpgxexst.supabase.co";

const supabaseAnonKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmY3BvYmRmYXNveXhwZ3hleHN0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODU3NzQ5NSwiZXhwIjoyMDk0MTUzNDk1fQ.6BcYn16FKClE0K12V-YkXmVvpPrLm_s0i_z-ZLNXUiw";

export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey
);