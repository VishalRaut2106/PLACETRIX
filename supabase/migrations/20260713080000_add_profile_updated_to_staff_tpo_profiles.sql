-- Migration: Add profile_updated column to tpo_profiles and staff_profiles
-- This column is used to track whether a user has completed their professional profile setup.

ALTER TABLE public.tpo_profiles
  ADD COLUMN IF NOT EXISTS profile_updated boolean NOT NULL DEFAULT false;

ALTER TABLE public.staff_profiles
  ADD COLUMN IF NOT EXISTS profile_updated boolean NOT NULL DEFAULT false;
