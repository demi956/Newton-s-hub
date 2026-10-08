import { Link, useRouterState } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ArrowUp, ChevronDown, MessageCircle, RotateCcw, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from "react";
import avatar from "@/assets/assistant-128.webp";
import avatarLarge from "@/assets/assistant-320.webp";
import { askAssistant } from "@/lib/assistant.functions";
import { BUSINESS, whatsappLink } from "@/lib/business";
import { cn } from "@/lib/utils";

type Product = {
  slug: string;
  name: string;
  price: string;
  availability: string;
  image: string;
  purchasable: boolean;
};
type ChatLink = { label: string; to: string };
type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  products?: Product[];
  links?: ChatLink[];
  handoff?: boolean;
  /** Local-only messages (greeting, errors) are never sent to the model. */
  local?: boolean;
  error?: boolean;
};

type Phase = "idle" | "welcome" | "minimizing" | "closed" | "open";

const WELCOMED_KEY = "nh-ai-welcomed";
const CHAT_KEY = "nh-ai-chat-v1";
const WELCOME_DELAY = 1400; // let the page settle before she appears
const TYPING_MS = 2200; // "typing…" before the message is revealed
const WELCOME_VISIBLE_MS = 7500; // full welcome stays readable this long

const GREETING: Message = {
  id: "greeting",
  role: "assistant",
  local: true,
  content:
    "Hi there! 👋 Welcome to Newton's Hub. I'm Newton's AI, your virtual shopping assistant. Looking for a new gadget, accessories or something special? I'm here to help. 💜",
};

const QUICK = [
  { label: "🛍️ Help me find a product", text: "Help me find a product." },
  { label: "📱 Show me available phones", text: "Show me available phones." },
  { label: "🎧 Recommend accessories", text: "Recommend some good accessories." },
  { label: "💰 What can I buy with my budget?", text: "I have GH₵150. What can I buy?" },
  { label: "🔄 How does Buy/Sell/Swap work?", text: "How does Buy/Sell/Swap work?" },
  { label: "📶 Help with data bundles", text: "Help me with data bundles." },
  { label: "🚚 Delivery and pickup", text: "What are your delivery and pickup options?" },
  { label: "💬 Contact customer support", text: "I'd like to talk to customer support." },
];

const uid = () => Math.random().toString(36).slice(2, 10);

