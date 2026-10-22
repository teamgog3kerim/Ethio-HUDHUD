import { useEffect, useRef } from 'react';
import { VideoCanvas, type VideoAspectRatio, useVideoPlayer } from '@/lib/video';
import { AnimatePresence, motion } from 'framer-motion';

export const SCENE_DURATIONS = { hook: 4000, letters: 4500, numbers: 4000, path: 4500, outro: 4000 };
const VIDEO_ASPECT_RATIO: VideoAspectRatio = '9:16';
const BASE = import.meta.env.BASE_URL;
const sp = { type: 'spring' as const, stiffness: 300, damping: 20 };
const fill = { position: 'absolute' as const, inset: 0 };
const T = (n: number) => `${n}vmin`;

function Hook() {
  return (
    <motion.div style={{ ...fill, background: '#104C3C' }} exit={{ opacity: 0, scale: 1.3 }} transition={{ duration: 0.4 }}>
      <motion.div className="eth" style={{ ...fill, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: T(150), fontWeight: 900, color: '#E6B55C', lineHeight: 1 }}
        initial={{ scale: 0.2, rotate: -15, opacity: 0 }} animate={{ scale: [0.2, 1.1, 1], rotate: 0, opacity: 1 }} transition={{ duration: 0.7 }}>ሀ</motion.div>
      {['ሰ', 'ላ', 'ም'].map((c, i) => (
        <motion.div key={c} className="eth" style={{ position: 'absolute', top: T(14), left: `${14 + i * 12}vmin`, fontSize: T(11), color: '#F6F7F3', fontWeight: 900 }}
          initial={{ y: -40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ ...sp, delay: 0.5 + i * 0.2 }}>{c}</motion.div>
      ))}
      <div dir="rtl" className="kufi" style={{ position: 'absolute', bottom: T(40), width: '100%', textAlign: 'center', color: '#F6F7F3', fontSize: T(10), fontWeight: 800, lineHeight: 1.4 }}>
        {['هل تريد أن', 'تتكلم الأمهرية؟'].map((l, i) => (
          <motion.div key={l} initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ ...sp, delay: 1.2 + i * 0.4 }}>{l}</motion.div>
        ))}
      </div>
      <motion.div className="kufi" dir="rtl" style={{ position: 'absolute', bottom: T(26), width: '100%', textAlign: 'center', color: '#E6B55C', fontSize: T(6), fontWeight: 800 }}
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2.4 }}>ابدأ من الحروف</motion.div>
    </motion.div>
  );
}

const L = [['ሀ', 'هَ'], ['ለ', 'لَ'], ['ሐ', 'حَ'], ['መ', 'مَ'], ['ሠ', 'سَ'], ['ረ', 'رَ'], ['ሰ', 'سَ'], ['ቀ', 'قَ'], ['በ', 'بَ']];
function Letters() {
  return (
    <motion.div style={{ ...fill, background: '#F6F7F3' }} exit={{ x: '-100%' }} transition={{ duration: 0.4 }}>
      <div dir="rtl" className="kufi" style={{ position: 'absolute', top: T(18), width: '100%', textAlign: 'center', color: '#104C3C', fontSize: T(9), fontWeight: 800 }}>
        <motion.div initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={sp}>٣٣ حرفًا أساسيًا</motion.div>
      </div>
      <div style={{ position: 'absolute', top: T(40), left: T(8), right: T(8), display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: T(4) }}>
        {L.map(([a, b], i) => (
          <motion.div key={i} style={{ background: i % 4 === 0 ? '#E6B55C' : '#104C3C', borderRadius: T(5), aspectRatio: '1', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}
            initial={{ scale: 0, rotate: -12 }} animate={{ scale: 1, rotate: 0 }} transition={{ ...sp, delay: 0.3 + i * 0.25 }}>
            <div className="eth" style={{ fontSize: T(18), fontWeight: 900, color: i % 4 === 0 ? '#104C3C' : '#E6B55C', lineHeight: 1 }}>{a}</div>
            <div className="kufi" style={{ fontSize: T(7), color: i % 4 === 0 ? '#112722' : '#F6F7F3' }}>{b}</div>
          </motion.div>
        ))}
      </div>
      <motion.div dir="rtl" className="kufi" style={{ position: 'absolute', bottom: T(32), width: '100%', textAlign: 'center', color: '#166A56', fontSize: T(4.5) }}
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2.8 }}>النطق بالحروف العربية تقريبي</motion.div>
    </motion.div>
  );
}

