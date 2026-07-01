import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { AnimatePresence, motion } from "framer-motion";
import { MessageCircle, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Conversation, ConversationContent, ConversationScrollButton } from "@/components/ai-elements/conversation";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import { PromptInput, PromptInputFooter, PromptInputSubmit, PromptInputTextarea } from "@/components/ai-elements/prompt-input";
import { Shimmer } from "@/components/ai-elements/shimmer";

const STORAGE_KEY = "mcf-chat-messages-v1";
const CHAT_ID = "mcf-concierge";

function loadMessages(): UIMessage[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as UIMessage[]) : [];
  } catch {
    return [];
  }
}

const WELCOME: UIMessage = {
  id: "welcome",
  role: "assistant",
  parts: [
    {
      type: "text",
      text:
        "Sawubona! I'm **Nomsa**, your Mthetho's concierge. Ask me about today's specials, menu picks, ingredients, or how to place an order.",
    },
  ],
} as UIMessage;

export function ChatbotWidget() {
  const [open, setOpen] = useState(false);
  const [initial, setInitial] = useState<UIMessage[] | null>(null);

  useEffect(() => {
    const stored = loadMessages();
    setInitial(stored.length ? stored : [WELCOME]);
  }, []);

  const { messages, sendMessage, status } = useChat({
    id: CHAT_ID,
    messages: initial ?? [WELCOME],
    transport: new DefaultChatTransport({ api: "/api/chat" }),
    onError: (e) => console.error("chat error", e),
  });

  useEffect(() => {
    if (!initial) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    } catch {
      /* ignore */
    }
  }, [messages, initial]);

  const busy = status === "submitted" || status === "streaming";

  const handleSubmit = (message: { text: string }) => {
    const text = message.text.trim();
    if (!text || busy) return;
    sendMessage({ text });
  };

  const clearChat = () => {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
    window.location.reload();
  };

  return (
    <>
      <motion.button
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.5, type: "spring" }}
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Close chat" : "Open chat"}
        className="glow-gold fixed bottom-20 right-4 z-50 grid h-14 w-14 place-items-center rounded-full bg-gold text-background shadow-2xl transition-transform hover:scale-110 md:bottom-6 md:right-6"
      >
        <AnimatePresence mode="wait">
          {open ? (
            <motion.span key="x" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }}>
              <X className="h-6 w-6" />
            </motion.span>
          ) : (
            <motion.span key="m" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }}>
              <MessageCircle className="h-6 w-6" />
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 300, damping: 28 }}
            className="fixed inset-x-2 bottom-36 z-50 mx-auto flex max-h-[70vh] w-auto max-w-md flex-col overflow-hidden rounded-2xl border border-gold/30 bg-background shadow-2xl md:bottom-24 md:right-6 md:left-auto md:mx-0 md:w-96"
          >
            <div className="flex items-center justify-between gap-3 border-b border-border/60 bg-card/60 px-4 py-3">
              <div className="flex items-center gap-2">
                <div className="gold-gradient grid h-8 w-8 place-items-center rounded-full font-display text-sm font-bold text-background">
                  N
                </div>
                <div>
                  <div className="text-sm font-semibold leading-tight">Nomsa</div>
                  <div className="text-[10px] uppercase tracking-widest text-gold">AI Concierge</div>
                </div>
              </div>
              <button
                onClick={clearChat}
                className="text-[11px] text-muted-foreground hover:text-gold"
                aria-label="Clear chat"
              >
                Clear
              </button>
            </div>

            <Conversation className="flex-1 bg-background">
              <ConversationContent className="space-y-3">
                {messages.map((m) => (
                  <Message from={m.role} key={m.id}>
                    <MessageContent>
                      {m.parts.map((p, i) =>
                        p.type === "text" ? <MessageResponse key={i}>{p.text}</MessageResponse> : null,
                      )}
                    </MessageContent>
                  </Message>
                ))}
                {status === "submitted" && (
                  <Message from="assistant">
                    <MessageContent>
                      <Shimmer>Thinking…</Shimmer>
                    </MessageContent>
                  </Message>
                )}
              </ConversationContent>
              <ConversationScrollButton />
            </Conversation>

            <PromptInput onSubmit={handleSubmit} className="border-t border-border/60">
              <PromptInputTextarea placeholder="Ask about the menu, specials, orders…" />
              <PromptInputFooter className="justify-end">
                <PromptInputSubmit status={status} disabled={busy} />
              </PromptInputFooter>
            </PromptInput>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
