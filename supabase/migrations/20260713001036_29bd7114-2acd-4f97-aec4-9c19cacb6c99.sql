
-- Chat conversations (visitors + signed-in users)
CREATE TABLE public.chat_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  visitor_name text NOT NULL,
  visitor_email text NOT NULL,
  visitor_token uuid NOT NULL DEFAULT gen_random_uuid(),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','resolved')),
  is_offline boolean NOT NULL DEFAULT false,
  last_message_at timestamptz NOT NULL DEFAULT now(),
  last_message_preview text,
  unread_admin int NOT NULL DEFAULT 0,
  unread_user int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX chat_conv_last_msg_idx ON public.chat_conversations (last_message_at DESC);
CREATE INDEX chat_conv_user_idx ON public.chat_conversations (user_id);
CREATE INDEX chat_conv_token_idx ON public.chat_conversations (visitor_token);
CREATE INDEX chat_conv_status_idx ON public.chat_conversations (status);

GRANT SELECT, INSERT, UPDATE ON public.chat_conversations TO authenticated, anon;
GRANT ALL ON public.chat_conversations TO service_role;
ALTER TABLE public.chat_conversations ENABLE ROW LEVEL SECURITY;

-- Extend chat_messages
DELETE FROM public.chat_messages;
DROP POLICY IF EXISTS "admins insert chat" ON public.chat_messages;
DROP POLICY IF EXISTS "admins read all chat" ON public.chat_messages;
DROP POLICY IF EXISTS "users insert own chat" ON public.chat_messages;
DROP POLICY IF EXISTS "users read own chat" ON public.chat_messages;

ALTER TABLE public.chat_messages
  ADD COLUMN conversation_id uuid REFERENCES public.chat_conversations(id) ON DELETE CASCADE NOT NULL,
  ADD COLUMN delivered_at timestamptz,
  ADD COLUMN seen_at timestamptz,
  ALTER COLUMN user_id DROP NOT NULL;

ALTER TABLE public.chat_messages DROP CONSTRAINT chat_messages_sender_check;
ALTER TABLE public.chat_messages ADD CONSTRAINT chat_messages_sender_check CHECK (sender IN ('user','agent','system'));
CREATE INDEX chat_msg_conv_idx ON public.chat_messages (conversation_id, created_at);
GRANT SELECT, INSERT, UPDATE ON public.chat_messages TO authenticated, anon;
GRANT ALL ON public.chat_messages TO service_role;

-- Access helper
CREATE OR REPLACE FUNCTION public.can_access_conversation(_cid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, app_private AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.chat_conversations c
    WHERE c.id = _cid AND (
      app_private.has_role(auth.uid(), 'admin'::app_role)
      OR (auth.uid() IS NOT NULL AND c.user_id = auth.uid())
      OR (c.visitor_token::text = COALESCE(current_setting('request.headers', true)::jsonb->>'x-visitor-token',''))
    )
  );
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, app_private AS $$
  SELECT app_private.has_role(auth.uid(), 'admin'::app_role);
$$;

-- Conversations RLS
CREATE POLICY "admin all conv" ON public.chat_conversations
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "owner select conv" ON public.chat_conversations
  FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL AND user_id = auth.uid());
CREATE POLICY "visitor select conv" ON public.chat_conversations
  FOR SELECT TO anon, authenticated
  USING (visitor_token::text = COALESCE(current_setting('request.headers', true)::jsonb->>'x-visitor-token',''));
CREATE POLICY "insert conv anyone" ON public.chat_conversations
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    visitor_token::text = COALESCE(current_setting('request.headers', true)::jsonb->>'x-visitor-token','')
    AND (user_id IS NULL OR user_id = auth.uid())
  );

-- Messages RLS
CREATE POLICY "select msgs by access" ON public.chat_messages
  FOR SELECT TO anon, authenticated USING (public.can_access_conversation(conversation_id));
CREATE POLICY "insert msgs by access" ON public.chat_messages
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    public.can_access_conversation(conversation_id)
    AND (
      (sender = 'agent' AND public.is_admin())
      OR (sender = 'user' AND NOT public.is_admin())
      OR (sender = 'system')
    )
  );
CREATE POLICY "update msgs by access" ON public.chat_messages
  FOR UPDATE TO anon, authenticated USING (public.can_access_conversation(conversation_id));

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
CREATE TRIGGER chat_conv_updated BEFORE UPDATE ON public.chat_conversations
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- On new message: bump conversation, unread counts, preview
CREATE OR REPLACE FUNCTION public.on_new_chat_message() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.chat_conversations SET
    last_message_at = NEW.created_at,
    last_message_preview = LEFT(NEW.body, 140),
    unread_admin = CASE WHEN NEW.sender = 'user' THEN unread_admin + 1 ELSE unread_admin END,
    unread_user  = CASE WHEN NEW.sender = 'agent' THEN unread_user + 1 ELSE unread_user END,
    status = CASE WHEN status = 'resolved' AND NEW.sender = 'user' THEN 'open' ELSE status END
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END; $$;
CREATE TRIGGER chat_msg_after_insert AFTER INSERT ON public.chat_messages
FOR EACH ROW EXECUTE FUNCTION public.on_new_chat_message();

-- Mark conversation read RPCs
CREATE OR REPLACE FUNCTION public.chat_mark_read_admin(_cid uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'forbidden'; END IF;
  UPDATE public.chat_conversations SET unread_admin = 0 WHERE id = _cid;
  UPDATE public.chat_messages SET seen_at = now()
    WHERE conversation_id = _cid AND sender = 'user' AND seen_at IS NULL;
END; $$;
GRANT EXECUTE ON FUNCTION public.chat_mark_read_admin(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.chat_mark_read_visitor(_cid uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.can_access_conversation(_cid) THEN RAISE EXCEPTION 'forbidden'; END IF;
  UPDATE public.chat_conversations SET unread_user = 0 WHERE id = _cid;
  UPDATE public.chat_messages SET seen_at = now()
    WHERE conversation_id = _cid AND sender = 'agent' AND seen_at IS NULL;
END; $$;
GRANT EXECUTE ON FUNCTION public.chat_mark_read_visitor(uuid) TO authenticated, anon;

CREATE OR REPLACE FUNCTION public.chat_set_status(_cid uuid, _status text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF _status NOT IN ('open','resolved') THEN RAISE EXCEPTION 'bad status'; END IF;
  UPDATE public.chat_conversations SET status = _status WHERE id = _cid;
END; $$;
GRANT EXECUTE ON FUNCTION public.chat_set_status(uuid, text) TO authenticated;

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_conversations;
