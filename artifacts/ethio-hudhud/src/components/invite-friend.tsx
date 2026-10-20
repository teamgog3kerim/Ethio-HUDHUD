import { useEffect, useRef, useState } from 'react';
import { Check, Copy, Send, Share2, UserPlus } from 'lucide-react';
import {
  INVITE_APP_URL,
  INVITE_MESSAGES,
  getInviteLinks,
  getInviteText,
} from '@workspace/api-client-react';
import { Btn, btnClass } from '@/components/bits';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { useApp } from '@/lib/app';

type Status = { kind: 'ok' | 'error' | 'info'; text: string } | null;

function finalText(draft: string) {
  const d = draft.trim();
  if (d.includes(INVITE_APP_URL)) return d;
  return d ? `${d}\n${INVITE_APP_URL}` : INVITE_APP_URL;
}

export function InviteFriend({ className, compact }: { className?: string; compact?: boolean }) {
  const { t, lang } = useApp();
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);
  const [draft, setDraft] = useState('');
  const [status, setStatus] = useState<Status>(null);
  const [busy, setBusy] = useState(false);
  const [manual, setManual] = useState(false);
  const busyRef = useRef(false);
  const areaRef = useRef<HTMLTextAreaElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const templates = INVITE_MESSAGES.slice(0, 4);

  useEffect(() => {
    if (open) {
      setIndex(0);
      setDraft(getInviteText(0, lang));
    }
    setStatus(null);
    setManual(false);
  }, [open, lang]);

  const pick = (i: number) => {
    setIndex(i);
    setDraft(getInviteText(i, lang));
    setStatus(null);
    setManual(false);
  };

  const text = finalText(draft);
  const links = getInviteLinks(text);

  const share = async () => {
    if (busyRef.current) return;
    if (typeof navigator === 'undefined' || typeof navigator.share !== 'function') {
      setStatus({ kind: 'info', text: t('مشاركة النظام غير متاحة هنا. انسخ الرسالة أو استخدم واتساب أو تيليجرام.', 'System sharing is not available here. Copy the message or use WhatsApp or Telegram.') });
      return;
    }
    busyRef.current = true;
    setBusy(true);
    setStatus(null);
    try {
      await navigator.share({ title: 'Ethio HUDHUD', text });
      setStatus({ kind: 'ok', text: t('تم فتح قائمة المشاركة.', 'The share menu was opened.') });
    } catch (e) {
      if (!(e instanceof DOMException && e.name === 'AbortError') && !(e as { name?: string })?.name?.includes('AbortError')) {
        setStatus({ kind: 'error', text: t('تعذّرت المشاركة. يمكنك نسخ الرسالة أو استخدام الروابط أدناه.', 'Sharing failed. You can copy the message or use the links below.') });
      }
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  };

  const copy = async () => {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setStatus(null);
    try {
      await navigator.clipboard.writeText(text);
      setManual(false);
      setStatus({ kind: 'ok', text: t('تم نسخ الرسالة. الصقها في أي محادثة.', 'Message copied. Paste it into any chat.') });
    } catch {
      setManual(true);
      setDraft(text);
      setStatus({ kind: 'error', text: t('تعذّر النسخ تلقائيًا. حدّد النص أدناه وانسخه يدويًا.', 'Could not copy automatically. Select the text below and copy it manually.') });
      setTimeout(() => areaRef.current?.select(), 0);
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  };

  const linkCls =
    'press inline-flex h-11 min-w-0 flex-1 items-center justify-center gap-2 rounded-2xl border border-input bg-card px-4 text-[15px] font-semibold hover:bg-muted';

  return (
    <>
      <button
        type="button"
        ref={triggerRef}
        className={btnClass(compact ? 'outline' : 'gold', compact ? 'sm' : 'md', className)}
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        data-testid="button-invite-friend"
      >
        <UserPlus className="size-4" />
        {t('ادعُ صديقًا', 'Invite a friend')}
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className="w-[calc(100%-1.5rem)] max-w-lg rounded-3xl border-border bg-card p-5 sm:p-6"
          dir={lang === 'ar' ? 'rtl' : 'ltr'}
          data-testid="dialog-invite-friend"
          onCloseAutoFocus={(event) => { event.preventDefault(); triggerRef.current?.focus(); }}
        >
          <DialogHeader className="px-5 text-start">
            <DialogTitle className="font-display text-xl font-extrabold leading-snug">
              {t('ادعُ صديقًا لتعلّم الأمهرية', 'Invite a friend to learn Amharic')}
            </DialogTitle>
            <DialogDescription>
              {t('اختر رسالة، عدّلها كما تشاء، ثم شاركها.', 'Pick a message, edit it, then share it.')}
            </DialogDescription>
          </DialogHeader>

          <div role="radiogroup" aria-label={t('قوالب الدعوة', 'Invitation templates')} className="grid gap-2">
            {templates.map((m, i) => {
              const on = i === index;
              return (
                <button
                  key={i}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  tabIndex={on ? 0 : -1}
                  onClick={() => pick(i)}
                  onKeyDown={(event) => {
                    const offset = event.key === 'ArrowDown' || event.key === 'ArrowRight' ? 1
                      : event.key === 'ArrowUp' || event.key === 'ArrowLeft' ? -1 : 0;
                    if (!offset && event.key !== 'Home' && event.key !== 'End') return;
                    event.preventDefault();
                    const next = event.key === 'Home' ? 0 : event.key === 'End' ? templates.length - 1
                      : (i + offset + templates.length) % templates.length;
                    pick(next);
                    document.querySelector<HTMLButtonElement>(`[data-testid="invite-template-${next}"]`)?.focus();
                  }}
                  data-testid={`invite-template-${i}`}
                  className={cn(
                    'flex items-start gap-3 rounded-2xl border p-3 text-start text-sm leading-relaxed transition-colors',
                    on ? 'border-primary bg-secondary' : 'border-input bg-card hover:bg-muted',
                  )}
                >
                  <span className={cn('mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border', on ? 'border-primary bg-primary text-primary-foreground' : 'border-input')}>
                    {on && <Check className="size-3" />}
                  </span>
                  <span className="min-w-0 break-words">{lang === 'ar' ? m.ar : m.en}</span>
                </button>
              );
            })}
          </div>

          <div className="grid gap-1.5">
            <label htmlFor="invite-draft" className="text-sm font-semibold">
              {t('نص الرسالة', 'Message text')}
            </label>
            <textarea
              id="invite-draft"
              ref={areaRef}
              value={draft}
              onChange={(e) => { setDraft(e.target.value); setStatus(null); setManual(false); }}
              rows={4}
              data-testid="input-invite-message"
              className="w-full resize-y rounded-2xl border border-input bg-background p-3 text-sm leading-relaxed"
            />
          </div>

          <div className="grid gap-1.5">
            <p className="text-sm font-semibold">{t('المعاينة النهائية', 'Final preview')}</p>
            <p
              data-testid="text-invite-preview"
              className="whitespace-pre-wrap break-words rounded-2xl border border-gold/50 bg-gold/10 p-3 text-sm leading-relaxed select-text"
            >
              {text}
            </p>
            {manual && (
              <p className="text-xs text-muted-foreground">{t('النص أعلاه قابل للتحديد للنسخ اليدوي.', 'The text above can be selected for manual copying.')}</p>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            <Btn variant="primary" className="min-w-0 flex-1" onClick={share} disabled={busy} data-testid="button-share-invite">
              <Share2 className="size-4" /> {t('مشاركة', 'Share')}
            </Btn>
            <Btn variant="outline" className="min-w-0 flex-1" onClick={copy} disabled={busy} data-testid="button-copy-invite">
              <Copy className="size-4" /> {t('نسخ', 'Copy')}
            </Btn>
          </div>
          <div className="flex flex-wrap gap-2">
            <a href={links.whatsapp} target="_blank" rel="noopener noreferrer" className={linkCls} data-testid="link-invite-whatsapp">
              <Send className="size-4" /> WhatsApp
            </a>
            <a href={links.telegram} target="_blank" rel="noopener noreferrer" className={linkCls} data-testid="link-invite-telegram">
              <Send className="size-4" /> Telegram
            </a>
          </div>

          <p
            role="status"
            aria-live="polite"
            data-testid="invite-status"
            className={cn('min-h-5 text-sm', status?.kind === 'error' ? 'text-destructive' : 'text-primary')}
          >
            {status?.text}
          </p>
        </DialogContent>
      </Dialog>
    </>
  );
}
