import { router } from "expo-router";
import { useFavourites, useFavouriteToggle, useGetProfile } from "@workspace/api-client-react";
import { Action, Card, Failure, Loading, Txt } from "./LearningUI";

export function FavouriteButton({ id }: { id: string }) {
  const f = useFavouriteToggle(id);
  return <>
    <Action secondary icon="bookmark" title={f.saved ? "إزالة من المحفوظات" : "حفظ لوقت لاحق"} disabled={f.disabled} onPress={f.toggle} />
    {f.error && <Txt accessibilityRole="alert">تعذّر تحديث المحفوظات. حاول مجدداً.</Txt>}
  </>;
}
export function SavedItems() {
  const q = useFavourites();
  const profile = useGetProfile();
  return <>
    <Txt>{profile.data?.isGuest ? "محفوظات الضيف تخص هذه الجلسة فقط. سجّل الدخول للحفظ عبر الأجهزة؛ محفوظات الضيف لا تنتقل إلى الحساب." : "محفوظات حسابك متاحة عبر الأجهزة، مستقلة عن الإنجاز. المواد المؤرشفة لا تظهر هنا."}</Txt>
    {q.isLoading && <Loading />}
    {q.isError && <Failure retry={q.refetch} />}
    {!q.isError && q.data?.length === 0 && <Txt>لا مواد محفوظة بعد.</Txt>}
    {!q.isError && q.data?.map(l => <Card key={l.id}>
      <Action title={`${l.dialogue?.length ? "محادثة" : "درس"} · ${l.titleAr}${l.completed ? " · مكتمل" : ""}`} onPress={() => router.push({ pathname: "/lesson/[id]", params: { id: l.id } })} />
      <FavouriteButton id={l.id} />
    </Card>)}
  </>;
}
