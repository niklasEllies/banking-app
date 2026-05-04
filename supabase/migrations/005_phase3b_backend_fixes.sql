-- Phase 3b: Add missing DELETE policy for bench_stats_votes
-- Users could not previously delete their own votes.

CREATE POLICY "Users can delete own votes"
  ON bench_stats_votes
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
