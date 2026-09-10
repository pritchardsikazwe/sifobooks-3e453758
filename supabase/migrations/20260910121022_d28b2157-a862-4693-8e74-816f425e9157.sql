
CREATE TABLE public.hotel_rate_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  branch_id uuid,
  room_type_id uuid REFERENCES public.hotel_room_types(id) ON DELETE CASCADE,
  code text NOT NULL,
  name text NOT NULL,
  nightly_rate numeric NOT NULL DEFAULT 0,
  weekend_rate numeric,
  min_stay integer NOT NULL DEFAULT 1,
  max_occupancy integer,
  extra_adult_rate numeric NOT NULL DEFAULT 0,
  extra_child_rate numeric NOT NULL DEFAULT 0,
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  rate_type text NOT NULL DEFAULT 'standard',
  season_start date,
  season_end date,
  priority integer NOT NULL DEFAULT 0,
  includes text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hotel_rate_plans TO authenticated;
GRANT ALL ON public.hotel_rate_plans TO service_role;
ALTER TABLE public.hotel_rate_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own hotel_rate_plans" ON public.hotel_rate_plans FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_hotel_rate_plans_user ON public.hotel_rate_plans(user_id, active);
CREATE INDEX idx_hotel_rate_plans_type ON public.hotel_rate_plans(room_type_id);
CREATE TRIGGER trg_hotel_rate_plans_updated BEFORE UPDATE ON public.hotel_rate_plans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.hotel_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  branch_id uuid,
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  folio_id uuid REFERENCES public.hotel_folios(id) ON DELETE SET NULL,
  reference text,
  name text NOT NULL,
  venue text,
  event_type text NOT NULL DEFAULT 'conference',
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  guests integer NOT NULL DEFAULT 0,
  package_rate numeric NOT NULL DEFAULT 0,
  package_basis text NOT NULL DEFAULT 'per_person',
  deposit numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'enquiry',
  contact_name text,
  contact_phone text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hotel_events TO authenticated;
GRANT ALL ON public.hotel_events TO service_role;
ALTER TABLE public.hotel_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own hotel_events" ON public.hotel_events FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_hotel_events_user_date ON public.hotel_events(user_id, starts_at);
CREATE TRIGGER trg_hotel_events_updated BEFORE UPDATE ON public.hotel_events
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.hotel_channels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  channel_key text NOT NULL,
  name text NOT NULL,
  status text NOT NULL DEFAULT 'not_connected',
  credentials_present boolean NOT NULL DEFAULT false,
  sync_mode text NOT NULL DEFAULT 'manual',
  commission_rate numeric NOT NULL DEFAULT 0,
  last_sync_at timestamptz,
  last_sync_status text,
  notes text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, channel_key)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hotel_channels TO authenticated;
GRANT ALL ON public.hotel_channels TO service_role;
ALTER TABLE public.hotel_channels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own hotel_channels" ON public.hotel_channels FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_hotel_channels_updated BEFORE UPDATE ON public.hotel_channels
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.hotel_channel_sync_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  channel_id uuid NOT NULL REFERENCES public.hotel_channels(id) ON DELETE CASCADE,
  direction text NOT NULL,
  outcome text NOT NULL,
  message text,
  records_in integer NOT NULL DEFAULT 0,
  records_out integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.hotel_channel_sync_log TO authenticated;
GRANT ALL ON public.hotel_channel_sync_log TO service_role;
ALTER TABLE public.hotel_channel_sync_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own hotel_channel_sync_log select" ON public.hotel_channel_sync_log FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "own hotel_channel_sync_log insert" ON public.hotel_channel_sync_log FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_hotel_channel_sync_log_channel ON public.hotel_channel_sync_log(channel_id, created_at DESC);

CREATE TABLE public.hotel_precheckin_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  reservation_id uuid NOT NULL REFERENCES public.hotel_reservations(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'sent',
  expires_at timestamptz NOT NULL,
  submitted_at timestamptz,
  submitted_details jsonb,
  consent_given boolean NOT NULL DEFAULT false,
  arrival_time text,
  upsells jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hotel_precheckin_links TO authenticated;
GRANT ALL ON public.hotel_precheckin_links TO service_role;
ALTER TABLE public.hotel_precheckin_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own hotel_precheckin_links" ON public.hotel_precheckin_links FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_hotel_precheckin_res ON public.hotel_precheckin_links(reservation_id);
CREATE TRIGGER trg_hotel_precheckin_updated BEFORE UPDATE ON public.hotel_precheckin_links
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
