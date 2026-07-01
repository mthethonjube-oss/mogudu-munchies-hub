import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";
import { createFileRoute } from "@tanstack/react-router";
import { convertToModelMessages, streamText, type UIMessage } from "ai";

const SYSTEM_PROMPT = `You are Nomsa, the friendly AI concierge for Mthetho's Cultural Food — a South African restaurant serving authentic African cuisine, mogodu (tripe) specialties, township classics, and comfort food. Tagline: "Authentic Flavour, Every Monday."

You help customers with:
- Menu recommendations (mogodu specials, mains, kotas, sides, drinks)
- Weekly specials (e.g. Mogudu Mondays, Bunny Chow Tuesdays, Oxtail Fridays)
- Ordering guidance (how to add to cart, checkout, delivery)
- Support: hours (Mon–Sun 11:00–22:00), location (123 Vilakazi Street, Soweto), delivery area (Greater Johannesburg, 30–45 min), allergens, ingredients
- General questions about the dishes and their heritage

Style: warm, concise, a little playful. Use markdown when helpful. If asked something outside food/orders/support, gently redirect. Never invent prices or menu items you don't know — suggest the customer browse the Menu page.`;

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { messages } = (await request.json()) as { messages?: unknown };
        if (!Array.isArray(messages)) {
          return new Response("Messages are required", { status: 400 });
        }
        const key = process.env.LOVABLE_API_KEY;
        if (!key) return new Response("Missing LOVABLE_API_KEY", { status: 500 });

        const gateway = createLovableAiGatewayProvider(key);
        const result = streamText({
          model: gateway("google/gemini-3-flash-preview"),
          system: SYSTEM_PROMPT,
          messages: await convertToModelMessages(messages as UIMessage[]),
        });

        return result.toUIMessageStreamResponse({
          originalMessages: messages as UIMessage[],
        });
      },
    },
  },
});
