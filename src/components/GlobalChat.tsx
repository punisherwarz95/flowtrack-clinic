import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageCircle, X, Send } from "lucide-react";
import { format, isToday, isYesterday } from "date-fns";
import { es } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";

interface ChatMessage {
  id: string;
  user_id: string;
  message: string;
  created_at: string;
  profiles: {
    username: string;
  } | null;
}

interface GlobalChatProps {
  selectedDate?: Date;
}

export function GlobalChat({ selectedDate }: GlobalChatProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Obtener usuario actual
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id || null);
    };
    getUser();
  }, []);

  // Cargar mensajes del día seleccionado
  const loadMessages = async () => {
    const dateToFilter = selectedDate || new Date();
    const startOfDay = new Date(dateToFilter);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(dateToFilter);
    endOfDay.setHours(23, 59, 59, 999);

    const { data, error } = await supabase
      .from("chat_messages")
      .select(`
        id,
        user_id,
        message,
        created_at,
        profiles (
          username
        )
      `)
      .gte("created_at", startOfDay.toISOString())
      .lte("created_at", endOfDay.toISOString())
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error loading messages:", error);
      return;
    }

    setMessages(data || []);
  };

  useEffect(() => {
    loadMessages();

    // Suscripción realtime
    const channel = supabase
      .channel("chat-messages-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages" },
        async (payload) => {
          // Cargar el mensaje nuevo con el join de profiles
          const { data } = await supabase
            .from("chat_messages")
            .select(`
              id,
              user_id,
              message,
              created_at,
              profiles (
                username
              )
            `)
            .eq("id", payload.new.id)
            .single();

          if (data) {
            setMessages((prev) => [...prev, data]);
            
            // Incrementar contador si el chat está cerrado
            if (!isOpen && data.user_id !== currentUserId) {
              setUnreadCount((prev) => prev + 1);
            }
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "chat_messages" },
        (payload) => {
          setMessages((prev) => prev.filter((m) => m.id !== payload.old.id));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedDate, isOpen, currentUserId]);

  // Auto-scroll al final cuando hay nuevos mensajes
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Limpiar contador al abrir
  useEffect(() => {
    if (isOpen) {
      setUnreadCount(0);
    }
  }, [isOpen]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !currentUserId) return;

    setIsLoading(true);
    const { error } = await supabase.from("chat_messages").insert({
      user_id: currentUserId,
      message: newMessage.trim(),
    });

    if (error) {
      console.error("Error sending message:", error);
      toast({
        title: "Error",
        description: "No se pudo enviar el mensaje",
        variant: "destructive",
      });
    } else {
      setNewMessage("");
    }
    setIsLoading(false);
  };

  const formatMessageTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return format(date, "HH:mm", { locale: es });
  };

  const getDateLabel = () => {
    const dateToShow = selectedDate || new Date();
    if (isToday(dateToShow)) return "Hoy";
    if (isYesterday(dateToShow)) return "Ayer";
    return format(dateToShow, "dd MMM yyyy", { locale: es });
  };

  if (!currentUserId) return null;

  return (
    <>
      {/* Botón flotante */}
      <Button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-4 right-4 h-14 w-14 rounded-full shadow-lg z-50"
        size="icon"
      >
        {isOpen ? (
          <X className="h-6 w-6" />
        ) : (
          <>
            <MessageCircle className="h-6 w-6" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-xs rounded-full h-5 w-5 flex items-center justify-center">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </>
        )}
      </Button>

      {/* Panel de chat */}
      {isOpen && (
        <div className="fixed bottom-20 right-4 w-80 h-96 bg-card border rounded-lg shadow-xl z-50 flex flex-col">
          {/* Header */}
          <div className="p-3 border-b bg-muted/50 rounded-t-lg">
            <h3 className="font-semibold text-sm">Chat del Equipo</h3>
            <p className="text-xs text-muted-foreground">{getDateLabel()}</p>
          </div>

          {/* Mensajes */}
          <ScrollArea className="flex-1 p-3" ref={scrollRef}>
            <div className="space-y-3">
              {messages.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-8">
                  No hay mensajes hoy
                </p>
              ) : (
                messages.map((msg) => {
                  const isOwn = msg.user_id === currentUserId;
                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${isOwn ? "items-end" : "items-start"}`}
                    >
                      {!isOwn && (
                        <span className="text-xs text-muted-foreground mb-1">
                          {msg.profiles?.username || "Usuario"}
                        </span>
                      )}
                      <div
                        className={`max-w-[85%] px-3 py-2 rounded-2xl text-sm ${
                          isOwn
                            ? "bg-primary text-primary-foreground rounded-br-md"
                            : "bg-muted rounded-bl-md"
                        }`}
                      >
                        {msg.message}
                      </div>
                      <span className="text-[10px] text-muted-foreground mt-0.5">
                        {formatMessageTime(msg.created_at)}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </ScrollArea>

          {/* Input */}
          <div className="p-3 border-t flex gap-2">
            <Input
              placeholder="Escribe un mensaje..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              className="flex-1 text-sm"
              disabled={isLoading}
            />
            <Button
              size="icon"
              onClick={handleSendMessage}
              disabled={isLoading || !newMessage.trim()}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
