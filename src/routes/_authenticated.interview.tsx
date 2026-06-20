import { createFileRoute } from "@tanstack/react-router";
import { useState, useRef, useEffect, useCallback } from "react";
import { useServerFn } from "@tanstack/react-start";
import { startInterviewSession, interviewTurn } from "@/lib/ai.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Mic, MicOff, Sparkles, Video, VideoOff, AlertTriangle, Trophy } from "lucide-react";
import { toast } from "sonner";
import { createParser } from "eventsource-parser";
import { FaceLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";

export const Route = createFileRoute("/_authenticated/interview")({
  head: () => ({ meta: [{ title: "AI Voice Interview — NextCareer" }] }),
  component: Page,
});

type Msg = { role: "interviewer" | "candidate"; text: string };
type Phase = "setup" | "loading" | "ai-speaking" | "listening" | "thinking" | "done";

const MAX_QUESTIONS = 6;

function Page() {
  const startFn = useServerFn(startInterviewSession);
  const turnFn = useServerFn(interviewTurn);

  const [role, setRole] = useState("");
  const [phase, setPhase] = useState<Phase>("setup");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [liveTranscript, setLiveTranscript] = useState("");
  const [lookAwayCount, setLookAwayCount] = useState(0);
  const [faceVisible, setFaceVisible] = useState(true);
  const [report, setReport] = useState<any>(null);
  const [cameraOn, setCameraOn] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const landmarkerRef = useRef<FaceLandmarker | null>(null);
  const rafRef = useRef<number | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const audioPlayheadRef = useRef(0);
  const recognitionRef = useRef<any>(null);
  const isListeningRef = useRef(false);
  const lookingAwayRef = useRef(false);
  const awayStartRef = useRef<number>(0);
  const trackDuringAnswerRef = useRef(false);
  const phaseRef = useRef<Phase>("setup");

  useEffect(() => { phaseRef.current = phase; }, [phase]);

  // Cleanup
  useEffect(() => () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    audioCtxRef.current?.close().catch(() => {});
    try { recognitionRef.current?.stop(); } catch {}
  }, []);

  async function initCameraAndFace() {
    const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 480, height: 360 }, audio: false });
    streamRef.current = stream;
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
      await videoRef.current.play().catch(() => {});
    }
    setCameraOn(true);

    const filesetResolver = await FilesetResolver.forVisionTasks(
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm",
    );
    landmarkerRef.current = await FaceLandmarker.createFromOptions(filesetResolver, {
      baseOptions: {
        modelAssetPath:
          "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
        delegate: "GPU",
      },
      runningMode: "VIDEO",
      outputFacialTransformationMatrixes: true,
      numFaces: 1,
    });
    loop();
  }

  function loop() {
    const tick = () => {
      const video = videoRef.current;
      const lm = landmarkerRef.current;
      if (video && lm && video.readyState >= 2) {
        const ts = performance.now();
        try {
          const res = lm.detectForVideo(video, ts);
          const hasFace = res.faceLandmarks && res.faceLandmarks.length > 0;
          setFaceVisible(!!hasFace);
          let isAway = !hasFace;
          if (hasFace && res.facialTransformationMatrixes?.[0]) {
            const m = res.facialTransformationMatrixes[0].data;
            // Extract yaw (rotation around Y) and pitch (rotation around X)
            const yaw = Math.atan2(m[8], m[10]) * (180 / Math.PI);
            const pitch = Math.atan2(-m[9], Math.sqrt(m[1] ** 2 + m[5] ** 2)) * (180 / Math.PI);
            if (Math.abs(yaw) > 22 || Math.abs(pitch) > 22) isAway = true;
          }
          // Only count look-aways while user is answering
          if (trackDuringAnswerRef.current) {
            if (isAway && !lookingAwayRef.current) {
              lookingAwayRef.current = true;
              awayStartRef.current = ts;
            } else if (!isAway && lookingAwayRef.current) {
              lookingAwayRef.current = false;
              const duration = ts - awayStartRef.current;
              if (duration > 1200) {
                setLookAwayCount((c) => c + 1);
              }
            }
          }
        } catch {}
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  }

  async function speak(text: string): Promise<void> {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new AudioContext({ sampleRate: 24000 });
    }
    const ctx = audioCtxRef.current;
    if (ctx.state === "suspended") await ctx.resume().catch(() => {});
    audioPlayheadRef.current = 0;
    let pending = new Uint8Array(0);

    const playChunk = (incoming: Uint8Array) => {
      const bytes = new Uint8Array(pending.length + incoming.length);
      bytes.set(pending);
      bytes.set(incoming, pending.length);
      const usable = bytes.length - (bytes.length % 2);
      pending = bytes.slice(usable);
      if (usable === 0) return;
      const samples = new Int16Array(bytes.buffer, 0, usable / 2);
      const floats = Float32Array.from(samples, (s) => s / 32768);
      const buffer = ctx.createBuffer(1, floats.length, 24000);
      buffer.copyToChannel(floats, 0);
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      const head = audioPlayheadRef.current;
      const startAt = head === 0 ? ctx.currentTime + 0.05 : Math.max(head, ctx.currentTime);
      source.start(startAt);
      audioPlayheadRef.current = startAt + buffer.duration;
    };

    const res = await fetch("/api/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, voice: "alloy" }),
    });
    if (!res.ok || !res.body) throw new Error(`TTS ${res.status}`);

    const parser = createParser({
      onEvent(event) {
        let payload: { type: string; audio?: string };
        try { payload = JSON.parse(event.data); } catch { return; }
        if (payload.type !== "speech.audio.delta" || !payload.audio) return;
        const binary = atob(payload.audio);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        playChunk(bytes);
      },
    });
    const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      parser.feed(value);
    }
    // wait for audio to finish playing
    const remaining = audioPlayheadRef.current - ctx.currentTime;
    if (remaining > 0) await new Promise((r) => setTimeout(r, remaining * 1000));
  }

  function startListening(): Promise<string> {
    return new Promise((resolve, reject) => {
      const SR: any = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SR) { reject(new Error("Speech recognition not supported. Use Chrome.")); return; }
      const rec = new SR();
      recognitionRef.current = rec;
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = "en-US";
      let finalText = "";
      let silenceTimer: ReturnType<typeof setTimeout> | null = null;
      const resetSilence = () => {
        if (silenceTimer) clearTimeout(silenceTimer);
        silenceTimer = setTimeout(() => { try { rec.stop(); } catch {} }, 2800);
      };
      rec.onresult = (e: any) => {
        let interim = "";
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const r = e.results[i];
          if (r.isFinal) finalText += r[0].transcript + " ";
          else interim += r[0].transcript;
        }
        setLiveTranscript((finalText + interim).trim());
        resetSilence();
      };
      rec.onerror = (e: any) => {
        if (e.error === "no-speech" || e.error === "aborted") return;
        reject(new Error(e.error || "recognition error"));
      };
      rec.onend = () => {
        if (silenceTimer) clearTimeout(silenceTimer);
        isListeningRef.current = false;
        trackDuringAnswerRef.current = false;
        resolve(finalText.trim());
      };
      isListeningRef.current = true;
      trackDuringAnswerRef.current = true;
      rec.start();
      resetSilence();
    });
  }

  async function runConversation(initialRole: string) {
    let convo: Msg[] = [];
    let awayCount = 0;
    for (let q = 0; q < MAX_QUESTIONS; q++) {
      setPhase("thinking");
      const turn = await turnFn({ data: { role: initialRole, history: convo, lookAwayCount: awayCount, finalize: false } });
      if (turn.kind !== "turn") break;
      const spoken = (turn.feedback ? turn.feedback + " " : "") + turn.question;
      convo = [...convo, { role: "interviewer", text: turn.question }];
      setMessages([...convo]);
      setPhase("ai-speaking");
      trackDuringAnswerRef.current = true; // also watch eyes while AI speaks
      try { await speak(spoken); } catch (e: any) { toast.error(e.message || "Voice failed"); }
      trackDuringAnswerRef.current = false;
      setPhase("listening");
      setLiveTranscript("");
      let answer = "";
      try { answer = await startListening(); } catch (e: any) { toast.error(e.message || "Mic failed"); break; }
      if (!answer) answer = "(no answer)";
      convo = [...convo, { role: "candidate", text: answer }];
      setMessages([...convo]);
      // pull latest awayCount via state read
      awayCount = lookAwayCountRef.current;
    }
    setPhase("thinking");
    const final = await turnFn({ data: { role: initialRole, history: convo, lookAwayCount: lookAwayCountRef.current, finalize: true } });
    if (final.kind === "final") setReport(final.report);
    setPhase("done");
  }

  // keep a ref for lookAwayCount so the async loop reads the latest value
  const lookAwayCountRef = useRef(0);
  useEffect(() => { lookAwayCountRef.current = lookAwayCount; }, [lookAwayCount]);

  async function begin() {
    if (role.trim().length < 2) { toast.error("Enter the role you want to practice"); return; }
    // Create the AudioContext synchronously inside the click handler so the
    // browser keeps the user-gesture grant. Resuming later from inside speak()
    // would silently fail on Safari/iOS.
    if (!audioCtxRef.current) {
      try { audioCtxRef.current = new AudioContext({ sampleRate: 24000 }); } catch {}
    }
    setPhase("loading");
    try {
      await startFn({ data: { role } });
      await initCameraAndFace();
      await runConversation(role);
    } catch (e: any) {
      toast.error(e.message || "Could not start interview");
      setPhase("setup");
    }
  }

  function stopAll() {
    try { recognitionRef.current?.stop(); } catch {}
    streamRef.current?.getTracks().forEach((t) => t.stop());
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    audioCtxRef.current?.close().catch(() => {});
    setCameraOn(false);
  }

  function resetAll() {
    stopAll();
    setMessages([]);
    setLiveTranscript("");
    setLookAwayCount(0);
    setReport(null);
    setPhase("setup");
  }

  if (phase === "setup") {
    return (
      <div className="space-y-6">
        <header>
          <h1 className="text-3xl font-bold flex items-center gap-3"><Mic className="h-7 w-7 text-primary-glow" /> AI Voice Interview</h1>
          <p className="text-muted-foreground mt-1">Real spoken interview with face tracking and a final score.</p>
        </header>
        <div className="glass-card rounded-2xl p-8 max-w-xl mx-auto text-center">
          <Sparkles className="h-8 w-8 text-primary-glow mx-auto mb-3" />
          <h2 className="text-xl font-semibold">What role are you practicing for?</h2>
          <p className="text-muted-foreground text-sm mt-2">We'll use your camera and microphone. The AI will speak to you and watch for focus.</p>
          <div className="mt-6 flex gap-2">
            <Input value={role} onChange={(e) => setRole(e.target.value)} placeholder="e.g. Senior Frontend Engineer" onKeyDown={(e) => e.key === "Enter" && begin()} />
            <Button variant="hero" onClick={begin}>Start</Button>
          </div>
          <p className="text-xs text-muted-foreground mt-4">Works best in Chrome/Edge on desktop.</p>
        </div>
      </div>
    );
  }

  if (phase === "done" && report) {
    return (
      <div className="space-y-6 max-w-3xl mx-auto">
        <header className="text-center">
          <Trophy className="h-10 w-10 text-primary-glow mx-auto" />
          <h1 className="text-3xl font-bold mt-2">Interview Report</h1>
        </header>
        <div className="glass-card rounded-2xl p-8">
          <div className="text-center">
            <div className="text-6xl font-bold">{report.score}<span className="text-2xl text-muted-foreground">/100</span></div>
            <p className="text-muted-foreground mt-2">{report.verdict}</p>
          </div>
          <div className="grid md:grid-cols-2 gap-6 mt-8">
            <Section title="Strengths" items={report.strengths} />
            <Section title="Improvements" items={report.improvements} />
          </div>
          {report.redFlags?.length > 0 && (
            <div className="mt-6 p-4 rounded-xl border border-destructive/40 bg-destructive/10">
              <h3 className="font-semibold flex items-center gap-2 text-destructive"><AlertTriangle className="h-4 w-4" /> Red flags</h3>
              <ul className="list-disc list-inside text-sm mt-2 space-y-1">
                {report.redFlags.map((r: string, i: number) => <li key={i}>{r}</li>)}
              </ul>
            </div>
          )}
          <p className="text-sm text-muted-foreground mt-6 leading-relaxed">{report.summary}</p>
          <div className="text-xs text-muted-foreground mt-4">Look-away events tracked: {lookAwayCount}</div>
          <div className="mt-6 flex gap-3 justify-center">
            <Button variant="hero" onClick={resetAll}>Practice again</Button>
          </div>
        </div>
      </div>
    );
  }

  const last = messages[messages.length - 1];
  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold flex items-center gap-3"><Mic className="h-6 w-6 text-primary-glow" /> {role} Interview</h1>
        <div className="flex items-center gap-3 text-sm">
          <Badge ok={faceVisible} okLabel="Face detected" badLabel="No face" />
          <Badge ok={lookAwayCount <= 3} okLabel={`Focus ${lookAwayCount} away`} badLabel={`⚠ ${lookAwayCount} look-aways`} />
          <Button variant="ghost" size="sm" onClick={resetAll}>End</Button>
        </div>
      </header>

      <div className="grid lg:grid-cols-[360px_1fr] gap-6">
        <div className="space-y-3">
          <div className="relative rounded-2xl overflow-hidden border border-border bg-black aspect-[4/3]">
            <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
            {!cameraOn && (
              <div className="absolute inset-0 grid place-items-center text-muted-foreground"><VideoOff className="h-8 w-8" /></div>
            )}
            <div className="absolute top-2 left-2 flex items-center gap-1 text-xs bg-black/60 text-white px-2 py-1 rounded-full">
              <Video className="h-3 w-3" /> Live
            </div>
          </div>
          <div className="glass-card rounded-xl p-3 text-xs space-y-1">
            <div>Question {Math.min(messages.filter((m) => m.role === "interviewer").length, MAX_QUESTIONS)} / {MAX_QUESTIONS}</div>
            <div className="text-muted-foreground">Stay focused on the camera. Pauses end your answer.</div>
          </div>
        </div>

        <div className="glass-card rounded-2xl p-6 min-h-[360px] flex flex-col">
          <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
            {phase === "ai-speaking" && "🔊 Interviewer is speaking…"}
            {phase === "listening" && (<span className="flex items-center gap-2"><Mic className="h-3 w-3 text-primary-glow animate-pulse" /> Listening — answer now</span>)}
            {phase === "thinking" && "Thinking…"}
            {phase === "loading" && "Setting up camera & mic…"}
          </div>
          <div className="text-2xl font-semibold leading-snug min-h-[3em]">
            {last?.role === "interviewer" ? last.text : (phase === "loading" ? "Preparing…" : "…")}
          </div>
          {phase === "listening" && (
            <div className="mt-6 p-4 rounded-xl bg-secondary/50 text-sm min-h-[6em]">
              <div className="text-xs text-muted-foreground mb-1">You:</div>
              {liveTranscript || <span className="text-muted-foreground italic">Speak when ready…</span>}
            </div>
          )}
          {phase !== "listening" && phase !== "loading" && (
            <div className="mt-6 space-y-2 text-sm flex-1 overflow-y-auto max-h-[260px]">
              {messages.slice(-4).map((m, i) => (
                <div key={i} className={m.role === "interviewer" ? "text-foreground" : "text-muted-foreground"}>
                  <span className="font-semibold">{m.role === "interviewer" ? "AI" : "You"}:</span> {m.text}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Section({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <h3 className="font-semibold mb-2">{title}</h3>
      <ul className="list-disc list-inside text-sm space-y-1 text-muted-foreground">
        {items?.map((s, i) => <li key={i}>{s}</li>)}
      </ul>
    </div>
  );
}

function Badge({ ok, okLabel, badLabel }: { ok: boolean; okLabel: string; badLabel: string }) {
  return (
    <span className={`px-2 py-1 rounded-full text-xs border ${ok ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400" : "border-amber-500/40 bg-amber-500/10 text-amber-400"}`}>
      {ok ? okLabel : badLabel}
    </span>
  );
}
