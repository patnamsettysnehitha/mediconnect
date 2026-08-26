import { createFileRoute } from "@tanstack/react-router";

type Msg = { role: "user" | "assistant"; content: string };
type Body = { mode?: "chat" | "triage"; messages?: Msg[]; lang?: string; text?: string };

const LANG_NAME: Record<string, string> = {
  en: "simple English",
  hi: "simple Hindi (Devanagari script)",
  te: "simple Telugu (Telugu script)",
};

const CHAT_SYSTEM = (langName: string) => `You are the health information assistant of MediConnect in India.
Answer ONLY in ${langName}. Use short sentences and everyday words that someone with little formal education can understand. Avoid medical jargon; if you must use a medical term, explain it in brackets.

Rules:
- You give general health information and self-care guidance only.
- NEVER diagnose, never name a specific disease as the user's condition, and never prescribe or suggest doses of medicines.
- Suggest which TYPE of doctor/department usually helps, and encourage booking an appointment on this website.
- If the message mentions chest pain, breathing difficulty, heavy bleeding, unconsciousness, stroke signs, seizures, poisoning, self-harm or a serious accident, your FIRST line must tell the person to call 108 or 112 or go to the nearest emergency room immediately.
- Keep answers under 150 words and use short bullet points where helpful.
- End every answer with one line reminding that this is general information, not a diagnosis.`;

const TRIAGE_SYSTEM = (langName: string) => `You are a triage helper for an Indian hospital website. The user describes symptoms.
Return ONLY valid JSON (no markdown fences) with exactly these keys:
{"specialty": one of ["General Physician","Cardiologist","Dermatologist","Orthopedic Surgeon","Pediatrician","Neurologist","Gynecologist","ENT Specialist","Psychiatrist","Gastroenterologist"],
 "summary": one short sentence in ${langName} explaining which kind of doctor usually helps and why,
 "selfCare": array of 2-4 very short self-care tips in ${langName},
 "seeDoctorIf": array of 2-4 short warning signs in ${langName} that mean the person should see a doctor quickly,
 "emergency": true only if the description suggests a life-threatening emergency}
Never name a disease as a diagnosis. Use plain, easy words.`;

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = (await request.json()) as Body;
        const key = process.env["LOVABLE_API_KEY"];
        if (!key) return Response.json({ error: "AI is not configured" }, { status: 500 });

        const langName = LANG_NAME[body.lang ?? "en"] ?? LANG_NAME["en"]!;
        const isTriage = body.mode === "triage";

        const messages =
          isTriage
            ? [
                { role: "system", content: TRIAGE_SYSTEM(langName) },
                { role: "user", content: String(body.text ?? "").slice(0, 2000) },
              ]
            : [
                { role: "system", content: CHAT_SYSTEM(langName) },
                ...(body.messages ?? [])
                  .slice(-12)
                  .map((m) => ({ role: m.role, content: String(m.content).slice(0, 2000) })),
              ];

        if (!isTriage && (body.messages ?? []).length === 0) {
          return Response.json({ error: "No message" }, { status: 400 });
        }

        const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json", "Lovable-API-Key": key },
          body: JSON.stringify({
            model: "google/gemini-3.5-flash",
            messages,
            ...(isTriage ? { response_format: { type: "json_object" } } : {}),
          }),
        });

        if (res.status === 429) return Response.json({ error: "rate_limit" }, { status: 429 });
        if (res.status === 402) return Response.json({ error: "no_credits" }, { status: 402 });
        if (!res.ok) {
          console.error("AI gateway error", res.status, await res.text());
          return Response.json({ error: "ai_error" }, { status: 502 });
        }

        const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
        const content = json.choices?.[0]?.message?.content ?? "";

        if (!isTriage) return Response.json({ content });

        try {
          const cleaned = content.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
          return Response.json({ result: JSON.parse(cleaned) });
        } catch {
          return Response.json({ error: "parse_error" }, { status: 502 });
        }
      },
    },
  },
});
