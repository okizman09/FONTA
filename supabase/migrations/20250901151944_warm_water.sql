/*
  # Create daily usage tracking table

  1. New Tables
    - `daily_usage`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references profiles)
      - `date` (date)
      - `total_count` (integer, default 0)
      - `last_reset` (timestamptz, default now)
      - `created_at` (timestamptz, default now)
      - `updated_at` (timestamptz, default now)

  2. Security
    - Enable RLS on `daily_usage` table
    - Add policy for users to read/update their own usage data
    
  3. Indexes
    - Unique index on user_id and date
    - Index on user_id for faster queries
*/

CREATE TABLE IF NOT EXISTS daily_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  date date NOT NULL,
  total_count integer DEFAULT 0,
  last_reset timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create unique index to prevent duplicate entries per user per day
CREATE UNIQUE INDEX IF NOT EXISTS daily_usage_user_date_idx ON daily_usage(user_id, date);

-- Create index for faster user queries
CREATE INDEX IF NOT EXISTS daily_usage_user_id_idx ON daily_usage(user_id);

ALTER TABLE daily_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own usage data"
  ON daily_usage
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own usage data"
  ON daily_usage
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own usage data"
  ON daily_usage
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE TRIGGER update_daily_usage_updated_at
  BEFORE UPDATE ON daily_usage
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();