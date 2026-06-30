
-- ============ ENUMS ============
CREATE TYPE public.app_role AS ENUM ('admin','driver','customer');
CREATE TYPE public.order_status AS ENUM ('placed','preparing','out_for_delivery','delivered','cancelled');

-- ============ PROFILES ============
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  phone TEXT,
  default_address TEXT,
  default_lat DOUBLE PRECISION,
  default_lng DOUBLE PRECISION,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- ============ ROLES ============
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "roles_select_own" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- Admins can see and manage all roles
CREATE POLICY "roles_admin_all" ON public.user_roles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- ============ SIGNUP TRIGGER ============
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email,'@',1)),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'customer');
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============ CATEGORIES & MENU ============
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  sort_order INT NOT NULL DEFAULT 0
);
GRANT SELECT ON public.categories TO anon, authenticated;
GRANT ALL ON public.categories TO service_role;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "categories_public_read" ON public.categories FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "categories_admin_write" ON public.categories FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.menu_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC(10,2) NOT NULL CHECK (price >= 0),
  image_url TEXT,
  is_available BOOLEAN NOT NULL DEFAULT true,
  is_featured BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.menu_items TO anon, authenticated;
GRANT ALL ON public.menu_items TO service_role;
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "menu_public_read" ON public.menu_items FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "menu_admin_write" ON public.menu_items FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.weekly_specials (
  day_of_week INT PRIMARY KEY CHECK (day_of_week BETWEEN 0 AND 6),
  menu_item_id UUID REFERENCES public.menu_items(id) ON DELETE SET NULL,
  note TEXT
);
GRANT SELECT ON public.weekly_specials TO anon, authenticated;
GRANT ALL ON public.weekly_specials TO service_role;
ALTER TABLE public.weekly_specials ENABLE ROW LEVEL SECURITY;
CREATE POLICY "specials_public_read" ON public.weekly_specials FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "specials_admin_write" ON public.weekly_specials FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- ============ ORDERS ============
CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status public.order_status NOT NULL DEFAULT 'placed',
  subtotal NUMERIC(10,2) NOT NULL DEFAULT 0,
  delivery_fee NUMERIC(10,2) NOT NULL DEFAULT 0,
  total NUMERIC(10,2) NOT NULL DEFAULT 0,
  address TEXT,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  notes TEXT,
  eta_at TIMESTAMPTZ,
  driver_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  is_demo BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.orders TO authenticated;
GRANT ALL ON public.orders TO service_role;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "orders_select_own" ON public.orders FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin') OR auth.uid() = driver_id);
CREATE POLICY "orders_insert_own" ON public.orders FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "orders_admin_update" ON public.orders FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR auth.uid() = driver_id);

CREATE TABLE public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  menu_item_id UUID REFERENCES public.menu_items(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  qty INT NOT NULL CHECK (qty > 0),
  unit_price NUMERIC(10,2) NOT NULL,
  notes TEXT
);
GRANT SELECT, INSERT ON public.order_items TO authenticated;
GRANT ALL ON public.order_items TO service_role;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "order_items_select" ON public.order_items FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND (o.user_id = auth.uid() OR public.has_role(auth.uid(),'admin') OR o.driver_id = auth.uid()))
);
CREATE POLICY "order_items_insert_own" ON public.order_items FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND o.user_id = auth.uid())
);

-- ============ DRIVER LOCATIONS ============
CREATE TABLE public.driver_locations (
  driver_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  heading DOUBLE PRECISION,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.driver_locations TO authenticated;
GRANT ALL ON public.driver_locations TO service_role;
ALTER TABLE public.driver_locations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "driver_locations_select" ON public.driver_locations FOR SELECT TO authenticated USING (
  driver_id = auth.uid()
  OR public.has_role(auth.uid(),'admin')
  OR EXISTS (SELECT 1 FROM public.orders o WHERE o.driver_id = driver_locations.driver_id AND o.user_id = auth.uid() AND o.status IN ('out_for_delivery','preparing'))
);
CREATE POLICY "driver_locations_upsert_own" ON public.driver_locations FOR INSERT TO authenticated WITH CHECK (driver_id = auth.uid());
CREATE POLICY "driver_locations_update_own" ON public.driver_locations FOR UPDATE TO authenticated USING (driver_id = auth.uid());

-- ============ NOTIFICATIONS ============
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT,
  link TEXT,
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notifs_select_own" ON public.notifications FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "notifs_update_own" ON public.notifications FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- Trigger: notify on status change
CREATE OR REPLACE FUNCTION public.notify_on_status_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.notifications (user_id, title, body, link)
    VALUES (
      NEW.user_id,
      CASE NEW.status
        WHEN 'preparing' THEN 'Your order is being prepared'
        WHEN 'out_for_delivery' THEN 'Your order is on the way'
        WHEN 'delivered' THEN 'Order delivered — enjoy!'
        WHEN 'cancelled' THEN 'Your order was cancelled'
        ELSE 'Order update'
      END,
      'Order #' || substr(NEW.id::text,1,8),
      '/orders/' || NEW.id::text
    );
  END IF;
  NEW.updated_at = now();
  RETURN NEW;
END; $$;

CREATE TRIGGER orders_status_change AFTER UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_status_change();

CREATE TRIGGER orders_touch_updated BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_status_change();

-- ============ REALTIME ============
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.driver_locations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
