-- Migration: Add Lilongwe location fields to users table
-- Run this in your Supabase SQL editor.

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS area_name TEXT;

-- Create an index to support fast spatial bounding box / coordinate lookups
CREATE INDEX IF NOT EXISTS idx_users_location_coords ON users (latitude, longitude) WHERE role = 'PROVIDER' AND status = 'active';
