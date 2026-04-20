-- Articles: allow insert + update for own rows
CREATE POLICY "Users can insert own articles"
ON public.articles FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own articles"
ON public.articles FOR UPDATE
USING (auth.uid() = user_id);

-- Helpful index for dedupe lookups
CREATE UNIQUE INDEX IF NOT EXISTS articles_user_url_hash_idx
ON public.articles (user_id, url_hash);

CREATE INDEX IF NOT EXISTS articles_user_relevance_idx
ON public.articles (user_id, relevance_score DESC, fetched_at DESC);