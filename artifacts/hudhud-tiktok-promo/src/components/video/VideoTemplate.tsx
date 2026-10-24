import { useEffect, useRef } from 'react';
import { VideoCanvas, type VideoAspectRatio, useVideoPlayer } from '@/lib/video';
import { AnimatePresence, motion } from 'framer-motion';
import { Hook, Fidel, Path, Trial, Pricing, Outro } from './Scenes';

export const SCENE_DURATIONS = {
  hook: 3460,
  fidel: 4620,
  path: 4620,
  trial: 3460,
  pricing: 4620,
  outro: 3500,
};
const SCENES: Record<string, React.ComponentType> = { hook: Hook, fidel: Fidel, path: Path, trial: Trial, pricing: Pricing, outro: Outro };
const VIDEO_ASPECT_RATIO: VideoAspectRatio = '9:16';
const BG = ['#104C3C', '#F6F7F3', '#0B3A2E', '#E6B55C', '#F6F7F3', '#104C3C'];

export default function VideoTemplate() {
  const { currentScene, currentSceneKey } = useVideoPlayer({ durations: SCENE_DURATIONS });
  const audio = useRef<HTMLAudioElement | null>(null);
  useEffect(() => {
    const a = audio.current;
    if (!a) return;
    if (currentScene === 0) a.currentTime = 0;
    a.play().catch(() => {});
  }, [currentScene]);
  const S = SCENES[currentSceneKey];
  return (
    <VideoCanvas aspectRatio={VIDEO_ASPECT_RATIO} style={{ background: BG[currentScene] ?? BG[0], transition: 'background 0.4s' }}>
      <motion.div className="absolute inset-0" animate={{ scale: [1, 1.04] }} transition={{ duration: 4.5, ease: 'linear' }} key={currentSceneKey}>
        <AnimatePresence mode="sync">{S && <S key={currentSceneKey} />}</AnimatePresence>
      </motion.div>
      <audio ref={audio} src={`${import.meta.env.BASE_URL}audio/bg_music.mp3`} preload="auto" autoPlay />
    </VideoCanvas>
  );
}
