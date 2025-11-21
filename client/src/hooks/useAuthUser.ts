import { useCurrentUserQuery } from '../store';

export function useAuthUser() {
  const query = useCurrentUserQuery();
  return {
    user: query.data?.user || null,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    refetch: query.refetch,
  };
}
