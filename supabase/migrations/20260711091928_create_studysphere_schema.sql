/*
# StudySphere AI — Core Database Schema

## Overview
Creates the complete database schema for StudySphere AI, an AI-powered study companion app.
Students upload PDF study materials and use AI to learn concepts, analyze previous year questions (PYQs),
generate quizzes, and prepare for exams.

## New Tables

1. **profiles** — User profile data (linked to auth.users)
   - id (uuid, PK, FK to auth.users)
   - email (text)
   - full_name (text)
   - avatar_url (text, nullable)
   - created_at, updated_at

2. **pdfs** — Uploaded study material PDFs
   - id (uuid, PK)
   - user_id (uuid, FK to auth.users, defaults to auth.uid())
   - name (text) — display name
   - file_path (text) — storage path
   - file_size (bigint) — in bytes
   - page_count (int) — estimated
   - reading_time (int) — estimated minutes
   - topics (text[]) — detected topics
   - content (text) — extracted text
   - progress (int) — 0-100 study progress
   - status (text) — 'ready' | 'processing' | 'error'
   - created_at, updated_at

3. **summaries** — AI-generated chapter/concept summaries
   - id (uuid, PK)
   - user_id (uuid, FK to auth.users)
   - pdf_id (uuid, FK to pdfs)
   - content (text) — summary text
   - type (text) — 'chapter' | 'concept' | 'revision'
   - created_at

4. **chats** — Study assistant chat messages
   - id (uuid, PK)
   - user_id (uuid, FK to auth.users)
   - pdf_id (uuid, FK to pdfs)
   - role (text) — 'user' | 'assistant'
   - content (text)
   - sources (jsonb) — referenced pages and confidence
   - mode (text) — 'learn' | 'prepare'
   - created_at

5. **pyq_analyses** — PYQ analysis results
   - id (uuid, PK)
   - user_id (uuid, FK to auth.users)
   - pdf_id (uuid, FK to pdfs) — the study material this PYQ relates to
   - pyq_file_path (text) — PYQ PDF storage path
   - questions (jsonb) — extracted questions
   - frequency (jsonb) — question frequency analysis
   - trends (jsonb) — trend analysis data
   - important_chapters (jsonb)
   - created_at

## Security
- RLS enabled on ALL tables
- All tables are owner-scoped (user_id defaults to auth.uid())
- 4 CRUD policies per table, scoped TO authenticated
- Only the owning user can access their data
*/

-- Profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text DEFAULT '',
  avatar_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_profile" ON profiles;
CREATE POLICY "select_own_profile" ON profiles FOR SELECT
  TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS "insert_own_profile" ON profiles;
CREATE POLICY "insert_own_profile" ON profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "update_own_profile" ON profiles;
CREATE POLICY "update_own_profile" ON profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "delete_own_profile" ON profiles;
CREATE POLICY "delete_own_profile" ON profiles FOR DELETE
  TO authenticated USING (auth.uid() = id);

-- PDFs table
CREATE TABLE IF NOT EXISTS pdfs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  file_path text NOT NULL,
  file_size bigint DEFAULT 0,
  page_count int DEFAULT 0,
  reading_time int DEFAULT 0,
  topics text[] DEFAULT '{}',
  content text DEFAULT '',
  progress int DEFAULT 0,
  status text DEFAULT 'processing',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE pdfs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_pdfs" ON pdfs;
CREATE POLICY "select_own_pdfs" ON pdfs FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_pdfs" ON pdfs;
CREATE POLICY "insert_own_pdfs" ON pdfs FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_pdfs" ON pdfs;
CREATE POLICY "update_own_pdfs" ON pdfs FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_pdfs" ON pdfs;
CREATE POLICY "delete_own_pdfs" ON pdfs FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- Summaries table
CREATE TABLE IF NOT EXISTS summaries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  pdf_id uuid REFERENCES pdfs(id) ON DELETE CASCADE,
  content text NOT NULL,
  type text DEFAULT 'chapter',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE summaries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_summaries" ON summaries;
CREATE POLICY "select_own_summaries" ON summaries FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_summaries" ON summaries;
CREATE POLICY "insert_own_summaries" ON summaries FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_summaries" ON summaries;
CREATE POLICY "update_own_summaries" ON summaries FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_summaries" ON summaries;
CREATE POLICY "delete_own_summaries" ON summaries FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- Chats table
CREATE TABLE IF NOT EXISTS chats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  pdf_id uuid REFERENCES pdfs(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'user',
  content text NOT NULL,
  sources jsonb DEFAULT '[]',
  mode text DEFAULT 'learn',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE chats ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_chats" ON chats;
CREATE POLICY "select_own_chats" ON chats FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_chats" ON chats;
CREATE POLICY "insert_own_chats" ON chats FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_chats" ON chats;
CREATE POLICY "update_own_chats" ON chats FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_chats" ON chats;
CREATE POLICY "delete_own_chats" ON chats FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- PYQ Analyses table
CREATE TABLE IF NOT EXISTS pyq_analyses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  pdf_id uuid REFERENCES pdfs(id) ON DELETE CASCADE,
  pyq_file_path text,
  questions jsonb DEFAULT '[]',
  frequency jsonb DEFAULT '{}',
  trends jsonb DEFAULT '{}',
  important_chapters jsonb DEFAULT '[]',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE pyq_analyses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_pyq" ON pyq_analyses;
CREATE POLICY "select_own_pyq" ON pyq_analyses FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_pyq" ON pyq_analyses;
CREATE POLICY "insert_own_pyq" ON pyq_analyses FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_pyq" ON pyq_analyses;
CREATE POLICY "update_own_pyq" ON pyq_analyses FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_pyq" ON pyq_analyses;
CREATE POLICY "delete_own_pyq" ON pyq_analyses FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_pdfs_user_id ON pdfs(user_id);
CREATE INDEX IF NOT EXISTS idx_pdfs_created_at ON pdfs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_summaries_user_id ON summaries(user_id);
CREATE INDEX IF NOT EXISTS idx_summaries_pdf_id ON summaries(pdf_id);
CREATE INDEX IF NOT EXISTS idx_chats_user_id ON chats(user_id);
CREATE INDEX IF NOT EXISTS idx_chats_pdf_id ON chats(pdf_id);
CREATE INDEX IF NOT EXISTS idx_pyq_user_id ON pyq_analyses(user_id);
CREATE INDEX IF NOT EXISTS idx_pyq_pdf_id ON pyq_analyses(pdf_id);

-- Storage bucket for PDFs
INSERT INTO storage.buckets (id, name, public)
VALUES ('pdfs', 'pdfs', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for PDFs bucket
DROP POLICY IF EXISTS "users_upload_own_pdfs" ON storage.objects;
CREATE POLICY "users_upload_own_pdfs" ON storage.objects FOR INSERT
  TO authenticated WITH CHECK (bucket_id = 'pdfs');

DROP POLICY IF EXISTS "users_read_own_pdfs" ON storage.objects;
CREATE POLICY "users_read_own_pdfs" ON storage.objects FOR SELECT
  TO authenticated USING (bucket_id = 'pdfs');

DROP POLICY IF EXISTS "users_delete_own_pdfs" ON storage.objects;
CREATE POLICY "users_delete_own_pdfs" ON storage.objects FOR DELETE
  TO authenticated USING (bucket_id = 'pdfs');

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', ''))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
