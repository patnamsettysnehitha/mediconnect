CREATE POLICY "records upload own folder" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'medical-records' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "records read own or treating doctor" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'medical-records' AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR public.is_my_patient(((storage.foldername(name))[1])::uuid)
  ));
CREATE POLICY "records delete own" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'medical-records' AND (storage.foldername(name))[1] = auth.uid()::text);