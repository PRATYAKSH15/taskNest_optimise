import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-session";

const GROQ_TRANSCRIBE_URL = "https://api.groq.com/openai/v1/audio/transcriptions";
const DEFAULT_WHISPER_MODEL = "whisper-large-v3-turbo";
const MAX_AUDIO_BYTES = 10 * 1024 * 1024;

export async function POST(request: Request) {
  const apiKey = process.env.GROQ_API_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json(
      { error: "Voice transcription is not configured on the server." },
      { status: 503 },
    );
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid audio payload." }, { status: 400 });
  }

  const audioFile = formData.get("file");
  if (!(audioFile instanceof File) || audioFile.size === 0) {
    return NextResponse.json({ error: "No audio recording was provided." }, { status: 400 });
  }
  if (audioFile.size > MAX_AUDIO_BYTES) {
    return NextResponse.json(
      { error: "Audio recording is too large. Keep it under 10 MB." },
      { status: 400 },
    );
  }

  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Not signed in." }, { status: 401 });
    }

    const upstreamForm = new FormData();
    upstreamForm.append("file", audioFile, audioFile.name || "voice-query.webm");
    upstreamForm.append("model", process.env.GROQ_WHISPER_MODEL?.trim() || DEFAULT_WHISPER_MODEL);
    upstreamForm.append("response_format", "json");

    const response = await fetch(GROQ_TRANSCRIBE_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      body: upstreamForm,
      signal: AbortSignal.timeout(20000),
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: "Could not transcribe voice recording right now." },
        { status: 503 },
      );
    }

    const data = (await response.json()) as { text?: string };
    const text = data.text?.trim() ?? "";
    if (!text) {
      return NextResponse.json(
        { error: "Could not hear anything clearly. Please try again." },
        { status: 422 },
      );
    }

    return NextResponse.json({ text });
  } catch {
    return NextResponse.json(
      { error: "Could not transcribe voice recording right now." },
      { status: 503 },
    );
  }
}
