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
    ['ما نخزّنه', 'What we store', 'ملفك التعليمي: الاسم، المستوى، الأهداف، التقدّم، المراجعات، وسجل المعلّم إن فعّلته، ووقت بدء تجربة اليومين. للضيوف نستخدم ملف تعريف ارتباط آمن. عند تسجيل الدخول من المتصفح نفسه يبقى وقت بدء التجربة الأقدم لمنع إعادة تشغيلها؛ لا تنتقل الدروس أو المفضلة أو المحادثات تلقائيًا.', 'Your learning profile: name, level, goals, progress, reviews, tutor chat if enabled, and the start of your two-day trial. Guests use a secure cookie. Signing in from the same browser preserves the earlier trial start so it does not restart; lessons, favourites, and conversations do not transfer automatically.'],
    ['المعلّم الآلي', 'AI tutor', 'تُرسل رسائلك إلى نموذج ذكاء اصطناعي للرد. لا تكتب معلومات حساسة.', 'Your messages are sent to an AI model to reply. Do not write sensitive information.'],
    ['تذكيرات الخلفية', 'Background reminders', 'إذا اخترت تفعيلها، نخزّن عنوان اشتراك الإشعارات أو رمز الجهاز والمنطقة الزمنية وحالة محاولات الإرسال، مرتبطة بحسابك على هذا الجهاز. تُمرّر الإشعارات عبر مزوّد المتصفح أو Expo وخدمات Apple/Google. لا نرسل محتوى دروسك أو محادثاتك. يمكنك إيقافها من إعدادات التذكير؛ تسجيل الخروج يوقف تسجيل الجهاز. قد يتأخر الإشعار أو لا يصل، ولا يمكن استرجاع إشعار سبق تسليمه للنظام. تبقى تنبيهات التطبيق متاحة.', 'If you opt in, we store a push subscription or device token, timezone, and delivery-attempt status for your account on this device. Notifications pass through your browser push provider or Expo and Apple/Google services. Lesson and chat content is not sent. Turn them off in reminder settings; signing out unregisters the device. Notifications may be delayed or lost, and messages already handed to the system cannot be recalled. In-app alerts remain available.'],
    ['التحكم في بياناتك', 'Your control', 'يمكنك من صفحة الحساب تصدير بياناتك أو حذفها، وإيقاف حفظ سجل المحادثة.', 'In Account you can export or delete your data and switch off chat retention.'],
    ['حدود الحذف', 'Deletion scope', 'إجراء الحذف يزيل بيانات التعلّم فقط. يبقى حساب تسجيل الدخول منفصلاً. يُحتفظ بعدّادات استخدام لا تحتوي نصوص المحادثات عند إيقاف حفظ السجل.', 'Deletion removes learning data only; the sign-in identity remains separate. Content-free usage counters remain when chat retention is disabled.'],
  ]}><AnalyticsPreference /></Doc>;
}

export function Terms() {
  return <Doc title="شروط الاستخدام" titleEn="Terms of Use" secs={[
    ['طبيعة المحتوى', 'Nature of content', 'المحتوى تجريبي وينتظر مراجعة مؤهلة وقد يحتوي أخطاء. الصوت غير متوفر بعد.', 'Content is pilot material awaiting qualified review and may contain errors. Audio is not yet available.'],
    ['لا ضمان', 'No guarantee', 'الخدمة تُقدَّم كما هي دون وعد بنتائج أو إتقان.', 'The service is provided as is, with no promise of results or fluency.'],
    ['الدفع', 'Payments', 'خلال المرحلة التجريبية لا توجد رسوم ولا دفع، وكل التعلّم مفتوح. الأسعار المقترحة: 29 دولارًا شهريًا (174 دولارًا لستة أشهر) أو 149 دولارًا مرة واحدة لوصول ستة أشهر. تجربة مجانية مدة 48 ساعة. مزوّد الدفع Polar قيد الانتظار ولم يُفعَّل الدفع. قد تُضاف لاحقًا تنبيهات داخل التطبيق قبل 4 أيام من الانتهاء. لا نَعِد بتجديد تلقائي أو استرداد لم يُقرَّر بعد.', 'During the pilot there are no charges or payments and all learning is open. Proposed prices: $29 per month ($174 over six months) or $149 once for six months of access. A free 48-hour trial applies. The Polar payment provider is pending and checkout is not enabled. In-app reminders may be added about 4 days before expiry. We do not promise automatic billing or refunds that are not yet established.'],
  ]} />;
}
