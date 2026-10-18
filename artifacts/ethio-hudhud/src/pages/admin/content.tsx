import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { BookOpen, Plus } from 'lucide-react';
import { useGetAdminLessons, useSaveAdminLesson, type AdminLesson, type AdminLessonInput } from '@workspace/api-client-react';
import { Btn, Card, Empty, ErrorState, Skeleton } from '@/components/bits';
import { AdminLayout } from '@/components/admin/layout';
import { Field, Modal, Notice, fieldCls } from '@/components/admin/ui';
import { useApp } from '@/lib/app';
import { errMsg, invalidateAdmin } from '@/lib/admin';

type Target = { lesson: AdminLesson | null; template: AdminLesson | null };

function Editor({ target, onClose, onDone }: { target: Target; onClose: () => void; onDone: (m: string) => void }) {
  const { t } = useApp();
  const qc = useQueryClient();
  const src = target.lesson ?? target.template;
  const isNew = !target.lesson;
  const [id, setId] = useState(target.lesson?.id ?? '');
  const [courseId, setCourseId] = useState(src?.courseId ?? '');
  const [sequence, setSequence] = useState(src ? src.sequence + (isNew ? 1 : 0) : 0);
  const [active, setActive] = useState(target.lesson?.active ?? true);
  const [content, setContent] = useState(JSON.stringify(src?.content ?? {}, null, 2));
  const [key, setKey] = useState(JSON.stringify(src?.answerKey ?? [], null, 2));
  const [reason, setReason] = useState('');
  const [err, setErr] = useState('');
  const m = useSaveAdminLesson({
    mutation: {
      onSuccess: () => { invalidateAdmin(qc, 'lessons'); onDone(t('تم حفظ الدرس. عاد إلى حالة التجريب (pilot) بانتظار المراجعة.', 'Lesson saved. It is back to pilot status awaiting review.')); onClose(); },
      onError: (e) => setErr(errMsg(e, t('تعذّر الحفظ.', 'Could not save.'))),
    },
  });
  const submit = () => {
    setErr('');
    if (!id.trim() || !courseId.trim()) return setErr(t('المعرّف والمقرر مطلوبان.', 'Lesson id and course id are required.'));
    if (!(sequence >= 0 && sequence <= 10000)) return setErr(t('الترتيب بين 0 و10000.', 'Sequence must be 0 to 10000.'));
    if (reason.trim().length < 3) return setErr(t('اكتب سببًا (3 أحرف على الأقل).', 'Enter a reason (at least 3 characters).'));
    let c: unknown; let k: unknown;
    try { c = JSON.parse(content); } catch (e) { return setErr(t('خطأ في JSON للمحتوى: ', 'Content JSON error: ') + (e as Error).message); }
    try { k = JSON.parse(key); } catch (e) { return setErr(t('خطأ في JSON لمفتاح الإجابات: ', 'Answer key JSON error: ') + (e as Error).message); }
    if (!c || typeof c !== 'object' || Array.isArray(c)) return setErr(t('المحتوى يجب أن يكون كائنًا.', 'Content must be a JSON object.'));
    if (!Array.isArray(k) || !k.every((x) => x && typeof x.correctIndex === 'number' && x.correctIndex >= 0 && x.correctIndex <= 8 && typeof x.explanation === 'string'))
      return setErr(t('مفتاح الإجابات مصفوفة من {correctIndex 0-8, explanation}.', 'Answer key must be an array of {correctIndex 0-8, explanation}.'));
    const data: AdminLessonInput = { courseId: courseId.trim(), sequence, active, content: c as AdminLessonInput['content'], answerKey: k as AdminLessonInput['answerKey'], reason: reason.trim() };
    m.mutate({ id: id.trim(), data });
  };
  return (
    <Modal title={isNew ? t('درس جديد', 'New lesson') : t('تعديل الدرس', 'Edit lesson')} onClose={onClose}>
      <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); submit(); }}>
        <Notice kind="info">{isNew && src ? t('الحقول مبدوءة من درس موجود كمثال للبنية. عدّلها قبل الحفظ.', 'Fields start from an existing lesson as a structural example. Edit them before saving.') : t('أي حفظ يعيد الدرس إلى حالة التجريب؛ لا يمكن اعتماد المراجعة من هنا.', 'Any save resets the lesson to pilot; review approval cannot be set from here.')}</Notice>
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label={t('معرّف الدرس', 'Lesson id')}><input dir="ltr" className={fieldCls} value={id} disabled={!isNew} onChange={(e) => setId(e.target.value)} data-testid="input-lesson-id" /></Field>
          <Field label={t('معرّف المقرر', 'Course id')}><input dir="ltr" className={fieldCls} value={courseId} onChange={(e) => setCourseId(e.target.value)} data-testid="input-lesson-course" /></Field>
          <Field label={t('الترتيب', 'Sequence')}><input type="number" className={fieldCls} value={sequence} onChange={(e) => setSequence(Number(e.target.value))} data-testid="input-lesson-sequence" /></Field>
        </div>
        <label className="flex items-center gap-3 text-sm font-semibold"><input type="checkbox" className="size-5 accent-[hsl(var(--primary))]" checked={active} onChange={(e) => setActive(e.target.checked)} data-testid="toggle-lesson-active" />{t('نشط (إلغاؤه يؤرشف الدرس)', 'Active (unchecking archives the lesson)')}</label>
        <Field label={t('المحتوى (JSON)', 'Content (JSON object)')}><textarea dir="ltr" rows={10} spellCheck={false} className={fieldCls + ' font-mono text-xs'} value={content} onChange={(e) => setContent(e.target.value)} data-testid="input-lesson-content" /></Field>
        <p className="text-sm text-muted-foreground">{t('حقل transliteration مخصّص للنطق التقريبي بالحروف العربية، وليس للترجمة أو للحروف اللاتينية. مثال: ሰላም ← سَلَام.', 'The transliteration field requires approximate pronunciation in Arabic script, not a translation or Latin letters. Example: ሰላም → سَلَام.')}</p>
        <Field label={t('مفتاح الإجابات (JSON)', 'Answer key (JSON array)')}><textarea dir="ltr" rows={6} spellCheck={false} className={fieldCls + ' font-mono text-xs'} value={key} onChange={(e) => setKey(e.target.value)} data-testid="input-lesson-key" /></Field>
        <Field label={t('السبب', 'Reason')}><textarea rows={2} maxLength={500} className={fieldCls} value={reason} onChange={(e) => setReason(e.target.value)} data-testid="input-lesson-reason" /></Field>
        {err && <Notice kind="err">{err}</Notice>}
        <div className="flex justify-end gap-2"><Btn variant="outline" onClick={onClose}>{t('إلغاء', 'Cancel')}</Btn><Btn type="submit" disabled={m.isPending} data-testid="button-lesson-save">{m.isPending ? t('جارٍ الحفظ…', 'Saving…') : t('حفظ', 'Save')}</Btn></div>
      </form>
    </Modal>
  );
}

