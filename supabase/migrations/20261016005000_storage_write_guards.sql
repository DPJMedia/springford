-- Compatible with existing upload paths. Public media reads stay available.
-- Apply after security_foundations; before or after the application release.
BEGIN;
DO $$ DECLARE p record; BEGIN
 FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='storage' AND tablename='objects'
 AND (policyname LIKE 'avatar access %' OR policyname LIKE 'avatar customization %'
 OR policyname LIKE 'Give anon users access to JPG images in folder %'
 OR policyname IN ('Authenticated users can delete ads','Authenticated users can update ads',
 'Authenticated users can upload ads','author-images service write')) LOOP
 EXECUTE format('DROP POLICY %I ON storage.objects',p.policyname);
 END LOOP;
END $$;
CREATE POLICY "avatar owner insert" ON storage.objects FOR INSERT TO authenticated WITH CHECK (
 bucket_id='avatars' AND (app_private.is_super_admin() OR name LIKE auth.uid()::text || '-%'));
CREATE POLICY "avatar owner update" ON storage.objects FOR UPDATE TO authenticated USING (
 bucket_id='avatars' AND (app_private.is_super_admin() OR owner_id=auth.uid()::text OR name LIKE auth.uid()::text || '-%')) WITH CHECK (
 bucket_id='avatars' AND (app_private.is_super_admin() OR owner_id=auth.uid()::text OR name LIKE auth.uid()::text || '-%'));
CREATE POLICY "avatar owner delete" ON storage.objects FOR DELETE TO authenticated USING (
 bucket_id='avatars' AND (app_private.is_super_admin() OR owner_id=auth.uid()::text OR name LIKE auth.uid()::text || '-%'));
CREATE POLICY "ad media verified super admin" ON storage.objects FOR ALL TO authenticated USING (
 bucket_id='ads' AND app_private.is_super_admin()) WITH CHECK (bucket_id='ads' AND app_private.is_super_admin());
-- Author uploads already use the server's authenticated publication checks and service role.
NOTIFY pgrst, 'reload schema';
COMMIT;
