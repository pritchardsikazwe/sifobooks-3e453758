-- Connector control-plane: server/connector path only (service role). No browser access.
DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['zra_connector_credentials','zra_connector_commands','zra_connector_events'] LOOP
    EXECUTE format('REVOKE ALL ON public.%I FROM anon, authenticated', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
  END LOOP;
END $$;

-- Per-user ZRA business/dictionary tables: owner-only access, no anon.
DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['zra_devices','zra_device_events','zra_item_classes','zra_standard_codes','zra_fiscal_controls','zra_document_corrections','zra_stock_sync_records'] LOOP
    EXECUTE format('REVOKE ALL ON public.%I FROM anon', t);
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS "Owner manages own rows" ON public.%I', t);
    EXECUTE format('CREATE POLICY "Owner manages own rows" ON public.%I FOR ALL TO authenticated USING (user_id = auth.uid()::text) WITH CHECK (user_id = auth.uid()::text)', t);
  END LOOP;
END $$;