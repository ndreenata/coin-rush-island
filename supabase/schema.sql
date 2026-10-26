-- ====================================================================
-- COIN RUSH ISLAND: SUPABASE LEADERBOARD SCHEMA & ROW LEVEL SECURITY
-- ====================================================================
-- Jalankan skrip ini di SQL Editor dashboard Supabase Anda
-- (https://app.supabase.com -> Project Anda -> SQL Editor -> New Query)

-- 1. Buat tabel leaderboard
CREATE TABLE IF NOT EXISTS public.leaderboard (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player_name TEXT NOT NULL CHECK (char_length(player_name) >= 1 AND char_length(player_name) <= 20),
    score INTEGER NOT NULL CHECK (score >= 0 AND score <= 99999),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2. Buat index untuk performa query Top Scores
CREATE INDEX IF NOT EXISTS idx_leaderboard_score_desc ON public.leaderboard (score DESC, created_at ASC);

-- 3. Aktifkan Row Level Security (RLS)
ALTER TABLE public.leaderboard ENABLE ROW LEVEL SECURITY;

-- 4. Policy: Izinkan publik membaca papan peringkat (SELECT)
CREATE POLICY "Allow public read leaderboard"
ON public.leaderboard
FOR SELECT
TO public
USING (true);

-- 5. Policy: Izinkan pemain publik mengirim skor (INSERT) dengan validasi aman
CREATE POLICY "Allow public insert score"
ON public.leaderboard
FOR INSERT
TO public
WITH CHECK (
    score >= 0 
    AND score <= 99999
    AND char_length(player_name) >= 1 
    AND char_length(player_name) <= 20
);

-- Catatan Keamanan:
-- - RLS aktif secara default.
-- - Akses publik hanya menggunakan anon/publishable key, bukan service_role key.
-- - UPDATE dan DELETE tidak diizinkan untuk publik sehingga riwayat rekor tidak dapat dimanipulasi dari browser.
