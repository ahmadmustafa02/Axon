CREATE POLICY "Users can insert own briefings"
ON public.briefings
FOR INSERT
TO public
WITH CHECK (auth.uid() = user_id);