import { useCallback, useEffect, useMemo, useState } from 'react';
import { Play, Pause, Repeat, Volume2, VolumeX } from 'lucide-react';
import VideoTemplate, { SCENE_DURATIONS } from './VideoTemplate';

const keys = Object.keys(SCENE_DURATIONS);
const strip = (k: string) => k.replace(/_r[12]$/, '');

export default function VideoWithControls() {
  const isIframed = typeof window !== 'undefined' && window.self !== window.top;
  const [active, setActive] = useState(0);
  const [locked, setLocked] = useState(false);
  const [paused, setPaused] = useState(false);
  const [muted, setMuted] = useState(false);
  const [mountKey, setMountKey] = useState(0);

  const durations = useMemo(() => {
    const k = keys[active];
    if (locked) return { [`${k}_r1`]: SCENE_DURATIONS[k as keyof typeof SCENE_DURATIONS], [`${k}_r2`]: SCENE_DURATIONS[k as keyof typeof SCENE_DURATIONS] };
    const o: Record<string, number> = {};
    keys.forEach((_, i) => { const kk = keys[(active + i) % keys.length]; o[kk] = SCENE_DURATIONS[kk as keyof typeof SCENE_DURATIONS]; });
    return o;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locked, mountKey]);

  const onSceneChange = useCallback((raw: string) => { const i = keys.indexOf(strip(raw)); if (i >= 0) setActive(i); }, []);

  useEffect(() => {
    if (!paused) return;
    const f = document.getAnimations().filter((a) => a.playState === 'running');
    f.forEach((a) => a.pause());
    return () => f.forEach((a) => a.play());
  }, [paused]);

  if (!isIframed) return <VideoTemplate />;
  const btn = 'w-10 h-10 flex items-center justify-center text-white/70 hover:text-white rounded-lg shrink-0';
  return (
    <div className="relative w-full h-screen">
      <VideoTemplate key={mountKey} durations={durations} loop paused={paused} muted={muted} onSceneChange={onSceneChange} />
      <div className="absolute bottom-0 left-0 right-0 z-50 flex items-center gap-2 bg-black/50 backdrop-blur-sm px-3 py-2">
        <button className={btn} onClick={() => setPaused((p) => !p)} aria-label={paused ? 'Play' : 'Pause'}>{paused ? <Play size={20} /> : <Pause size={20} />}</button>
        <button className={`${btn} ${locked ? 'bg-white/20 text-white' : ''}`} aria-pressed={locked} onClick={() => { setLocked((l) => !l); setPaused(false); setMountKey((k) => k + 1); }} aria-label="Loop scene"><Repeat size={20} /></button>
        <button className={btn} onClick={() => setMuted((m) => !m)} aria-label={muted ? 'Unmute' : 'Mute'}>{muted ? <VolumeX size={20} /> : <Volume2 size={20} />}</button>
        <div className="w-px self-stretch bg-white/15" />
        <div className="flex-1 flex gap-1">
          {keys.map((k, i) => (
            <button key={k} aria-label={`Jump to scene ${i + 1}`} onClick={() => { setActive(i); setPaused(false); setMountKey((m) => m + 1); }}
              className="flex-1 h-2 rounded-full" style={{ background: i === active ? 'rgba(255,255,255,.9)' : 'rgba(255,255,255,.25)' }} />
          ))}
        </div>
        <div className="text-white/70 font-mono text-xs">{active + 1}/{keys.length}</div>
      </div>
    </div>
  );
}
