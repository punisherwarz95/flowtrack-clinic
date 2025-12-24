-- Tabla para mensajes del chat global
CREATE TABLE public.chat_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índice para búsqueda por fecha
CREATE INDEX idx_chat_messages_created_at ON public.chat_messages(created_at DESC);

-- Habilitar RLS
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Políticas: usuarios autenticados pueden leer todos los mensajes
CREATE POLICY "Usuarios autenticados pueden leer mensajes"
ON public.chat_messages
FOR SELECT
TO authenticated
USING (true);

-- Usuarios autenticados pueden crear mensajes con su propio user_id
CREATE POLICY "Usuarios pueden crear sus mensajes"
ON public.chat_messages
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Usuarios pueden eliminar sus propios mensajes
CREATE POLICY "Usuarios pueden eliminar sus mensajes"
ON public.chat_messages
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Habilitar realtime para esta tabla
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;