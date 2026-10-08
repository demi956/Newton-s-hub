import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const turn = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().trim().min(1).max(1500),
});

export const askAssistant = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z
      .object({
        messages: z.array(turn).min(1).max(30),
      })
      .refine(
        (d) => d.messages[d.messages.length - 1]?.role === "user",
        "Last message must be from the shopper.",
      )
      .refine(
        (d) => (d.messages[d.messages.length - 1]?.content.length ?? 0) <= 600,
        "Please keep messages under 600 characters.",
      )
      .parse(data),
  )
  .handler(async ({ data }) => {
    const { rateLimit, answer } = await import("./assistant.server");
    const limited = rateLimit();
    if (!limited.ok) {
      return {
        reply: `You're sending messages quickly — please wait about ${limited.retryAfter} seconds and try again, or reach the team on WhatsApp.`,
        products: [],
        links: [],
        handoff: true,
        source: "catalog" as const,
      };
    }
    // Keep the recent context only, starting with a shopper message, alternating roles.
    const recent = data.messages.slice(-12);
    const normalized: Array<{ role: "user" | "assistant"; content: string }> = [];
    for (const m of recent) {
      const prev = normalized[normalized.length - 1];
      if (!prev && m.role === "assistant") continue;
      if (prev && prev.role === m.role) prev.content = `${prev.content}\n${m.content}`.slice(-1500);
      else normalized.push({ role: m.role, content: m.content });
    }
    try {
      return await answer(normalized);
    } catch {
      return {
        reply:
          "I can't reach the catalog right now. Please try again in a moment, or chat with the Newton's Hub team on WhatsApp.",
        products: [],
        links: [],
        handoff: true,
        source: "catalog" as const,
      };
    }
  });
