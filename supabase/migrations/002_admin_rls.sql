-- Allow admins to update any profile (e.g. set is_admin)
CREATE POLICY "Admins can update any profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (
  auth.uid() = id
  OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
)
WITH CHECK (
  auth.uid() = id
  OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
);

-- Allow admins to delete any bench
CREATE POLICY "Admins can delete any bench"
ON public.benches
FOR DELETE
TO authenticated
USING (
  auth.uid() = created_by
  OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
);
