/*
  # Create content storage tables

  1. New Tables
    - `summaries` - Store user summaries
    - `quizzes` - Store generated quizzes
    - `homework_help` - Store homework explanations
    - `shared_quizzes` - Store publicly shared quizzes

  2. Security
    - Enable RLS on all tables
    - Add appropriate policies for each table
    
  3. Features
    - Full content storage and retrieval
    - Sharing capabilities for quizzes
    - Search and organization features
*/

-- Summaries table
CREATE TABLE IF NOT EXISTS summaries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  original_content text NOT NULL,
  summary_content text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Quizzes table
CREATE TABLE IF NOT EXISTS quizzes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  content text NOT NULL,
  questions jsonb NOT NULL,
  difficulty text DEFAULT 'medium' CHECK (difficulty IN ('easy', 'medium', 'hard')),
  score integer,
  completed boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Homework help table
CREATE TABLE IF NOT EXISTS homework_help (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  question text NOT NULL,
  explanation text NOT NULL,
  subject text DEFAULT 'general',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Shared quizzes table (for sharing with classmates)
CREATE TABLE IF NOT EXISTS shared_quizzes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  questions jsonb NOT NULL,
  difficulty text DEFAULT 'medium' CHECK (difficulty IN ('easy', 'medium', 'hard')),
  created_by uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  access_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE homework_help ENABLE ROW LEVEL SECURITY;
ALTER TABLE shared_quizzes ENABLE ROW LEVEL SECURITY;

-- Summaries policies
CREATE POLICY "Users can read own summaries"
  ON summaries FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own summaries"
  ON summaries FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own summaries"
  ON summaries FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own summaries"
  ON summaries FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Quizzes policies
CREATE POLICY "Users can read own quizzes"
  ON quizzes FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own quizzes"
  ON quizzes FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own quizzes"
  ON quizzes FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own quizzes"
  ON quizzes FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Homework help policies
CREATE POLICY "Users can read own homework help"
  ON homework_help FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own homework help"
  ON homework_help FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own homework help"
  ON homework_help FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own homework help"
  ON homework_help FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Shared quizzes policies
CREATE POLICY "Anyone can read shared quizzes"
  ON shared_quizzes FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Users can insert shared quizzes"
  ON shared_quizzes FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update own shared quizzes"
  ON shared_quizzes FOR UPDATE TO authenticated
  USING (auth.uid() = created_by);

CREATE POLICY "Users can delete own shared quizzes"
  ON shared_quizzes FOR DELETE TO authenticated
  USING (auth.uid() = created_by);

-- Add update triggers
CREATE TRIGGER update_summaries_updated_at
  BEFORE UPDATE ON summaries
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_quizzes_updated_at
  BEFORE UPDATE ON quizzes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_homework_help_updated_at
  BEFORE UPDATE ON homework_help
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_shared_quizzes_updated_at
  BEFORE UPDATE ON shared_quizzes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS summaries_user_id_idx ON summaries(user_id);
CREATE INDEX IF NOT EXISTS summaries_created_at_idx ON summaries(created_at DESC);

CREATE INDEX IF NOT EXISTS quizzes_user_id_idx ON quizzes(user_id);
CREATE INDEX IF NOT EXISTS quizzes_created_at_idx ON quizzes(created_at DESC);

CREATE INDEX IF NOT EXISTS homework_help_user_id_idx ON homework_help(user_id);
CREATE INDEX IF NOT EXISTS homework_help_created_at_idx ON homework_help(created_at DESC);

CREATE INDEX IF NOT EXISTS shared_quizzes_created_by_idx ON shared_quizzes(created_by);
CREATE INDEX IF NOT EXISTS shared_quizzes_created_at_idx ON shared_quizzes(created_at DESC);