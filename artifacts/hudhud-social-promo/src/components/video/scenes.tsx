import { motion } from 'framer-motion';
import type { CSSProperties, ReactNode } from 'react';

const G = '#104C3C', G2 = '#166A56', GOLD = '#E6B55C', INK = '#112722', BG = '#F6F7F3';
const logo = `${import.meta.env.BASE_URL}logo.svg`;
const ease = [0.2, 0.8, 0.2, 1] as const;
const fill: CSSProperties = { position: 'absolute', inset: 0 };

const Fade = ({ children, bg }: { children: ReactNode; bg: string }) => (
  <motion.div style={{ ...fill, background: bg, overflow: 'hidden' }}
    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
    {children}
  </motion.div>
);

const Pop = ({ children, d = 0, style }: { children: ReactNode; d?: number; style?: CSSProperties }) => (
  <motion.div style={style} initial={{ opacity: 0, y: 6 + 'vw', scale: 0.85 }} animate={{ opacity: 1, y: 0, scale: 1 }}
    transition={{ type: 'spring', stiffness: 260, damping: 20, delay: d }}>{children}</motion.div>
);

const Center = ({ children, gap = 4 }: { children: ReactNode; gap?: number }) => (
  <div style={{ ...fill, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: gap + 'vw', padding: '0 7vw', textAlign: 'center' }}>{children}</div>
);

const Ring = ({ c, s, d = 0 }: { c: string; s: number; d?: number }) => (
  <motion.div style={{ position: 'absolute', left: '50%', top: '50%', width: s + 'vw', height: s + 'vw', marginLeft: -s / 2 + 'vw', marginTop: -s / 2 + 'vw', borderRadius: '50%', border: `0.8vw solid ${c}`, opacity: 0.4 }}
    initial={{ scale: 0.3, opacity: 0 }} animate={{ scale: 1, opacity: 0.4 }} transition={{ duration: 1.2, delay: d, ease }} />
);

export function Hook() {
  return (
    <Fade bg={G}>
      <Ring c={GOLD} s={150} /><Ring c={G2} s={105} d={0.15} />
      <Center>
        <motion.img src={logo} style={{ width: '34vw', borderRadius: '8vw' }} initial={{ scale: 0, rotate: -20 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 260, damping: 16 }} />
        <Pop d={0.5}><div className="disp" style={{ color: BG, fontSize: '11vw', fontWeight: 800, lineHeight: 1.25 }}>تعلّم الأمهرية</div></Pop>
        <Pop d={0.9}><div className="disp" style={{ color: GOLD, fontSize: '11vw', fontWeight: 700 }}>خطوة بخطوة</div></Pop>
        <Pop d={1.8}><div className="am" style={{ color: BG, opacity: 0.85, fontSize: '11vw', fontWeight: 800 }}>ሰላም!</div></Pop>
      </Center>
    </Fade>
  );
}

const letters = [['አ', 'أ'], ['በ', 'بَ'], ['ገ', 'گَ'], ['ደ', 'دَ'], ['ሀ', 'هَ'], ['ሰ', 'سَ']];
export function Alphabet() {
  return (
    <Fade bg={BG}>
      <div style={{ ...fill, display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: '16vh', gap: '3vw' }}>
        <Pop><div className="disp" style={{ color: G, fontSize: '10vw', fontWeight: 800 }}>ابدأ بالحروف</div></Pop>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4vw', width: '84vw', marginTop: '3vw' }}>
          {letters.map(([a, ar], i) => (
            <motion.div key={a} initial={{ opacity: 0, scale: 0.5, rotate: i % 2 ? 8 : -8 }} animate={{ opacity: 1, scale: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 280, damping: 18, delay: 0.4 + i * 0.28 }}
              style={{ background: i % 3 === 0 ? G : '#fff', color: i % 3 === 0 ? BG : INK, borderRadius: '5vw', padding: '4vw 0', textAlign: 'center', boxShadow: '0 2vw 5vw -2vw rgba(16,76,60,.35)' }}>
              <div className="am" style={{ fontSize: '19vw', fontWeight: 800, lineHeight: 1.1 }}>{a}</div>
              <div className="disp" style={{ fontSize: '7vw', color: i % 3 === 0 ? GOLD : G2, fontWeight: 700 }}>{ar}</div>
            </motion.div>
          ))}
        </div>
        <Pop d={2.6}><div style={{ color: INK, fontSize: '4.4vw', opacity: 0.75 }}>النطق بالحروف العربية — تقريبي</div></Pop>
      </div>
    </Fade>
  );
}

