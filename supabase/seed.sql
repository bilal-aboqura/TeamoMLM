-- ============================================================
-- TEMO Seed Data: T008 + T010 + T011 + T012
-- Run once after migrations are applied
-- ============================================================

-- T008: Create private storage bucket for receipts and proofs
INSERT INTO storage.buckets (id, name, public)
VALUES ('proofs', 'proofs', false)
ON CONFLICT (id) DO NOTHING;

-- T010: Seed the 6 TEMO package tiers
INSERT INTO public.packages (name, price, daily_task_count, daily_profit, display_order)
VALUES
  ('A1', 200.00,  3, 3.33, 1),
  ('A2', 400.00,  3, 6.66, 2),
  ('A3', 600.00,  3, 10.00, 3),
  ('B1', 1200.00, 4, 20.00, 4),
  ('B2', 1800.00, 4, 30.00, 5),
  ('B3', 2500.00, 4, 41.66, 6)
ON CONFLICT (name) DO UPDATE SET
  price            = EXCLUDED.price,
  daily_task_count = EXCLUDED.daily_task_count,
  daily_profit     = EXCLUDED.daily_profit,
  display_order    = EXCLUDED.display_order,
  is_active        = true;

-- T011: Seed admin payment settings
INSERT INTO public.admin_settings (payment_method_label, payment_address, is_active)
VALUES ('Vodafone Cash', '01012345678', true);

-- T012: Seed 15 active tasks (covers max daily_task_count of B3)
INSERT INTO public.tasks (title, platform_label, action_url, display_order)
VALUES
  ('أعجب بهذا الفيديو على يوتيوب', 'YouTube', 'https://youtube.com/watch?v=example1', 1),
  ('تابع هذا الحساب على تيك توك', 'TikTok', 'https://tiktok.com/@example', 2),
  ('تابع هذه الصفحة على إنستغرام', 'Instagram', 'https://instagram.com/example', 3),
  ('شاهد هذا الفيديو على يوتيوب', 'YouTube', 'https://youtube.com/watch?v=example4', 4),
  ('أعد تغريد هذه التغريدة', 'X (Twitter)', 'https://x.com/example/status/123', 5),
  ('اشترك في هذه القناة على يوتيوب', 'YouTube', 'https://youtube.com/c/example6', 6),
  ('أعجب بهذا المنشور على فيسبوك', 'Facebook', 'https://facebook.com/post/example7', 7),
  ('تابع هذا الحساب على تويتر', 'X (Twitter)', 'https://x.com/example8', 8),
  ('شاهد هذا الريل على إنستغرام', 'Instagram', 'https://instagram.com/reel/example9', 9),
  ('أعجب بهذا الفيديو على تيك توك', 'TikTok', 'https://tiktok.com/@example/video/10', 10),
  ('علّق على هذا الفيديو على يوتيوب', 'YouTube', 'https://youtube.com/watch?v=example11', 11),
  ('شارك هذا المنشور على فيسبوك', 'Facebook', 'https://facebook.com/post/example12', 12),
  ('تابع هذه الصفحة على فيسبوك', 'Facebook', 'https://facebook.com/page/example13', 13),
  ('أعجب بهذا المنشور على إنستغرام', 'Instagram', 'https://instagram.com/p/example14', 14),
  ('شاهد هذا البث المباشر على يوتيوب', 'YouTube', 'https://youtube.com/watch?v=example15', 15);

-- Admin user for local development testing
-- Auth user (password: Admin123!)
INSERT INTO auth.users (
  id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
  phone, phone_confirmed_at, confirmation_token, email_change, email_change_token_new,
  recovery_token, banned_until, created_at, updated_at, raw_app_meta_data, raw_user_meta_data
) VALUES (
  'a0000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'admin@temo.local',
  crypt('Admin123!', gen_salt('bf')),
  now(),
  '01000000000',
  now(),
  '',
  '',
  '',
  '',
  NULL,
  now(),
  now(),
  '{"role": "admin"}',
  '{"full_name": "مدير النظام"}'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.users (id, full_name, phone_number, referral_code, role, status)
VALUES (
  'a0000000-0000-0000-0000-000000000001',
  'مدير النظام',
  '01000000000',
  'ADM1N000',
  'admin',
  'active'
) ON CONFLICT (id) DO NOTHING;
