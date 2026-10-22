import { useEffect, useRef } from 'react';
import { VideoCanvas, type VideoAspectRatio, useVideoPlayer, VideoPausedContext } from '@/lib/video';
import { AnimatePresence } from 'framer-motion';
import { Hook, Alphabet, Path, Convo, Trial, Outro } from './scenes';

export const SCENE_DURATIONS = { hook: 4000, alphabet: 4500, path: 4500, convo: 4500, trial: 3500, outro: 3000 };
const SCENE_COMPONENTS: Record<string, React.ComponentType> = { hook: Hook, alphabet: Alphabet, path: Path, convo: Convo, trial: Trial, outro: Outro };
const VIDEO_ASPECT_RATIO: VideoAspectRatio = '9:16';

const SCENE_START_SEC: Record<string, number> = (() => {
  const out: Record<string, number> = {}; let c = 0;
  for (const [k, ms] of Object.entries(SCENE_DURATIONS)) { out[k] = c / 1000; c += ms; }
  return out;
})();

export default function VideoTemplate({
  durations = SCENE_DURATIONS, loop = true, paused = false, muted = false, onSceneChange,
}: { durations?: Record<string, number>; loop?: boolean; paused?: boolean; muted?: boolean; onSceneChange?: (k: string) => void } = {}) {
  const { currentSceneKey } = useVideoPlayer({ durations, loop, paused });
  useEffect(() => { onSceneChange?.(currentSceneKey); }, [currentSceneKey, onSceneChange]);
  const base = currentSceneKey.replace(/_r[12]$/, '');
  const Scene = SCENE_COMPONENTS[base];
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const last = useRef<string | null>(null);
  useEffect(() => {
    const a = audioRef.current; if (!a) return;
    a.volume = 0.5;
    if (paused) { a.pause(); return; }
    if (last.current !== currentSceneKey) {
      last.current = currentSceneKey;
      const t = SCENE_START_SEC[base] ?? 0;
      if (Math.abs(a.currentTime - t) > 0.18) a.currentTime = t;
    }
    a.play().catch(() => {});
  }, [currentSceneKey, base, muted, paused]);
  return (
    <VideoPausedContext.Provider value={paused}>
      <VideoCanvas aspectRatio={VIDEO_ASPECT_RATIO} style={{ backgroundColor: '#104C3C' }}>
        <AnimatePresence mode="sync">{Scene && <Scene key={currentSceneKey} />}</AnimatePresence>
        <audio ref={audioRef} src={`${import.meta.env.BASE_URL}audio/bg_music.mp3`} preload="auto" autoPlay muted={muted} />
      </VideoCanvas>
    </VideoPausedContext.Provider>
  );
}
