-- Run this in your Supabase dashboard → SQL Editor

-- 1. Profiles table (one row per user, tracks AI credits)
CREATE TABLE IF NOT EXISTS profiles (
  id       UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  credits  INTEGER NOT NULL DEFAULT 3,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_select_own" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "users_update_own" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- 2. Auto-create profile with 3 free credits when a new user signs up
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO profiles (id, credits)
  VALUES (NEW.id, 3)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- 3. Give 3 free credits to all existing users who don't have a profile yet
INSERT INTO profiles (id, credits)
SELECT id, 3 FROM auth.users
ON CONFLICT (id) DO NOTHING;

-- 4. Atomic "use one credit" — returns remaining credits, or NULL if none left
CREATE OR REPLACE FUNCTION use_ai_credit()
RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  remaining INTEGER;
BEGIN
  -- Ensure a profile row exists (0 credits for users created before migration)
  INSERT INTO profiles (id, credits)
  VALUES (auth.uid(), 0)
  ON CONFLICT (id) DO NOTHING;

  UPDATE profiles
  SET credits = credits - 1
  WHERE id = auth.uid() AND credits > 0
  RETURNING credits INTO remaining;

  RETURN remaining; -- NULL when no credits were available
END;
$$;

-- 5. Add credits (called from Stripe webhook via service role)
CREATE OR REPLACE FUNCTION add_credits(target_user_id UUID, amount INTEGER)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO profiles (id, credits)
  VALUES (target_user_id, amount)
  ON CONFLICT (id)
  DO UPDATE SET credits = profiles.credits + amount;
END;
$$;
