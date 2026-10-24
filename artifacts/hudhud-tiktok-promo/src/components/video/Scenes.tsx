import { motion } from 'framer-motion';
import type { CSSProperties, ReactNode } from 'react';

const B = import.meta.env.BASE_URL;
const pop = { type: 'spring' as const, stiffness: 300, damping: 20 };
const fill: CSSProperties = { position: 'absolute', inset: 0, direction: 'rtl', overflow: 'hidden' };

function Scene({ children, dark = true }: { children: ReactNode; dark?: boolean }) {
  return (
    <motion.div style={{ ...fill, color: dark ? '#F6F7F3' : '#112722' }} initial={{ opacity: 0, scale: 1.08, filter: 'blur(10px)' }}
      animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }} exit={{ opacity: 0, scale: 0.94 }} transition={{ duration: 0.35 }}>
      {children}
    </motion.div>
  );
}
function Line({ children, d = 0, size, color, cls = 'kufi', weight = 800, style }: { children: ReactNode; d?: number; size: number; color?: string; cls?: string; weight?: number; style?: CSSProperties }) {
  return (
    <div style={{ overflow: 'hidden', padding: '0.1em 0', ...style }}>
      <motion.div className={cls} initial={{ y: '110%' }} animate={{ y: 0 }} transition={{ delay: d, duration: 0.5, ease: [0.2, 0.9, 0.2, 1] }}
        style={{ fontSize: `${size}vw`, fontWeight: weight, lineHeight: 1.25, color }}>{children}</motion.div>
    </div>
  );
}
const col: CSSProperties = { position: 'absolute', inset: 0, padding: '14vh 8vw', display: 'flex', flexDirection: 'column', justifyContent: 'center' };

export function Hook() {
  return (
    <Scene>
      <motion.div className="eth" initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 0.16, scale: 1 }} transition={{ delay: 0.1, duration: 1.2 }}
        style={{ position: 'absolute', top: '8vh', width: '100%', textAlign: 'center', fontSize: '62vw', fontWeight: 900, color: '#E6B55C', lineHeight: 1 }}>አማ</motion.div>
      <motion.img src={`${B}hudhud-tiktok-bird.png`} initial={{ scale: 0, rotate: -15 }} animate={{ scale: 1, rotate: 0 }} transition={{ ...pop, delay: 0.15 }}
        style={{ position: 'absolute', top: '16vh', left: '17vw', width: '66vw', borderRadius: '14vw', boxShadow: '0 4vw 8vw rgba(0,0,0,.35)' }} />
      <div style={{ ...col, justifyContent: 'flex-end', paddingBottom: '16vh' }}>
        <Line size={14} d={0.7}>تريد أن تتعلّم</Line>
        <Line size={22} d={0.95} color="#E6B55C" style={{ marginTop: '-1vw' }}>الأمهرية؟</Line>
      </div>
    </Scene>
  );
}

const LETTERS: [string, string][] = [['ሀ', 'هَ'], ['ለ', 'لَ'], ['መ', 'مَ'], ['ረ', 'رَ'], ['ሰ', 'سَ'], ['በ', 'بَ']];
export function Fidel() {
  return (
    <Scene dark={false}>
      <div style={{ ...col, justifyContent: 'flex-start', paddingTop: '12vh' }}>
        <Line size={7} color="#166A56" cls="kufi" d={0}>الحروف · الفيدل</Line>
        <Line size={12} d={0.15}>اقرأها بالعربية</Line>
        <div style={{ marginTop: '4vh', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4vw' }}>
          {LETTERS.map(([a, p], i) => (
            <motion.div key={a} initial={{ scale: 0, rotate: -8 }} animate={{ scale: 1, rotate: 0 }} transition={{ ...pop, delay: 0.5 + i * 0.5 }}
              style={{ background: i % 3 === 1 ? '#104C3C' : '#fff', color: i % 3 === 1 ? '#F6F7F3' : '#112722', borderRadius: '6vw', padding: '3vw 0', textAlign: 'center', boxShadow: '0 2vw 5vw rgba(16,76,60,.15)' }}>
              <div className="eth" style={{ fontSize: '22vw', fontWeight: 900, lineHeight: 1.1 }}>{a}</div>
              <div className="kufi" style={{ fontSize: '9vw', fontWeight: 800, color: '#E6B55C' }}>{p}</div>
            </motion.div>
          ))}
        </div>
      </div>
    </Scene>
  );
}

export function Path() {
  const items = ['الحروف', 'الكلمات', 'المحادثات', 'الأرقام 0–100'];
  return (
    <Scene>
      <div style={{ ...col, justifyContent: 'flex-start', paddingTop: '13vh' }}>
        <Line size={9} color="#E6B55C">برنامج من</Line>
        <motion.div initial={{ scale: 0.3, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ ...pop, delay: 0.2 }} className="kufi"
          style={{ fontSize: '34vw', fontWeight: 900, lineHeight: 1, color: '#F6F7F3', transformOrigin: 'right center' }}>٦ أشهر</motion.div>
        <div style={{ marginTop: '5vh', display: 'flex', flexDirection: 'column', gap: '2.5vh' }}>
          {items.map((t, i) => (
            <motion.div key={t} initial={{ x: 120, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.7 + i * 0.4, duration: 0.4 }}
              className="kufi" style={{ fontSize: '8vw', fontWeight: 800, background: 'rgba(246,247,243,.1)', borderRight: '1.5vw solid #E6B55C', padding: '2.2vw 5vw', borderRadius: '3vw' }}>{t}</motion.div>
          ))}
        </div>
        <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 2.6 }} dir="ltr" className="eth"
          style={{ marginTop: '4vh', fontSize: '9vw', fontWeight: 800, color: '#E6B55C', textAlign: 'center' }}>0 · ዜሮ · <span className="kufi" dir="rtl">زيرو</span></motion.div>
      </div>
    </Scene>
  );
}

