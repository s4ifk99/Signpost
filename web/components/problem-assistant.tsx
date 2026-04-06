"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Mic, MicOff, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

function pickRecorderMime(): string | undefined {
  if (typeof MediaRecorder === "undefined") return undefined;
  const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"];
  for (const t of candidates) {
    if (MediaRecorder.isTypeSupported(t)) return t;
  }
  return undefined;
}

type BrowserSpeechRec = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  onresult: ((ev: Event) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
};

type SpeechRecCtor = new () => BrowserSpeechRec;

function getSpeechRecognition(): BrowserSpeechRec | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecCtor;
    webkitSpeechRecognition?: SpeechRecCtor;
  };
  const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
  return Ctor ? new Ctor() : null;
}

export function ProblemAssistant() {
  const router = useRouter();
  const [problem, setProblem] = useState("");
  const [legalAid, setLegalAid] = useState(false);
  const [freeOnly, setFreeOnly] = useState(false);
  const [refining, setRefining] = useState(false);
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [voiceNote, setVoiceNote] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  const stopRecording = useCallback(() => {
    const mr = mediaRecorderRef.current;
    if (mr && mr.state !== "inactive") mr.stop();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    mediaRecorderRef.current = null;
    setRecording(false);
  }, []);

  const startBrowserDictation = useCallback(() => {
    const rec = getSpeechRecognition();
    if (!rec) {
      setVoiceNote("Browser speech recognition is not available in this browser.");
      return;
    }
    setVoiceNote("Listening… speak, then pause when finished.");
    rec.continuous = false;
    rec.interimResults = false;
    rec.lang = "en-GB";
    let finalText = "";
    rec.onresult = (ev: Event) => {
      const e = ev as unknown as { resultIndex: number; results: { length: number; [i: number]: { isFinal: boolean; [j: number]: { transcript: string } } } };
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r?.isFinal) finalText += r[0]?.transcript ?? "";
      }
    };
    rec.onerror = () => {
      setVoiceNote("Voice input stopped or failed. Try again or type your problem.");
    };
    rec.onend = () => {
      const t = finalText.trim();
      if (t) setProblem((p) => (p.trim() ? `${p.trim()} ${t}` : t));
      setVoiceNote(null);
    };
    try {
      rec.start();
    } catch {
      setVoiceNote("Could not start browser voice input.");
    }
  }, []);

  const toggleWhisperRecord = useCallback(async () => {
    if (recording) {
      stopRecording();
      return;
    }
    setVoiceNote(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mime = pickRecorderMime();
      const mr = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
      chunksRef.current = [];
      mr.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      mr.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: mime ?? "audio/webm" });
        chunksRef.current = [];
        if (blob.size < 64) return;
        setTranscribing(true);
        try {
          const fd = new FormData();
          fd.append("file", blob, mime?.includes("mp4") ? "clip.m4a" : "clip.webm");
          const res = await fetch("/api/transcribe", { method: "POST", body: fd });
          const data = (await res.json()) as { text?: string; error?: string; fallback?: boolean };
          if (!res.ok) {
            if (data.fallback) {
              setVoiceNote("Whisper is not configured. You can use browser voice instead.");
            } else {
              setVoiceNote(data.error ?? "Transcription failed.");
            }
            return;
          }
          const t = (data.text ?? "").trim();
          if (t) setProblem((p) => (p.trim() ? `${p.trim()} ${t}` : t));
        } catch {
          setVoiceNote("Could not reach transcription service.");
        } finally {
          setTranscribing(false);
        }
      };
      mediaRecorderRef.current = mr;
      mr.start(250);
      setRecording(true);
    } catch {
      setVoiceNote("Microphone access was denied or is unavailable.");
    }
  }, [recording, stopRecording]);

  const onFindHelp = async () => {
    const trimmed = problem.trim();
    if (!trimmed || refining) return;
    setRefining(true);
    try {
      const res = await fetch("/api/search/refine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          problem: trimmed,
          legalAidOnly: legalAid,
          freeOnly,
        }),
      });
      const data = (await res.json()) as { q?: string; semantic?: boolean; error?: string };
      if (!res.ok) {
        setVoiceNote(data.error ?? "Could not refine your search. Try the search page.");
        setRefining(false);
        return;
      }
      const q = (data.q ?? trimmed).trim() || trimmed;
      const params = new URLSearchParams();
      params.set("q", q);
      if (data.semantic) params.set("semantic", "1");
      if (legalAid) params.set("legalAid", "1");
      if (freeOnly) params.set("free", "1");
      router.push(`/search?${params.toString()}`);
    } catch {
      setVoiceNote("Something went wrong. Try again.");
    } finally {
      setRefining(false);
    }
  };

  return (
    <section
      id="find-help"
      className="border-t-2 border-primary/15 bg-background py-10 md:py-12"
      aria-labelledby="find-help-heading"
    >
      <div className="mx-auto max-w-3xl px-4">
        <h2 id="find-help-heading" className="font-serif text-2xl font-semibold tracking-tight text-primary md:text-3xl">
          Describe your problem
        </h2>
        <p className="mt-2 text-muted-foreground">
          Tell us what you need in your own words. We use AI to turn that into a focused directory search and direct
          you to the best people to contact. You can type or dictate below.
        </p>

        <div className="mt-6 space-y-4">
          <Textarea
            value={problem}
            onChange={(e) => setProblem(e.target.value)}
            placeholder="e.g. I’ve been given notice to leave my flat and I’m on a low income…"
            className="min-h-[120px] resize-y text-base"
            rows={5}
            disabled={refining}
          />

          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-6">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="pa-legal-aid"
                  checked={legalAid}
                  onCheckedChange={(v) => setLegalAid(v === true)}
                  disabled={refining}
                />
                <Label htmlFor="pa-legal-aid" className="text-sm font-normal leading-none peer-disabled:cursor-not-allowed">
                  I&apos;m looking for legal aid
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="pa-free"
                  checked={freeOnly}
                  onCheckedChange={(v) => setFreeOnly(v === true)}
                  disabled={refining}
                />
                <Label htmlFor="pa-free" className="text-sm font-normal leading-none peer-disabled:cursor-not-allowed">
                  Prefer free / pro bono services
                </Label>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => void toggleWhisperRecord()}
                disabled={refining || transcribing}
                aria-pressed={recording}
              >
                {transcribing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : recording ? (
                  <MicOff className="h-4 w-4" />
                ) : (
                  <Mic className="h-4 w-4" />
                )}
                {recording ? "Stop recording" : transcribing ? "Transcribing…" : "Dictate (Whisper)"}
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={startBrowserDictation} disabled={refining || recording || transcribing}>
                Browser voice
              </Button>
            </div>
          </div>

          {voiceNote && <p className="text-sm text-amber-700 dark:text-amber-400">{voiceNote}</p>}

          <Button type="button" className="w-full gap-2 sm:w-auto" size="lg" onClick={() => void onFindHelp()} disabled={!problem.trim() || refining}>
            {refining ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Finding matches…
              </>
            ) : (
              <>
                <Search className="h-4 w-4" />
                Find help
              </>
            )}
          </Button>
        </div>
      </div>
    </section>
  );
}
