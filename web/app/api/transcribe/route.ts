import { NextResponse } from "next/server";

export const maxDuration = 60;

export async function POST(req: Request) {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) {
    return NextResponse.json(
      { error: "Transcription is not configured (missing OPENAI_API_KEY).", fallback: true },
      { status: 503 },
    );
  }

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof Blob) || file.size < 32) {
    return NextResponse.json({ error: "Missing or empty audio file." }, { status: 400 });
  }

  const outbound = new FormData();
  const name = file instanceof File && file.name ? file.name : "audio.webm";
  outbound.append("file", file, name);
  outbound.append("model", "whisper-1");
  outbound.append("language", "en");

  try {
    const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}` },
      body: outbound,
    });
    const raw = await res.text();
    if (!res.ok) {
      let msg = raw;
      try {
        const j = JSON.parse(raw) as { error?: { message?: string } };
        if (j.error?.message) msg = j.error.message;
      } catch {
        /* keep raw */
      }
      return NextResponse.json({ error: msg || "OpenAI transcription failed." }, { status: res.status >= 500 ? 502 : 400 });
    }
    const data = JSON.parse(raw) as { text?: string };
    const text = (data.text ?? "").trim();
    return NextResponse.json({ text });
  } catch {
    return NextResponse.json({ error: "Could not reach OpenAI." }, { status: 502 });
  }
}
