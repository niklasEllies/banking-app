-- Phase 7.5: Security hardening based on Supabase Advisor findings.

-- 1. Lock search_path on all SECURITY DEFINER helpers (prevents schema-injection).
ALTER FUNCTION public.get_spot_aggregated_stats(uuid) SET search_path = public, pg_catalog;
ALTER FUNCTION public.set_updated_at() SET search_path = public, pg_catalog;
ALTER FUNCTION public.are_friends(uuid, uuid) SET search_path = public, pg_catalog;
ALTER FUNCTION public.can_see_spot(uuid) SET search_path = public, pg_catalog;
ALTER FUNCTION public.handle_new_user() SET search_path = public, pg_catalog;

-- 2. handle_new_user() is meant for the auth trigger only; revoke direct RPC access.
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, public;

-- 3. Switch get_spot_aggregated_stats to SECURITY INVOKER. With Phase 6 RLS cascade
-- on spot_stats_votes (gated via can_see_spot), this is the safer default — the
-- function now respects the caller's visibility instead of blindly returning data.
ALTER FUNCTION public.get_spot_aggregated_stats(uuid) SECURITY INVOKER;

-- 4. Drop the broad public SELECT policy on bench-photos. Public buckets serve
-- files via direct CDN URL without needing SELECT on storage.objects — the
-- policy was only enabling LIST operations, which leaked the file structure.
DROP POLICY "bench-photos: public read" ON storage.objects;
