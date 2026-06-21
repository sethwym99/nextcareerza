import { useEffect, useRef, useState } from "react";

type Props = {
  /** Analyser node tapped from the TTS audio playback to drive lip sync. */
  analyser: AnalyserNode | null;
  /** Whether the interviewer is currently speaking. */
  speaking: boolean;
  /** Voice id, used to subtly vary appearance. */
  voiceId?: string;
};

const SKIN_BY_VOICE: Record<string, { skin: string; hair: string; shirt: string; accent: string }> = {
  alloy: { skin: "#e8c4a0", hair: "#2c2417", shirt: "#1f2937", accent: "#3b82f6" },
  shimmer: { skin: "#f0cfa8", hair: "#8b5a2b", shirt: "#7c3aed", accent: "#ec4899" },
  verse: { skin: "#d9a679", hair: "#1a1a1a", shirt: "#0f766e", accent: "#22d3ee" },
  sage: { skin: "#c89070", hair: "#3a2818", shirt: "#065f46", accent: "#84cc16" },
  coral: { skin: "#edcfae", hair: "#a0522d", shirt: "#be185d", accent: "#fb7185" },
  ash: { skin: "#a87856", hair: "#0a0a0a", shirt: "#374151", accent: "#94a3b8" },
};

export function InterviewerAvatar({ analyser, speaking, voiceId = "alloy" }: Props) {
  const [mouth, setMouth] = useState(0);
  const rafRef = useRef<number | null>(null);
  const palette = SKIN_BY_VOICE[voiceId] ?? SKIN_BY_VOICE.alloy;

  useEffect(() => {
    if (!analyser || !speaking) {
      setMouth(0);
      return;
    }
    const buf = new Uint8Array(analyser.fftSize);
    let prev = 0;
    const tick = () => {
      analyser.getByteTimeDomainData(buf);
      let sum = 0;
      for (const v of buf) {
        const c = (v - 128) / 128;
        sum += c * c;
      }
      const rms = Math.sqrt(sum / buf.length);
      // Smooth + scale into 0..1 mouth-open range.
      const target = Math.min(1, rms * 7);
      prev = prev * 0.55 + target * 0.45;
      setMouth(prev);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [analyser, speaking]);

  // Mouth geometry
  const mouthH = 4 + mouth * 22; // px
  const mouthW = 38 + mouth * 10;
  const blinkClass = speaking ? "" : "animate-[blink_4s_infinite]";

  return (
    <div className="relative w-full aspect-square max-w-[220px] mx-auto">
      <style>{`
        @keyframes blink { 0%, 92%, 100% { transform: scaleY(1); } 95% { transform: scaleY(0.1); } }
        @keyframes avatar-pulse { 0%,100%{opacity:.35} 50%{opacity:.7} }
      `}</style>
      {speaking && (
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background: `radial-gradient(circle, ${palette.accent}44 0%, transparent 70%)`,
            animation: "avatar-pulse 1.4s ease-in-out infinite",
          }}
        />
      )}
      <svg viewBox="0 0 200 200" className="relative w-full h-full drop-shadow-xl">
        {/* Shoulders / shirt */}
        <path
          d={`M20,200 C40,150 70,135 100,135 C130,135 160,150 180,200 Z`}
          fill={palette.shirt}
        />
        {/* Neck */}
        <rect x="86" y="115" width="28" height="30" fill={palette.skin} />
        {/* Head */}
        <ellipse cx="100" cy="85" rx="48" ry="55" fill={palette.skin} />
        {/* Hair */}
        <path
          d={`M52,75 C55,40 80,28 100,28 C120,28 145,40 148,75 C148,60 130,52 100,52 C70,52 52,60 52,75 Z`}
          fill={palette.hair}
        />
        {/* Ears */}
        <ellipse cx="51" cy="90" rx="6" ry="10" fill={palette.skin} />
        <ellipse cx="149" cy="90" rx="6" ry="10" fill={palette.skin} />
        {/* Eyes */}
        <g className={blinkClass} style={{ transformOrigin: "82px 85px" }}>
          <ellipse cx="82" cy="85" rx="6" ry="7" fill="#fff" />
          <circle cx="82" cy="86" r="3" fill="#1f2937" />
        </g>
        <g className={blinkClass} style={{ transformOrigin: "118px 85px" }}>
          <ellipse cx="118" cy="85" rx="6" ry="7" fill="#fff" />
          <circle cx="118" cy="86" r="3" fill="#1f2937" />
        </g>
        {/* Eyebrows */}
        <rect x="72" y="70" width="20" height="3" rx="1.5" fill={palette.hair} />
        <rect x="108" y="70" width="20" height="3" rx="1.5" fill={palette.hair} />
        {/* Nose */}
        <path d="M100,90 L96,108 Q100,112 104,108 Z" fill={palette.skin} stroke="#00000022" />
        {/* Mouth — animated */}
        <ellipse
          cx="100"
          cy={122 + mouthH * 0.15}
          rx={mouthW / 2}
          ry={mouthH / 2}
          fill="#3b0a14"
        />
        {/* Teeth hint */}
        {mouth > 0.15 && (
          <rect
            x={100 - mouthW / 2 + 4}
            y={122 - mouthH / 2 + 1}
            width={mouthW - 8}
            height={Math.min(4, mouthH / 4)}
            fill="#f3f4f6"
            rx="1"
          />
        )}
      </svg>
    </div>
  );
}