function Body() {
  const { t } = useApp();
  const q = useGetAdminLessons();
  const [target, setTarget] = useState<Target | null>(null);
  const [done, setDone] = useState('');
  if (q.isLoading) return <div className="space-y-2">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-20" />)}</div>;
  if (q.isError || !q.data) return <ErrorState what={t('الدروس', 'lessons')} onRetry={() => void q.refetch()} />;
  const lessons = [...q.data].sort((a, b) => a.courseId.localeCompare(b.courseId) || a.sequence - b.sequence);
  return (
    <div className="space-y-4">
      <div className="flex justify-end"><Btn onClick={() => setTarget({ lesson: null, template: lessons[0] ?? null })} data-testid="button-new-lesson"><Plus className="size-4" />{t('درس جديد', 'New lesson')}</Btn></div>
      {done && <Notice kind="ok">{done}</Notice>}
      {lessons.length === 0 ? <Empty icon={<BookOpen className="size-6" />} title={t('لا توجد دروس', 'No lessons yet')} />
        : (
          <ul className="space-y-2">
            {lessons.map((l) => {
              const c = l.content as Record<string, unknown>;
              const title = [c.titleEn, c.titleAr].find((x) => typeof x === 'string') as string | undefined;
              return (
                <li key={l.id} data-testid={`row-lesson-${l.id}`}>
                  <Card className="flex flex-wrap items-center justify-between gap-3 !p-4">
                    <div className="min-w-0">
                      <p className="truncate font-bold">{title ?? l.id}</p>
                      <p className="text-xs text-muted-foreground" dir="ltr">{l.id} · {l.courseId} · #{l.sequence}</p>
                      <div className="mt-1.5 flex gap-1.5 text-xs font-semibold">
                        <span className="rounded-full bg-secondary px-2.5 py-1">{t('المراجعة', 'Review')}: {l.reviewStatus}</span>
                        <span className={l.active ? 'rounded-full bg-primary/15 px-2.5 py-1' : 'rounded-full bg-muted px-2.5 py-1'}>{l.active ? t('نشط', 'Active') : t('مؤرشف', 'Archived')}</span>
                      </div>
                    </div>
                    <Btn size="sm" variant="outline" onClick={() => setTarget({ lesson: l, template: null })} data-testid={`button-edit-lesson-${l.id}`}>{t('تعديل', 'Edit')}</Btn>
                  </Card>
                </li>
              );
            })}
          </ul>
        )}
      {target && <Editor target={target} onClose={() => setTarget(null)} onDone={setDone} />}
    </div>
  );
}

export default function AdminContent() {
  const { t } = useApp();
  return <AdminLayout title={t('المحتوى', 'Content')} sub={t('التعديل يعيد الدرس إلى حالة التجريب؛ لا تُختلق حالة مراجعة.', 'Editing resets a lesson to pilot; review status is never fabricated.')}><Body /></AdminLayout>;
}
