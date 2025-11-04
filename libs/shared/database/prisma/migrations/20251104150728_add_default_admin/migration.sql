-- CreateDefaultAdmin
-- Create default admin user with email login
-- Email: admin@cardhive.com
-- Password: Admin123! (CHANGE THIS IMMEDIATELY IN PRODUCTION)

DO $$
DECLARE
admin_user_id UUID;
BEGIN
    -- Insert admin user
INSERT INTO users (
  id,
  full_name,
  email,
  phone,
  date_of_birth,
  role,
  kyc_status,
  is_active,
  password_hash,
  created_at,
  updated_at
) VALUES (
           gen_random_uuid(),
           'System Administrator',
           'admin@cardhive.com',
           NULL,
           '1990-01-01',
           'SUPER_ADMIN',
           'VERIFIED',
           true,
           '$2b$10$p3s1sFnANB6D7o0Oq./VBue68hKKjb4sx3Gue9g3i61KqFvCtOGPy',
           NOW(),
           NOW()
         )
  RETURNING id INTO admin_user_id;

-- Create auth provider link for email
INSERT INTO auth_provider_links (
  id,
  user_id,
  provider,
  provider_id,
  created_at
) VALUES (
           gen_random_uuid(),
           admin_user_id,
           'EMAIL',
           'admin@cardhive.com',
           NOW()
         );

RAISE NOTICE 'Default admin user created successfully';
    RAISE NOTICE 'Email: admin@cardhive.com';
    RAISE NOTICE 'Password: Admin123!';
    RAISE NOTICE 'IMPORTANT: Change this password immediately!';
END $$;
