import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://zahtyjxlgubtikpoosef.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InphaHR5anhsZ3VidGlrcG9vc2VmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcwNjU4OTEsImV4cCI6MjA3MjY0MTg5MX0.qBUcJveIdpiEvnm5KcXEwWano9SeirBiVgJdt7XGs5Y';

if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Supabase URL and Anon Key must be provided.");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
