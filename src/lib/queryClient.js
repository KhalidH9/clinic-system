// import { QueryClient } from '@tanstack/react-query';
// import { persistQueryClient } from '@tanstack/react-query-persist-client';
// import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';
// import { logger } from './logger';

// export const queryClient = new QueryClient({
//   logger: {
//     log:   logger.info,
//     warn:  logger.warn,
//     error: logger.error,
//   },
//   defaultOptions: {
//     queries: {
//       suspense: true,
//       staleTime: 5 * 60 * 1_000,   // 5 min
//       cacheTime: 60 * 60 * 1_000,  // 1 h
//       retry: (failureCount, error) => {
//         // Never retry 4xx
//         if (error?.status && String(error.status).startsWith('4')) return false;
//         return failureCount < 3;
//       },
//       refetchOnWindowFocus: true,
//       networkMode: 'online',
//     },
//     mutations: {
//       networkMode: 'online',
//       onError: (error, vars, ctx) => logger.error('Mutation error', { error, vars, ctx }),
//     },
//   },
// });

// if (typeof window !== 'undefined') {
//   persistQueryClient({
//     queryClient,
//     persister: createSyncStoragePersister({ storage: window.localStorage }),
//   });
// }

// src/lib/queryClient.js
import { QueryClient } from '@tanstack/react-query';
import {
  persistQueryClient,
  PersistQueryClientProvider,
} from '@tanstack/react-query-persist-client';
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';
import { logger } from './logger';

/* --------------------------- core query client --------------------------- */
export const queryClient = new QueryClient({
  logger: {
    log:   logger.info,
    warn:  logger.warn,
    error: logger.error,
  },
  defaultOptions: {
    queries: {
      suspense: true,
      staleTime: 5 * 60 * 1_000,
      cacheTime: 60 * 60 * 1_000,
      retry: 1,
      refetchOnWindowFocus: true,
    },
    mutations: {
      onError: (err, vars) => logger.error('Mutation error', { err, vars }),
    },
  },
});

/* -------------------------- persister & helpers -------------------------- */
const storagePersister = createSyncStoragePersister({
  storage: typeof window !== 'undefined' ? window.localStorage : undefined,
});

/**
 * Initialise persistence for a specific user.
 * The `buster` makes TanStack discard any persisted cache whose buster
 * string does not match the current value.
 */
export const setupPersistor = (userId = 'anonymous') => {
  persistQueryClient({
    queryClient,
    persister: storagePersister,
    buster: userId, // ▶︎ different user ⇒ different cache
  });
  logger.info('Query persistence initialised', { userId });
};

/** Hard wipe of both in‑memory and persisted caches (used on logout). */
export const clearPersistedCache = async () => {
  await storagePersister.removeClient();
  queryClient.clear();
  logger.info('Query cache cleared');
};