-- Supabase Database Setup for Star Ratings
-- Run this in your Supabase SQL Editor (https://supabase.com/dashboard/project/azdxbbkhbasjpbcqtchw/sql)

-- Create ratings table
CREATE TABLE IF NOT EXISTS show_ratings (
  id BIGSERIAL PRIMARY KEY,
  show_id TEXT NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  user_fingerprint TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_user_show UNIQUE (show_id, user_fingerprint)
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_show_ratings_show_id ON show_ratings(show_id);
CREATE INDEX IF NOT EXISTS idx_show_ratings_created_at ON show_ratings(created_at);

-- Create a view for aggregated ratings
CREATE OR REPLACE VIEW show_ratings_summary AS
SELECT
  show_id,
  COUNT(*) as total_votes,
  ROUND(AVG(rating)::numeric, 1) as average_rating
FROM show_ratings
GROUP BY show_id;

-- Enable Row Level Security (RLS)
ALTER TABLE show_ratings ENABLE ROW LEVEL security;

-- Policy: Anyone can read ratings
CREATE POLICY "Anyone can view ratings" ON show_ratings
  FOR SELECT USING (true);

-- Policy: Anyone can insert their own rating (one per show per user)
CREATE POLICY "Anyone can insert ratings" ON show_ratings
  FOR INSERT WITH CHECK (true);

-- Policy: Users can update their own ratings
CREATE POLICY "Users can update their own ratings" ON show_ratings
  FOR UPDATE USING (true);

-- Grant permissions (for anonymous access)
GRANT SELECT ON show_ratings TO anon;
GRANT INSERT ON show_ratings TO anon;
GRANT UPDATE ON show_ratings TO anon;
GRANT SELECT ON show_ratings_summary TO anon;

-- Grant permissions (for authenticated users, if you add auth later)
GRANT SELECT ON show_ratings TO authenticated;
GRANT INSERT ON show_ratings TO authenticated;
GRANT UPDATE ON show_ratings TO authenticated;
GRANT SELECT ON show_ratings_summary TO authenticated;

GRANT USAGE, SELECT ON SEQUENCE show_ratings_id_seq TO anon;
GRANT USAGE, SELECT ON SEQUENCE show_ratings_id_seq TO authenticated;
