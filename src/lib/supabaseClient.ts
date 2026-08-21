import { createClient } from "@supabase/supabase-js";

export const SUPABASE_URL = "https://gnlnrnifzvivqvfiuiaw.supabase.co";
export const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdubG5ybmlmenZpdnF2Zml1aWF3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUxMzgwOTksImV4cCI6MjEwMDcxNDA5OX0.FbFCZ5BMv86U0IZjYlDr1XSoIjWScjgghTavFV7gkn4";

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