function readSession<T>(key: string, fallback: T): T {
  try {
    const raw = sessionStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
function writeSession(key: string, value: unknown) {
  try {
    sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* private mode: chat still works for this page */
  }
}

export function FloatingDock() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const hidden = pathname.startsWith("/admin");
  // Product pages have a sticky purchase bar on phones; float above it.
  const lifted = /^\/shop\/[^/]+/.test(pathname);
  const ask = useServerFn(askAssistant);

  const [phase, setPhase] = useState<Phase>("idle");
  const [welcomeTyping, setWelcomeTyping] = useState(true);
  const [messages, setMessages] = useState<Message[]>([GREETING]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const [unread, setUnread] = useState(false);
  const pausedRef = useRef(false);
  const timers = useRef<number[]>([]);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const launcherRef = useRef<HTMLButtonElement>(null);

  // Restore an in-progress conversation, and decide whether to play the welcome.
  useEffect(() => {
    const saved = readSession<Message[]>(CHAT_KEY, []);
    if (saved.length) setMessages(saved);
    if (readSession<boolean>(WELCOMED_KEY, false) || hidden) {
      setPhase("closed");
      return;
    }
    writeSession(WELCOMED_KEY, true);
    const t1 = window.setTimeout(() => setPhase("welcome"), WELCOME_DELAY);
    const t2 = window.setTimeout(() => setWelcomeTyping(false), WELCOME_DELAY + TYPING_MS);
    const pending = [t1, t2];
    timers.current.push(...pending);
    return () => pending.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-minimise the welcome once it has been readable for a while (paused on hover/focus).
  useEffect(() => {
    if (phase !== "welcome") return;
    let elapsed = 0;
    const tick = window.setInterval(() => {
      if (pausedRef.current || document.hidden) return;
      elapsed += 250;
      if (elapsed >= WELCOME_VISIBLE_MS) minimizeWelcome();
    }, 250);
    return () => window.clearInterval(tick);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  useEffect(() => {
    writeSession(
      CHAT_KEY,
      messages.filter((m) => m.id !== "greeting" && !m.error),
    );
  }, [messages]);

  useEffect(() => {
    if (phase !== "open") return;
    const el = listRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages, pending, phase]);

  // Small screens use a full-screen chat, so stop the page behind it from scrolling.
  useEffect(() => {
    if (phase !== "open" || window.matchMedia("(min-width: 640px)").matches) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [phase]);

  const minimizeWelcome = useCallback(() => {
    setPhase((p) => (p === "welcome" ? "minimizing" : p));
    window.setTimeout(() => setPhase((p) => (p === "minimizing" ? "closed" : p)), 420);
  }, []);

  const openChat = useCallback(() => {
    setPhase("open");
    setUnread(false);
    window.setTimeout(() => inputRef.current?.focus({ preventScroll: true }), 220);
  }, []);

  const closeChat = useCallback(() => {
    setPhase("closed");
    window.setTimeout(() => launcherRef.current?.focus(), 50);
  }, []);

  const send = useCallback(
    async (text: string) => {
      const content = text.trim().slice(0, 600);
      if (!content || pending) return;
      const userMsg: Message = { id: uid(), role: "user", content };
      const history = [...messages.filter((m) => !m.local && !m.error), userMsg];
      setMessages((prev) => [...prev.filter((m) => !m.error), userMsg]);
      setInput("");
      setPending(true);
      try {
        const res = await ask({
          data: { messages: history.map(({ role, content: c }) => ({ role, content: c })) },
        });
        setMessages((prev) => [
          ...prev,
          {
            id: uid(),
            role: "assistant",
            content: res.reply,
            products: res.products,
            links: res.links,
            handoff: res.handoff,
          },
        ]);
        if (phase !== "open") setUnread(true);
      } catch {
        setMessages((prev) => [
          ...prev,
          {
            id: uid(),
            role: "assistant",
            local: true,
            error: true,
            content:
              "I couldn't connect just now. Check your internet and try again, or message the team on WhatsApp.",
            handoff: true,
          },
        ]);
      } finally {
        setPending(false);
      }
    },
    [ask, messages, pending, phase],
  );

  const retry = () => {
    const lastUser = [...messages].reverse().find((m) => m.role === "user");
    if (!lastUser) return;
    setMessages((prev) => prev.filter((m) => !m.error && m.id !== lastUser.id));
    void send(lastUser.content);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      void send(input);
    }
  };

  const restart = () => {
    setMessages([GREETING]);
    writeSession(CHAT_KEY, []);
    inputRef.current?.focus();
  };

  if (hidden) return null;

  const lastQuestion = [...messages].reverse().find((m) => m.role === "user")?.content;
  const showQuick = messages.filter((m) => !m.local).length === 0;

  return (
    <>
      {/* Welcome introduction */}
      {(phase === "welcome" || phase === "minimizing") && (
        <div
          role="status"
          aria-live="polite"
          onMouseEnter={() => (pausedRef.current = true)}
          onMouseLeave={() => (pausedRef.current = false)}
          onFocus={() => (pausedRef.current = true)}
          onBlur={() => (pausedRef.current = false)}
          className={cn(
            "fixed bottom-[calc(5.25rem+env(safe-area-inset-bottom))] right-3 z-50 w-[min(22rem,calc(100vw-1.5rem))] origin-bottom-right sm:right-6",
            lifted && "max-md:bottom-[calc(9.75rem+env(safe-area-inset-bottom))]",
            "transition-[opacity,transform] duration-[420ms] ease-[cubic-bezier(0.4,0,0.2,1)]",
            phase === "minimizing"
              ? "translate-x-3 translate-y-10 scale-[0.2] opacity-0"
              : "animate-in fade-in zoom-in-90 slide-in-from-bottom-4 duration-500",
          )}
        >
          <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-[#0d1c2b]/95 p-4 shadow-[0_30px_60px_-20px_rgb(0_0_0/0.8)] backdrop-blur-xl">
            <div className="spectrum-line absolute inset-x-0 top-0 h-0.5" aria-hidden />
            <button
              type="button"
              onClick={minimizeWelcome}
              aria-label="Dismiss welcome message"
              className="absolute right-2 top-2 flex size-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-white/5 hover:text-foreground"
            >
              <X className="size-4" />
            </button>
            <div className="flex items-start gap-3 pr-6">
              <span className="relative shrink-0">
                <img
                  src={avatarLarge}
                  alt="Newton's AI, your shopping assistant"
                  width={56}
                  height={56}
                  className="size-14 rounded-2xl object-cover"
                />
                <span
                  className="absolute -bottom-0.5 -right-0.5 size-3.5 rounded-full border-2 border-[#0d1c2b] bg-success"
                  aria-hidden
                />
              </span>
              <div className="min-w-0 pt-0.5">
                <p className="font-display text-sm font-semibold">Newton&apos;s AI</p>
                <p className="text-xs text-muted-foreground">Virtual shopping assistant</p>
              </div>
            </div>
            <div className="mt-3 min-h-[4.5rem] text-sm leading-relaxed">
              {welcomeTyping ? (
                <TypingDots label="Newton's AI is typing" />
              ) : (
                <p className="animate-in fade-in slide-in-from-bottom-1 duration-500">
                  {GREETING.content}
                </p>
              )}
            </div>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={openChat}
                className="flex-1 rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-[filter,transform] hover:brightness-110 active:scale-[0.98]"
              >
                Chat with me
              </button>
              <button
                type="button"
                onClick={minimizeWelcome}
                className="rounded-full border border-border px-4 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                Later
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Chat window */}
      {phase === "open" && (
        <section
          role="dialog"
          aria-label="Chat with Newton's AI"
          onKeyDown={(e) => e.key === "Escape" && closeChat()}
          className={cn(
            "fixed z-50 flex flex-col overflow-hidden bg-[#0a1724] shadow-[0_40px_80px_-24px_rgb(0_0_0/0.85)]",
            "inset-0 sm:inset-auto sm:bottom-[calc(5.25rem+env(safe-area-inset-bottom))] sm:right-6 sm:h-[min(40rem,calc(100dvh-7.5rem))] sm:w-[25rem] sm:rounded-3xl sm:border sm:border-white/10",
            "origin-bottom-right animate-in fade-in zoom-in-95 slide-in-from-bottom-6 duration-300",
          )}
        >
          <header className="relative flex items-center gap-3 border-b border-white/5 bg-[#0d1c2b] px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
            <div
              className="spectrum-line absolute inset-x-0 bottom-0 h-px opacity-40"
              aria-hidden
            />
            <img
              src={avatar}
              alt=""
              width={40}
              height={40}
              className="size-10 rounded-xl object-cover"
            />
            <div className="min-w-0 flex-1">
              <h2 className="font-display text-[15px] font-semibold">Newton&apos;s AI</h2>
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className="size-1.5 rounded-full bg-success" aria-hidden /> Shopping assistant
                · replies instantly
              </p>
            </div>
            <button
              type="button"
              onClick={restart}
              aria-label="Start a new conversation"
              title="New conversation"
              className="flex size-10 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-white/5 hover:text-foreground"
            >
              <RotateCcw className="size-4" />
            </button>
            <button
              type="button"
              onClick={closeChat}
              aria-label="Minimise chat"
              className="flex size-10 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-white/5 hover:text-foreground"
            >
              <ChevronDown className="size-5" />
            </button>
          </header>

          <div
            ref={listRef}
            aria-live="polite"
            className="flex-1 space-y-3 overflow-y-auto overscroll-contain px-4 py-4"
          >
            {messages.map((m) => (
              <Bubble
                key={m.id}
                message={m}
                lastQuestion={lastQuestion}
                onRetry={m.error ? retry : undefined}
                onNavigate={() => window.matchMedia("(max-width: 639px)").matches && closeChat()}
              />
            ))}
            {showQuick && (
              <div className="flex flex-wrap gap-2 pt-1">
                {QUICK.map((q) => (
                  <button
                    key={q.label}
                    type="button"
                    onClick={() => void send(q.text)}
                    className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-2 text-left text-[13px] transition-colors hover:border-primary/50 hover:bg-primary/10 active:scale-[0.98]"
                  >
                    {q.label}
                  </button>
                ))}
              </div>
            )}
            {pending && (
              <div className="flex items-end gap-2">
                <img src={avatar} alt="" className="size-7 rounded-lg object-cover" />
                <div className="rounded-2xl rounded-bl-md bg-[#132538] px-4 py-3">
                  <TypingDots label="Newton's AI is typing" />
                </div>
              </div>
            )}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              void send(input);
            }}
            className="border-t border-white/5 bg-[#0d1c2b] p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
          >
            <div className="flex items-end gap-2 rounded-2xl border border-white/10 bg-background/60 p-1.5 pl-3.5 focus-within:border-primary/60">
              <label htmlFor="nh-ai-input" className="sr-only">
                Message Newton&apos;s AI
              </label>
              <textarea
                id="nh-ai-input"
                ref={inputRef}
                rows={1}
                value={input}
                maxLength={600}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder="Ask about products, prices, swaps…"
                className="max-h-28 min-h-[2.5rem] flex-1 resize-none bg-transparent py-2 text-[15px] outline-none placeholder:text-muted-foreground"
              />
              <button
                type="submit"
                disabled={!input.trim() || pending}
                aria-label="Send message"
                className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground transition-[opacity,transform] active:scale-90 disabled:opacity-40"
              >
                <ArrowUp className="size-5" />
              </button>
            </div>
            <p className="mt-2 text-center text-[11px] text-muted-foreground">
              Answers use Newton&apos;s Hub&apos;s live catalog. Confirm final details with the
              shop.
            </p>
          </form>
        </section>
      )}

      {/* Floating action group: WhatsApp above, assistant below. Never overlaps. */}
      <div
        className={cn(
          "fixed bottom-[calc(1rem+env(safe-area-inset-bottom))] right-3 z-40 flex flex-col items-end gap-2.5 sm:right-6 sm:gap-3",
          lifted && "max-md:bottom-[calc(5.5rem+env(safe-area-inset-bottom))]",
          phase === "open" && "max-sm:hidden",
        )}
      >
        <a
          href={whatsappLink(`Hello ${BUSINESS.name}, I have a question.`)}
          target="_blank"
          rel="noreferrer"
          aria-label="Chat with Newton's Hub on WhatsApp"
          className="group flex size-11 items-center justify-center rounded-full bg-whatsapp sm:size-12 text-white shadow-[0_10px_25px_-8px_rgb(37_211_102/0.6)] transition-transform hover:scale-105 active:scale-95"
        >
          <WhatsAppGlyph className="size-6" />
        </a>
        <button
          ref={launcherRef}
          type="button"
          onClick={() => (phase === "open" ? closeChat() : openChat())}
          aria-label={
            phase === "open" ? "Minimise Newton's AI chat" : "Open Newton's AI shopping assistant"
          }
          aria-expanded={phase === "open"}
          className={cn(
            "group relative flex size-14 items-center sm:size-[3.75rem] justify-center rounded-full p-[3px] shadow-[0_14px_30px_-10px_rgb(0_0_0/0.8)] transition-transform hover:scale-105 active:scale-95",
            phase === "minimizing" && "animate-bump",
          )}
          style={{
            background:
              "conic-gradient(from 200deg, #2e9bf0, #8b5cf6, #e83f9a, #f7882f, #f6c21c, #3ccb6e, #2e9bf0)",
          }}
        >
          <span className="relative flex size-full items-center justify-center overflow-hidden rounded-full bg-background">
            {phase === "open" ? (
              <ChevronDown className="size-6" />
            ) : (
              <img src={avatar} alt="" width={54} height={54} className="size-full object-cover" />
            )}
          </span>
          {unread && phase !== "open" && (
            <span
              className="absolute right-0 top-0 size-3.5 rounded-full border-2 border-background bg-hub-magenta"
              aria-label="New message"
            />
          )}
          {phase === "closed" && (
            <span className="pointer-events-none absolute right-full mr-3 hidden whitespace-nowrap rounded-full bg-[#0d1c2b] px-3 py-1.5 text-xs font-medium opacity-0 shadow-lg transition-opacity group-hover:opacity-100 md:block">
              Ask Newton&apos;s AI
            </span>
          )}
        </button>
      </div>
    </>
  );
}

function Bubble({
  message,
  lastQuestion,
  onRetry,
  onNavigate,
}: {
  message: Message;
  lastQuestion?: string | undefined;
  onRetry?: (() => void) | undefined;
  onNavigate: () => void;
}) {
  if (message.role === "user") {
    return (
      <div className="flex justify-end animate-in fade-in slide-in-from-bottom-1 duration-300">
        <p className="max-w-[85%] whitespace-pre-line rounded-2xl rounded-br-md bg-primary px-3.5 py-2.5 text-[14px] leading-relaxed text-primary-foreground">
          {message.content}
        </p>
      </div>
    );
  }
  return (
    <div className="flex items-end gap-2 animate-in fade-in slide-in-from-bottom-1 duration-300">
      <img src={avatar} alt="" className="size-7 shrink-0 rounded-lg object-cover" />
      <div className="min-w-0 max-w-[88%] space-y-2">
        <p
          className={cn(
            "whitespace-pre-line rounded-2xl rounded-bl-md px-3.5 py-2.5 text-[14px] leading-relaxed",
            message.error ? "border border-destructive/40 bg-destructive/10" : "bg-[#132538]",
          )}
        >
          {message.content}
        </p>
        {message.products && message.products.length > 0 && (
          <ul className="space-y-2">
            {message.products.map((p) => (
              <li key={p.slug}>
                <Link
                  to="/shop/$slug"
                  params={{ slug: p.slug }}
                  onClick={onNavigate}
                  className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.03] p-2 transition-colors hover:border-primary/40"
                >
                  <img
                    src={p.image}
                    alt=""
                    loading="lazy"
                    className="size-12 shrink-0 rounded-lg bg-[#132538] object-cover"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-semibold">{p.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {p.price} ·{" "}
                      <span className={p.purchasable ? "text-success" : ""}>{p.availability}</span>
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
        {(message.links?.length || message.handoff || onRetry) && (
          <div className="flex flex-wrap gap-2">
            {message.links?.map((l) => (
              <Link
                key={l.to}
                to={l.to as "/"}
                onClick={onNavigate}
                className="rounded-full border border-primary/40 px-3 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-primary/10"
              >
                {l.label}
              </Link>
            ))}
            {onRetry && (
              <button
                type="button"
                onClick={onRetry}
                className="rounded-full border border-border px-3 py-1.5 text-xs font-semibold hover:bg-white/5"
              >
                Try again
              </button>
            )}
            {message.handoff && (
              <a
                href={whatsappLink(
                  lastQuestion
                    ? `Hello ${BUSINESS.name}, I was chatting with Newton's AI on your website. My question: ${lastQuestion}`
                    : `Hello ${BUSINESS.name}, I need some help.`,
                )}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-full bg-whatsapp px-3 py-1.5 text-xs font-semibold text-[#04170b]"
              >
                <MessageCircle className="size-3.5" /> Continue on WhatsApp
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function TypingDots({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1 py-1" role="img" aria-label={label}>
      {[0, 150, 300].map((d) => (
        <span
          key={d}
          className="typing-dot size-2 rounded-full bg-muted-foreground"
          style={{ animationDelay: `${d}ms` }}
        />
      ))}
    </span>
  );
}

function WhatsAppGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M12.04 2a9.9 9.9 0 0 0-8.5 15l-1.4 5 5.1-1.34A9.9 9.9 0 1 0 12.04 2Zm0 18.1a8.2 8.2 0 0 1-4.18-1.15l-.3-.18-3.03.8.81-2.95-.2-.31a8.2 8.2 0 1 1 6.9 3.79Zm4.5-6.14c-.25-.12-1.46-.72-1.69-.8-.23-.08-.39-.12-.55.12-.16.25-.63.8-.78.97-.14.16-.29.18-.53.06a6.7 6.7 0 0 1-3.32-2.9c-.25-.43.25-.4.72-1.34.08-.16.04-.3-.02-.43-.06-.12-.55-1.33-.76-1.82-.2-.48-.4-.41-.55-.42h-.47a.9.9 0 0 0-.65.3 2.74 2.74 0 0 0-.86 2.04c0 1.2.88 2.37 1 2.53.12.16 1.73 2.64 4.2 3.7 1.56.67 2.17.73 2.95.62.48-.07 1.46-.6 1.66-1.18.2-.58.2-1.08.14-1.18-.06-.1-.22-.16-.47-.28Z" />
    </svg>
  );
}
