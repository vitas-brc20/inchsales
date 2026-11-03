import { createClient } from '@supabase/supabase-js';

// Next.js 환경 및 스크립트 환경 공용 Supabase 클라이언트
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://wipvckaicyltkzwvgrao.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndpcHZja2FpY3lsdGt6d3ZncmFvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA1MjMxNzAsImV4cCI6MjA4NjA5OTE3MH0.IFNDF8Yp0lAkOs00YqfXjvRYPr8LQkpi8FwSH20pnt4';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
