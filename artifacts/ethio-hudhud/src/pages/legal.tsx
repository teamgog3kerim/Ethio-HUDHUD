import { PublicFrame } from '@/components/shell';
import { useApp } from '@/lib/app';
import { AnalyticsPreference } from '@/components/analytics-preference';
import type { ReactNode } from 'react';

type Sec = [string, string, string, string];

function Doc({ title, titleEn, secs, children }: { title: string; titleEn: string; secs: Sec[]; children?: ReactNode }) {
  const { t } = useApp();
  return (
    <PublicFrame>
      <h1 className="font-display mb-2 mt-8 text-4xl font-extrabold">{t(title, titleEn)}</h1>
      <p className="mb-8 rounded-2xl bg-gold/15 p-3 text-sm">{t('مسوّدة لمشروع تجريبي، لم تُراجَع قانونيًا بعد.', 'A draft for a pilot project; not yet legally reviewed.')}</p>
      <div className="space-y-6">
        {secs.map((s, i) => (
          <section key={i}><h2 className="font-display mb-1 text-lg font-bold">{t(s[0], s[1])}</h2><p className="leading-relaxed text-muted-foreground">{t(s[2], s[3])}</p></section>
        ))}
      </div>
      {children}
    </PublicFrame>
  );
}

export function Privacy() {
  return <Doc title="سياسة الخصوصية" titleEn="Privacy Policy" secs={[
    ['ما نخزّنه', 'What we store', 'ملفك التعليمي: الاسم، المستوى، الأهداف، التقدّم، المراجعات، وسجل المعلّم إن فعّلته. للضيوف نستخدم ملف تعريف ارتباط آمن.', 'Your learning profile: name, level, goals, progress, reviews, and tutor chat if enabled. Guests use a secure cookie.'],
    ['المعلّم الآلي', 'AI tutor', 'تُرسل رسائلك إلى نموذج ذكاء اصطناعي للرد. لا تكتب معلومات حساسة.', 'Your messages are sent to an AI model to reply. Do not write sensitive information.'],
    ['التحكم في بياناتك', 'Your control', 'يمكنك من صفحة الحساب تصدير بياناتك أو حذفها، وإيقاف حفظ سجل المحادثة.', 'In Account you can export or delete your data and switch off chat retention.'],
    ['حدود الحذف', 'Deletion scope', 'إجراء الحذف يزيل بيانات التعلّم فقط. يبقى حساب تسجيل الدخول منفصلاً. يُحتفظ بعدّادات استخدام لا تحتوي نصوص المحادثات عند إيقاف حفظ السجل.', 'Deletion removes learning data only; the sign-in identity remains separate. Content-free usage counters remain when chat retention is disabled.'],
  ]}><AnalyticsPreference /></Doc>;
}

export function Terms() {
  return <Doc title="شروط الاستخدام" titleEn="Terms of Use" secs={[
    ['طبيعة المحتوى', 'Nature of content', 'المحتوى تجريبي وينتظر مراجعة مؤهلة وقد يحتوي أخطاء. الصوت غير متوفر بعد.', 'Content is pilot material awaiting qualified review and may contain errors. Audio is not yet available.'],
    ['لا ضمان', 'No guarantee', 'الخدمة تُقدَّم كما هي دون وعد بنتائج أو إتقان.', 'The service is provided as is, with no promise of results or fluency.'],
    ['الدفع', 'Payments', 'لا توجد اشتراكات مدفوعة حاليًا.', 'There are no paid subscriptions at present.'],
  ]} />;
}
