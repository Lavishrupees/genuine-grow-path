
-- Enable realtime for chat tables
ALTER TABLE public.chat_messages REPLICA IDENTITY FULL;
ALTER TABLE public.chat_conversations REPLICA IDENTITY FULL;

DO $$ BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
  EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_conversations;
  EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;

-- Allow signed-in users to insert their own conversation without visitor-token header
DROP POLICY IF EXISTS "insert conv anyone" ON public.chat_conversations;
CREATE POLICY "insert conv anyone" ON public.chat_conversations
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    (auth.uid() IS NOT NULL AND user_id = auth.uid())
    OR visitor_token::text = COALESCE(current_setting('request.headers', true)::jsonb->>'x-visitor-token','')
  );
