import { getGetBillingStatusQueryKey, useGetBillingStatus } from "@workspace/api-client-react";
import { router } from "expo-router";
import { Action, Card, Failure, Loading, Txt, styles } from "@/components/LearningUI";

export function CourseAccess({ compact = false }: { compact?: boolean }) {
  const q = useGetBillingStatus({ query: { queryKey: getGetBillingStatusQueryKey(), refetchInterval: 60_000, refetchOnWindowFocus: true } });
  const b = q.data;
  if (q.isLoading) return compact ? null : <Loading />;
  if (q.isError || !b) return compact ? null : <Failure retry={q.refetch} />;
  const date = (s: string) => new Date(s).toLocaleDateString("ar");
  return <Card testID="card-course-access">
    <Txt style={styles.subheading}>التجربة وخطط الدورة</Txt>
    {b.plan === "complimentary" && b.accessExpiresAt
      ? <Txt>منحة مجانية من الإدارة حتى {date(b.accessExpiresAt)}، وليست اشتراكًا مدفوعًا.</Txt>
      : <Txt>{b.trial.state === "active"
        ? `تجربتك المجانية 48 ساعة؛ متبقٍ ${b.trial.daysRemaining} يوم، حتى ${date(b.trial.endsAt)}.`
        : "انتهت تجربة اليومين. اطّلع على خطط الدورة؛ التعلّم ما زال مفتوحًا أثناء إعداد الدفع."}</Txt>}
    {b.reminder && <Txt accessibilityRole="alert">{b.reminder.kind === "complimentary_expiring"
      ? "تنتهي منحتك المجانية قريبًا"
      : b.reminder.kind === "renewal_due" ? "اقترب موعد التجديد" : "اقترب انتهاء الوصول إلى الدورة"}: {date(b.reminder.expiresAt)}، متبقٍ {b.reminder.daysRemaining} يوم. تنبيه داخل التطبيق فقط.</Txt>}
    {compact ? <Action title="عرض الخطط" secondary onPress={() => router.push("/account")} /> : <>
      <Txt>كامل دروس الأمهرية والمحادثات العملية للمبتدئ والمتوسط والمتقدم في برنامج مدته ستة أشهر.</Txt>
      {b.offers.map(offer => <Card key={offer.id}>
        <Txt style={styles.subheading}>{offer.id === "monthly" ? "الاشتراك الشهري" : "ستة أشهر دفعة واحدة"}</Txt>
        <Txt>{offer.priceUsd} دولار أمريكي {offer.billing === "monthly" ? "شهريًا" : "مرة واحدة"}</Txt>
        <Txt>{offer.billing === "monthly"
          ? `كل دفعة تغطي شهرًا واحدًا. الإجمالي ${offer.sixMonthTotalUsd} دولارًا لستة أشهر؛ يلزم التجديد لمتابعة الشهر التالي.`
          : `وصول كامل لمدة ${offer.durationMonths} أشهر. توفير ${offer.savingsUsd} دولارًا (${offer.savingsPercent}٪) مقارنة بست دفعات شهرية.`}</Txt>
        <Action title="الدفع غير متاح بعد" disabled onPress={() => {}} />
      </Card>)}
      <Txt>{b.message}</Txt>
      <Txt>تظهر التذكيرات داخل التطبيق قبل التجديد أو انتهاء الوصول بأربعة أيام. لا يتم إرسال بريد إلكتروني أو إشعارات في الخلفية. لا تحصيل أو اشتراك مدفوع قبل تفعيل Polar.</Txt>
    </>}
  </Card>;
}