const months = [['١', 'مبتدئ', 'الحروف والأرقام'], ['٣', 'متوسط', 'جمل وحياة يومية'], ['٦', 'متقدم', 'محادثات حقيقية']];
export function Path() {
  return (
    <Fade bg={G2}>
      <div style={{ ...fill, display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: '15vh', gap: '5vw' }}>
        <Pop><div className="disp" style={{ color: BG, fontSize: '11vw', fontWeight: 800 }}>٦ أشهر · ٣ مراحل</div></Pop>
        <div style={{ position: 'relative', width: '84vw' }}>
          <motion.div style={{ position: 'absolute', right: '9vw', top: 0, width: '1.2vw', background: GOLD, transformOrigin: 'top' }} initial={{ height: 0 }} animate={{ height: '100%' }} transition={{ duration: 2.4, delay: 0.3, ease: 'linear' }} />
          {months.map(([n, t, s], i) => (
            <motion.div key={t} initial={{ opacity: 0, x: -30 + 'vw' }} animate={{ opacity: 1, x: 0 }} transition={{ type: 'spring', stiffness: 240, damping: 22, delay: 0.5 + i * 0.8 }}
              style={{ display: 'flex', alignItems: 'center', gap: '5vw', marginBottom: '6vw' }}>
              <div className="disp" style={{ width: '19vw', height: '19vw', borderRadius: '50%', background: GOLD, color: G, fontSize: '10vw', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{n}</div>
              <div style={{ background: BG, borderRadius: '4vw', padding: '3.5vw 5vw', flex: 1 }}>
                <div className="disp" style={{ color: G, fontSize: '7vw', fontWeight: 800 }}>{t}</div>
                <div style={{ color: INK, fontSize: '4.5vw' }}>{s}</div>
              </div>
            </motion.div>
          ))}
        </div>
        <Pop d={3.3}><div style={{ color: BG, fontSize: '4.2vw', opacity: 0.85 }}>مسار دراسي مقترح لتتبّع تقدّمك</div></Pop>
      </div>
    </Fade>
  );
}

const lines = [['ሰላም፣ እንዴት ነህ?', 'سلام، كيف حالك؟', false], ['ደህና ነኝ፣ አመሰግናለሁ', 'بخير، شكراً', true], ['ስምህ ማን ነው?', 'ما اسمك؟', false]] as const;
export function Convo() {
  return (
    <Fade bg="#EDEFE7">
      <div style={{ ...fill, display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: '15vh', gap: '4vw' }}>
        <Pop><div className="disp" style={{ color: G, fontSize: '10vw', fontWeight: 800 }}>محادثات من الحياة</div></Pop>
        <div style={{ width: '86vw', display: 'flex', flexDirection: 'column', gap: '4vw', marginTop: '2vw' }}>
          {lines.map(([am, ar, me], i) => (
            <motion.div key={am} initial={{ opacity: 0, y: 8 + 'vw', scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ type: 'spring', stiffness: 260, damping: 20, delay: 0.4 + i * 0.9 }}
              style={{ alignSelf: me ? 'flex-end' : 'flex-start', background: me ? G : '#fff', color: me ? BG : INK, borderRadius: '5vw', padding: '4vw 5vw', maxWidth: '78vw', boxShadow: '0 2vw 4vw -2vw rgba(16,76,60,.3)' }}>
              <div className="am" style={{ fontSize: '7vw', fontWeight: 600 }}>{am}</div>
              <div style={{ fontSize: '4.6vw', color: me ? GOLD : G2, textAlign: 'right', direction: 'rtl' }}>{ar}</div>
            </motion.div>
          ))}
        </div>
      </div>
    </Fade>
  );
}

export function Trial() {
  return (
    <Fade bg={GOLD}>
      <Center>
        <motion.div className="disp" style={{ color: G, fontSize: '46vw', fontWeight: 800, lineHeight: 1 }} initial={{ scale: 2, opacity: 0, filter: 'blur(10px)' }} animate={{ scale: 1, opacity: 1, filter: 'blur(0px)' }} transition={{ duration: 0.6, ease }}>٤٨</motion.div>
        <Pop d={0.4}><div className="disp" style={{ color: G, fontSize: '12vw', fontWeight: 800 }}>ساعة تجربة مجانية</div></Pop>
        <Pop d={1}><div style={{ color: INK, fontSize: '5vw' }}>جرّب الدروس كلها وابدأ اليوم</div></Pop>
      </Center>
    </Fade>
  );
}

export function Outro() {
  return (
    <Fade bg={G}>
      <Ring c={GOLD} s={120} />
      <Center gap={5}>
        <motion.img src={logo} style={{ width: '40vw', borderRadius: '9vw' }} initial={{ scale: 0.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 220, damping: 16 }} />
        <Pop d={0.3}><div className="disp" style={{ color: BG, fontSize: '12vw', fontWeight: 800 }}>إيثيو هدهد</div></Pop>
        <Pop d={0.5}><div style={{ color: GOLD, fontSize: '5.4vw', fontWeight: 600 }}>تعلّم الأمهرية بالعربية</div></Pop>
        <Pop d={0.8}><div dir="ltr" style={{ color: BG, fontSize: '6vw', fontWeight: 600, letterSpacing: '0.2vw', borderTop: `0.5vw solid ${GOLD}`, paddingTop: '3vw' }}>ethiohudhud.com</div></Pop>
      </Center>
    </Fade>
  );
}
