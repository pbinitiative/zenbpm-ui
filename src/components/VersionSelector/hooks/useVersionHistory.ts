import { useCallback, useMemo } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { getDmnResourceDefinitions, getProcessDefinitions } from '@base/openapi';
import {
  getLatestVersionKey,
  getNextVersionPage,
  mergeVersionPages,
  versionPageParams,
  type VersionsPage,
} from '../utils';
import type { VersionOption } from '../VersionSelector';

/** A definition's version list, loaded a page at a time, newest first */
export interface VersionHistory<T extends VersionOption = VersionOption> {
  /** The versions loaded so far, newest first */
  versions: T[];
  /**
   * Key of the latest version. Undefined until the first page has loaded,
   * and while the last attempt to load or refresh the list has failed:
   * "latest" is then unknown.
   */
  latestKey?: string;
  /** The first page is loading */
  loading: boolean;
  /** Older versions remain to be loaded */
  hasMore: boolean;
  loadingMore: boolean;
  /** Loads the next page of older versions */
  loadMore: () => void;
  /**
   * What failed: loading or refreshing the list ('list'), or loading the
   * next page of older versions ('olderVersions'), which leaves the loaded
   * pages and the latest version valid
   */
  error?: 'list' | 'olderVersions';
  /** Repeats the request that failed */
  retry: () => void;
}

interface VersionHistoryOptions {
  /**
   * How long the loaded list counts as fresh. A definition page passes 0,
   * so that it requests the list again whenever it opens a definition of
   * another process, or the same one after a visit elsewhere. The Start
   * Instance dialog keeps the default, reusing what the page has just loaded.
   */
  staleTime?: number;
}

type FetchVersionsPage<T> = (page: number, signal: AbortSignal) => Promise<VersionsPage<T>>;

function useVersionHistory<T extends VersionOption>(
  queryKey: readonly unknown[],
  fetchPage: FetchVersionsPage<T> | undefined,
  { staleTime }: VersionHistoryOptions,
): VersionHistory<T> {
  const query = useInfiniteQuery({
    queryKey,
    // Never called without fetchPage: the query is then disabled
    queryFn: ({ pageParam, signal }) =>
      fetchPage ? fetchPage(pageParam, signal) : Promise.reject(new Error('No definition to load versions of')),
    initialPageParam: 1,
    getNextPageParam: getNextVersionPage,
    enabled: fetchPage !== undefined,
    // One retry: the selector then shows the failure with a Retry action,
    // instead of a spinner through a long backoff
    retry: 1,
    ...(staleTime !== undefined && { staleTime }),
  });

  const { data, hasNextPage, isError, isFetching, isFetchingNextPage, isFetchNextPageError, fetchNextPage, refetch } =
    query;
  const versions = useMemo(() => mergeVersionPages(data?.pages ?? []), [data]);
  const error = isFetchNextPageError ? 'olderVersions' : isError ? 'list' : undefined;
  // After a failed refresh, the list kept may lack newer versions
  const latestKey = data && error !== 'list' ? getLatestVersionKey(versions) : undefined;

  const loadMore = useCallback(() => {
    // Not while the loaded pages are refetched, which this would cancel, nor
    // after a failure: scrolling would repeat the request without end
    if (hasNextPage && !isFetching && !isError) void fetchNextPage();
  }, [hasNextPage, isFetching, isError, fetchNextPage]);

  const retry = useCallback(() => {
    void (isFetchNextPageError ? fetchNextPage() : refetch());
  }, [isFetchNextPageError, fetchNextPage, refetch]);

  const loading = query.isLoading;
  // Stable while nothing changes, as it feeds memoized metadata fields
  return useMemo(
    () => ({
      versions,
      latestKey,
      loading,
      hasMore: hasNextPage,
      loadingMore: isFetchingNextPage,
      loadMore,
      error,
      retry,
    }),
    [versions, latestKey, loading, hasNextPage, isFetchingNextPage, loadMore, error, retry],
  );
}

/** Versions of the process `bpmnProcessId`, shared by every component showing them */
export function useProcessVersionHistory(
  bpmnProcessId: string | undefined,
  options: VersionHistoryOptions = {},
) {
  const fetchPage = useMemo(
    () =>
      bpmnProcessId
        ? (page: number, signal: AbortSignal) =>
            getProcessDefinitions({ bpmnProcessId, ...versionPageParams(page) }, undefined, signal)
        : undefined,
    [bpmnProcessId],
  );
  return useVersionHistory(['versionHistory', 'process', bpmnProcessId], fetchPage, options);
}

/** Versions of the DMN resource `dmnResourceDefinitionId` */
export function useDecisionVersionHistory(
  dmnResourceDefinitionId: string | undefined,
  options: VersionHistoryOptions = {},
) {
  const fetchPage = useMemo(
    () =>
      dmnResourceDefinitionId
        ? (page: number, signal: AbortSignal) =>
            getDmnResourceDefinitions(
              { dmnResourceDefinitionId, ...versionPageParams(page) },
              undefined,
              signal,
            )
        : undefined,
    [dmnResourceDefinitionId],
  );
  return useVersionHistory(['versionHistory', 'decision', dmnResourceDefinitionId], fetchPage, options);
}