export function Trial() {
  return (
    <Scene dark={false}>
      <div style={{ ...col, alignItems: 'center', textAlign: 'center' }}>
        <Line size={9} color="#104C3C">ابدأ الآن</Line>
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ ...pop, delay: 0.3 }} className="kufi"
          style={{ fontSize: '58vw', fontWeight: 900, lineHeight: 1, color: '#104C3C' }}>48</motion.div>
        <Line size={13} d={0.8}>ساعة مجانًا</Line>
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.5 }}
          style={{ marginTop: '4vh', background: '#104C3C', color: '#F6F7F3', borderRadius: '10vw', padding: '3vw 7vw', fontSize: '6vw', fontWeight: 700 }}>سجّل بحساب Google</motion.div>
      </div>
    </Scene>
  );
}

function Card({ price, label, sub, d, hot }: { price: string; label: string; sub: string; d: number; hot?: boolean }) {
  return (
    <motion.div initial={{ scale: 0.6, opacity: 0, y: 80 }} animate={{ scale: 1, opacity: 1, y: 0 }} transition={{ ...pop, delay: d }}
      style={{ background: hot ? '#104C3C' : '#fff', color: hot ? '#F6F7F3' : '#112722', borderRadius: '6vw', padding: '5vw 6vw', border: hot ? '1vw solid #E6B55C' : '0.4vw solid #d8dccf' }}>
      <div className="kufi" style={{ fontSize: '6vw', fontWeight: 800, color: hot ? '#E6B55C' : '#166A56' }}>{label}</div>
      <div className="kufi" dir="ltr" style={{ fontSize: '22vw', fontWeight: 900, lineHeight: 1.1, textAlign: 'right' }}>${price}</div>
      <div style={{ fontSize: '5vw', fontWeight: 600 }}>{sub}</div>
    </motion.div>
  );
}
export function Pricing() {
  return (
    <Scene dark={false}>
      <div style={{ ...col, gap: '3vh', justifyContent: 'center' }}>
        <Card price="29" label="شهر واحد" sub="دفعة يدوية، بلا تجديد تلقائي" d={0.2} />
        <Card price="149" label="ستة أشهر · مرة واحدة" sub="وفّر $25 (14.4%)" d={1.1} hot />
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2.2 }} className="kufi"
          style={{ textAlign: 'center', fontSize: '6vw', fontWeight: 800, color: '#166A56' }}>بلا تجديد تلقائي</motion.div>
      </div>
    </Scene>
  );
}

export function Outro() {
  return (
    <Scene>
      <div style={{ ...col, alignItems: 'center', textAlign: 'center', gap: '3vh' }}>
        <motion.img src={`${B}hudhud-tiktok-logo.svg`} initial={{ scale: 0.2, rotate: 20 }} animate={{ scale: 1, rotate: 0 }} transition={{ ...pop, delay: 0.1 }}
          style={{ width: '48vw', borderRadius: '10vw' }} />
        <Line size={13} d={0.5} color="#E6B55C">Ethio HUDHUD</Line>
        <Line size={8} d={0.8}>تعلّم الأمهرية بالعربية</Line>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.3 }} dir="ltr"
          style={{ fontSize: '6.5vw', fontWeight: 700, letterSpacing: '0.05em' }}>ethiohudhud.com</motion.div>
      </div>
    </Scene>
  );
}
