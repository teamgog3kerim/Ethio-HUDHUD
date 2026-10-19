import { useQueryClient } from "@tanstack/react-query";
import { getGetFavouritesQueryKey, useGetFavourites, useRemoveFavourite, useSaveFavourite } from "./generated/api";

export function useFavourites() {
  // Periodic refresh also removes material archived by an administrator or
  // reflects changes made on another device while this screen stays open.
  return useGetFavourites({ query: { queryKey: getGetFavouritesQueryKey(), staleTime: 0, refetchInterval: 30_000, refetchOnWindowFocus: true } });
}

export function useFavouriteToggle(id: string) {
  const query = useFavourites();
  const client = useQueryClient();
  const refresh = () => client.invalidateQueries({ queryKey: getGetFavouritesQueryKey() });
  const save = useSaveFavourite({ mutation: { onSuccess: refresh, onError: refresh } });
  const remove = useRemoveFavourite({ mutation: { onSuccess: refresh, onError: refresh } });
  const saved = query.data?.some(l => l.id === id) ?? false;
  return {
    saved,
    disabled: !query.data || query.isError || query.isFetching || save.isPending || remove.isPending,
    error: save.isError || remove.isError || query.isError,
    toggle: () => (saved ? remove : save).mutate({ id }),
  };
}
