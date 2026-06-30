
ALTER TABLE public.orders ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE public.orders ADD CONSTRAINT orders_user_or_demo CHECK (user_id IS NOT NULL OR is_demo = true);
