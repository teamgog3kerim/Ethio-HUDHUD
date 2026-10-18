import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { MessageCircle, Send, Trash2 } from 'lucide-react';
import {
  getGetChatQueryKey, useClearChat, useGetChat, useGetProfile, useSendChat,
} from '@workspace/api-client-react';
import { Btn, Empty, ErrorState, PageHead, Skeleton } from '@/components/bits';
import { AiAllowance } from '@/components/admin/notices';
import { Shell } from '@/components/shell';
import { useToast } from '@/hooks/use-toast';
import { useApp } from '@/lib/app';
import { SCENARIOS } from '@/lib/options';
import { cn } from '@/lib/utils';
import { Logo } from '@/components/logo';

export default function Tutor() {
  const { t, lang } = useApp();
  const qc = useQueryClient();
  const { toast } = useToast();
  const chat = useGetChat();
  const profile = useGetProfile();
  const [text, setText] = useState('');
  const [scenario, setScenario] = useState('free');
  const [pending, setPending] = useState<string | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const end = useRef<HTMLDivElement>(null);

  const send = useSendChat({
    mutation: {
      onSuccess: () => { qc.invalidateQueries({ queryKey: getGetChatQueryKey() }); },
      onSettled: () => setPending(null),
    },
  });
  const clear = useClearChat({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getGetChatQueryKey() });
        setConfirmClear(false);
        toast({ title: t('تم مسح المحادثة', 'Conversation cleared') });
      },
    },
  });

  useEffect(() => { end.current?.scrollIntoView({ behavior: 'smooth' }); }, [chat.data?.length, pending]);

  const submit = () => {
    const m = text.trim();
    if (!m || send.isPending) return;
    setPending(m);
    setText('');
    send.mutate({ data: { message: m, scenario } });
  };

  return (
    <Shell>
      <PageHead eyebrow={t('معلّم بالذكاء الاصطناعي', 'AI tutor')} title={t('تدرّب على المحادثة', 'Practise conversation')}
        sub={t('هذا نموذج ذكاء اصطناعي وليس معلمًا بشريًا؛ قد يخطئ. اكتب بالعربية أو الأمهرية.', 'This is an AI model, not a human teacher; it can make mistakes. Write in Arabic or Amharic.')}
        right={chat.data && chat.data.length > 0 && (
          confirmClear ? (
            <div className="flex gap-2">
              <Btn variant="danger" size="sm" disabled={clear.isPending} onClick={() => clear.mutate()} data-testid="button-confirm-clear">{t('تأكيد المسح', 'Confirm clear')}</Btn>
              <Btn variant="outline" size="sm" onClick={() => setConfirmClear(false)}>{t('إلغاء', 'Cancel')}</Btn>
            </div>
          ) : <Btn variant="outline" size="sm" onClick={() => setConfirmClear(true)} data-testid="button-clear-chat"><Trash2 className="size-4" />{t('مسح السجل', 'Clear history')}</Btn>
        )} />

      <AiAllowance />
      <div className="mb-4 flex gap-2 overflow-x-auto pb-1" role="tablist">
        {SCENARIOS.map((s) => (
          <button key={s.id} type="button" onClick={() => setScenario(s.id)} data-testid={`button-scenario-${s.id}`}
            className={cn('press shrink-0 rounded-full border px-4 py-2 text-sm font-semibold', scenario === s.id ? 'border-gold bg-gold text-gold-foreground' : 'border-border bg-card')}>
            {lang === 'ar' ? s.ar : s.en}
          </button>
        ))}
      </div>

      <div className="flex h-[58dvh] flex-col rounded-3xl border border-border bg-card">
        <div className="flex-1 space-y-3 overflow-y-auto p-4" data-testid="list-chat">
          {chat.isLoading && <><Skeleton className="h-14 w-2/3" /><Skeleton className="ms-auto h-14 w-1/2" /></>}
          {chat.isError && <ErrorState onRetry={() => chat.refetch()} what={t('المحادثة', 'the chat')} />}
          {chat.data && chat.data.length === 0 && !pending && (
            <Empty icon={<MessageCircle />} title={t('ابدأ بتحية', 'Begin with a greeting')} body={t('جرّب: ሰላም (سلام) أو اطلب منه أن يعلّمك كيف تعرّف بنفسك.', 'Try: ሰላም (hello) or ask how to introduce yourself.')} />
          )}
          {chat.data?.map((m) => <Bubble key={m.id} role={m.role} content={m.content} />)}
          {pending && <Bubble role="user" content={pending} />}
          {send.isPending && (
            <div className="flex items-center gap-2 text-muted-foreground"><Logo size={26} />
              <span className="flex gap-1"><i className="dot size-1.5 rounded-full bg-current" /><i className="dot size-1.5 rounded-full bg-current [animation-delay:.2s]" /><i className="dot size-1.5 rounded-full bg-current [animation-delay:.4s]" /></span>
            </div>
          )}
          {send.isError && <p className="text-center text-sm text-destructive" data-testid="text-chat-error">{t('تعذّر إرسال الرسالة. حاول مرة أخرى.', 'Could not send the message. Please retry.')}</p>}
          <div ref={end} />
        </div>
        <form className="flex gap-2 border-t border-border p-3" onSubmit={(e) => { e.preventDefault(); submit(); }}>
          <input value={text} onChange={(e) => setText(e.target.value)} maxLength={2000} dir="auto" data-testid="input-chat"
            placeholder={t('اكتب رسالتك...', 'Write your message...')}
            className="h-12 min-w-0 flex-1 rounded-2xl border border-input bg-background px-4 outline-none focus:border-primary" />
          <Btn type="submit" disabled={!text.trim() || send.isPending} size="lg" className="px-5" data-testid="button-send" aria-label={t('إرسال', 'Send')}><Send className="size-5 rtl:-scale-x-100" /></Btn>
        </form>
      </div>
      <p className="mt-3 text-xs text-muted-foreground" data-testid="text-retain">
        {profile.data?.retainChat ? t('يُحفظ سجل المحادثة. يمكنك تغيير ذلك من الحساب.', 'Chat history is kept. Change this in Account.') : t('حفظ السجل متوقف في إعداداتك.', 'History retention is off in your settings.')}
      </p>
    </Shell>
  );
}

function Bubble({ role, content }: { role: 'user' | 'assistant'; content: string }) {
  const mine = role === 'user';
  return (
    <div className={cn('rise flex', mine ? 'justify-start' : 'justify-end')}>
      <p dir="auto" data-testid={`msg-${role}`} className={cn('max-w-[85%] whitespace-pre-wrap rounded-3xl px-4 py-3 leading-relaxed', mine ? 'bg-primary text-primary-foreground' : 'bg-secondary')}>
        {content}
      </p>
    </div>
  );
}