function Numbers() {
  const rows = [['٠', '0', 'ዜሮ', 'زيرو'], ['١', '1', 'አንድ', 'أند'], ['١٠', '10', 'አስር', 'أسر'], ['١٠٠', '100', 'መቶ', 'ميتو']];
  return (
    <motion.div style={{ ...fill, background: '#E6B55C' }} exit={{ y: '100%' }} transition={{ duration: 0.4 }}>
      <div dir="rtl" className="kufi" style={{ position: 'absolute', top: T(18), width: '100%', textAlign: 'center', color: '#104C3C', fontSize: T(10), fontWeight: 800, lineHeight: 1.3 }}>
        <motion.div initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={sp}>الأرقام من ٠ إلى ١٠٠</motion.div>
      </div>
      <div style={{ position: 'absolute', top: T(40), left: T(8), right: T(8), display: 'flex', flexDirection: 'column', gap: T(4) }}>
        {rows.map(([ar, n, am, pr], i) => (
          <motion.div key={n} style={{ background: '#104C3C', borderRadius: T(4), padding: `${T(3)} ${T(6)}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#F6F7F3' }}
            initial={{ x: i % 2 ? 300 : -300, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ ...sp, delay: 0.3 + i * 0.4 }}>
            <span className="eth" style={{ fontSize: T(12), fontWeight: 900, color: '#E6B55C' }}>{n}</span>
            <span className="eth" style={{ fontSize: T(10), fontWeight: 900 }}>{am}</span>
            <span dir="rtl" className="kufi" style={{ fontSize: T(8) }}>{pr}</span>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

function Path() {
  const st = [['المبتدئ', 'الأشهر ١–٢'], ['المتوسط', 'الأشهر ٣–٤'], ['المتقدم', 'الأشهر ٥–٦']];
  return (
    <motion.div style={{ ...fill, background: '#166A56' }} exit={{ scale: 0.6, opacity: 0 }} transition={{ duration: 0.4 }}>
      <div dir="rtl" className="kufi" style={{ position: 'absolute', top: T(16), width: '100%', textAlign: 'center', color: '#F6F7F3', fontSize: T(9), fontWeight: 800, lineHeight: 1.4 }}>
        <motion.div initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={sp}>مسار مقترح</motion.div>
        <motion.div style={{ color: '#E6B55C' }} initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ ...sp, delay: 0.25 }}>لمدة ستة أشهر</motion.div>
      </div>
      <motion.div style={{ position: 'absolute', right: T(22), top: T(46), width: T(2), background: '#E6B55C', originY: 0, height: T(58) }} initial={{ scaleY: 0 }} animate={{ scaleY: 1 }} transition={{ duration: 2.2, delay: 0.5, ease: 'easeInOut' }} />
      {st.map(([a, b], i) => (
        <motion.div key={a} dir="rtl" style={{ position: 'absolute', right: T(14), left: T(8), top: T(42 + i * 24), display: 'flex', alignItems: 'center', gap: T(5) }}
          initial={{ opacity: 0, x: -60 }} animate={{ opacity: 1, x: 0 }} transition={{ ...sp, delay: 0.7 + i * 0.7 }}>
          <div className="kufi" style={{ width: T(16), height: T(16), borderRadius: '50%', background: '#E6B55C', color: '#104C3C', fontSize: T(9), fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>{i + 1}</div>
          <div>
            <div className="kufi" style={{ color: '#F6F7F3', fontSize: T(8.5), fontWeight: 800 }}>{a}</div>
            <div className="kufi" style={{ color: '#E6B55C', fontSize: T(5) }}>{b}</div>
          </div>
        </motion.div>
      ))}
      <motion.div dir="rtl" className="kufi" style={{ position: 'absolute', bottom: T(30), width: '100%', textAlign: 'center', color: '#F6F7F3', fontSize: T(5) }}
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 3 }}>دروس ومحادثات عملية وتتبّع للتقدم</motion.div>
    </motion.div>
  );
}

function Outro() {
  return (
    <motion.div style={{ ...fill, background: '#F6F7F3', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: T(5) }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
      <motion.img src={`${BASE}logo.svg`} style={{ width: T(36), height: T(36) }} initial={{ scale: 0, rotate: -20 }} animate={{ scale: 1, rotate: 0 }} transition={sp} />
      <motion.div dir="rtl" className="kufi" style={{ color: '#104C3C', fontSize: T(9), fontWeight: 800, textAlign: 'center', lineHeight: 1.4 }} initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ ...sp, delay: 0.4 }}>
        جرّب مجانًا<br />لمدة ٤٨ ساعة
      </motion.div>
      <motion.div className="kufi" style={{ color: '#112722', fontSize: T(8), fontWeight: 800 }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.1 }}>Ethio HUDHUD</motion.div>
      <motion.div style={{ background: '#104C3C', color: '#E6B55C', fontSize: T(6), padding: `${T(2)} ${T(6)}`, borderRadius: T(10), fontWeight: 700 }} initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ ...sp, delay: 1.5 }}>ethiohudhud.com</motion.div>
    </motion.div>
  );
}

const SCENES: Record<string, React.ComponentType> = { hook: Hook, letters: Letters, numbers: Numbers, path: Path, outro: Outro };
const START: Record<string, number> = (() => { let c = 0; const o: Record<string, number> = {}; for (const [k, v] of Object.entries(SCENE_DURATIONS)) { o[k] = c / 1000; c += v; } return o; })();

export default function VideoTemplate() {
  const { currentSceneKey } = useVideoPlayer({ durations: SCENE_DURATIONS });
  const audioRef = useRef<HTMLAudioElement | null>(null);
  useEffect(() => {
    const a = audioRef.current; if (!a) return;
    a.volume = 0.5;
    const t = START[currentSceneKey] ?? 0;
    if (Math.abs(a.currentTime - t) > 0.18) a.currentTime = t;
    a.play().catch(() => {});
  }, [currentSceneKey]);
  const S = SCENES[currentSceneKey];
  return (
    <VideoCanvas aspectRatio={VIDEO_ASPECT_RATIO} style={{ backgroundColor: '#104C3C' }}>
      <AnimatePresence mode="sync">{S && <S key={currentSceneKey} />}</AnimatePresence>
      <audio ref={audioRef} src={`${BASE}audio/bg_music.mp3`} preload="auto" autoPlay />
    </VideoCanvas>
  );
}
