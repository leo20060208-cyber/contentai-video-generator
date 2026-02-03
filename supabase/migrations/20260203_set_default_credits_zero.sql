-- Change default credits from 10 to 0 for new profiles
ALTER TABLE public.profiles 
ALTER COLUMN credits SET DEFAULT 0;

-- Update the handle_new_user function to explicitly use 0 credits
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
    err_msg TEXT;
BEGIN
  BEGIN
    INSERT INTO public.profiles (id, email, name, avatar_url, plan, credits)
    VALUES (
      new.id,
      new.email,
      COALESCE(new.raw_user_meta_data->>'name', ''),
      COALESCE(new.raw_user_meta_data->>'avatar_url', ''),
      'Free',
      0  -- Changed from 10 to 0
    )
    ON CONFLICT (id) DO UPDATE SET
      email = EXCLUDED.email;
  EXCEPTION WHEN OTHERS THEN
    -- Catch the error and log it
    GET STACKED DIAGNOSTICS err_msg = MESSAGE_TEXT;
    INSERT INTO public.registration_errors (error_message, user_id, user_email)
    VALUES (err_msg, new.id, new.email);
    -- IMPORTANT: We still return NEW so the signup completes!
  END;
  
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Log the change
DO $$ 
BEGIN 
  RAISE NOTICE 'Updated default credits to 0 for new users.';
END $$;
