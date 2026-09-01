---
name: tanstack-query
description: Write and review TanStack Query (React Query) v5 code following community best practices. Use when working with useQuery, useMutation, useInfiniteQuery, useSuspenseQuery, queryOptions, queryClient, query keys/invalidation, prefetching, or optimistic updates.
---

# TanStack Query

Conventions for writing idiomatic TanStack Query (React Query) **v5** code. These reflect the maintainer (TkDodo) recommended patterns. Prefer them unless the project clearly does something else — match the existing codebase first.

## Core mental model

- Queries are **declarative**, not imperative. Never call `refetch()` to fetch with different params. Put the changing value in the query key and let the key drive the refetch.
- `staleTime` is your primary lever against excessive refetching. Default is `0` (always stale). Set a sensible `staleTime` for data that doesn't change every second.
- Query results are stale-while-revalidate: cached data shows instantly, refetch happens in the background on mount / window focus / reconnect.
- Treat the query key like a `useEffect` dependency array: **everything used inside `queryFn` must be in the key.**

## queryOptions + query factories (the default pattern)

Prefer the `queryOptions` helper colocated in a per-feature factory over standalone custom hooks. It gives type safety (tagged keys for `getQueryData`/`setQueryData`), and the same object works in `useQuery`, `useSuspenseQuery`, `prefetchQuery`, `useQueries`, etc.

```ts
import { queryOptions } from '@tanstack/react-query'

export const todoQueries = {
  all: () => ['todos'] as const,
  lists: () => [...todoQueries.all(), 'list'] as const,
  list: (filters: string) =>
    queryOptions({
      queryKey: [...todoQueries.lists(), { filters }] as const,
      queryFn: () => fetchTodos(filters),
    }),
  details: () => [...todoQueries.all(), 'detail'] as const,
  detail: (id: number) =>
    queryOptions({
      queryKey: [...todoQueries.details(), id] as const,
      queryFn: () => fetchTodo(id),
      staleTime: 5000,
    }),
}
```

Usage:

```ts
useQuery(todoQueries.detail(id))
queryClient.prefetchQuery(todoQueries.list(filters))
queryClient.invalidateQueries({ queryKey: todoQueries.lists() })
queryClient.getQueryData(todoQueries.detail(id).queryKey) // typed, not unknown
```

## Query keys

- **Always arrays.** Required in v5.
- **Structure most-generic → most-specific**: `['todos', 'list', { filters }]`, `['todos', 'detail', id]`. This enables fuzzy invalidation (`['todos']` clears everything todo-related).
- **Colocate** keys with their queries in a feature folder, not a global `queryKeys.ts`.
- `useQuery` and `useInfiniteQuery` must not share a key.

## Calling useQuery

Pass a factory entry, never an inline options object:

```ts
const { data, isPending, isError, error } = useQuery(todoQueries.list(filters))
```

- v5 status names: `isPending` (not `isLoading` for the base status), `isError`, `isSuccess`. `isLoading` now means `isPending && isFetching` (first load). `isFetching` is the background-activity flag.
- Use `enabled` for dependent queries: `enabled: !!userId`. To add per-call options, spread the factory entry: `useQuery({ ...todoQueries.detail(id), enabled: !!id })`.
- Use `select` to subscribe to a derived slice and reduce re-renders.
- Use `placeholderData: keepPreviousData` for paginated/filtered lists to avoid UI flashing on key change.

### Always branch on the query state — never reach blindly into `data`

`data` is `undefined` while pending and on error. Guard with the states TanStack Query gives you; do not paper over it with `?.`/`??`.

```tsx
// ❌ hides loading/error, ships fake values to the UI
const unreadCount = inboxQuery.data?.unreadCount ?? 0

// ✅ handle the states explicitly, then data is safe to read
if (isPending) return <Spinner />
if (isError) return <ErrorBanner error={error} />
return <InboxBadge unreadCount={data.unreadCount} />
```

- Render `isPending` and `isError` branches before touching `data`. After those guards, `data` is defined and you can access it directly.
- Use `useSuspenseQuery` if you'd rather delegate the pending/error branches to `<Suspense>`/`<ErrorBoundary>` — then `data` is guaranteed defined.
- Reserve `?? defaultValue` for genuinely optional fields *within* loaded data, not as a substitute for the pending/error states.

## Mutations

```ts
const queryClient = useQueryClient()

const { mutate } = useMutation({
  mutationFn: updateTodo,
  onSuccess: (newTodo) => {
    queryClient.setQueryData(['todos', 'detail', newTodo.id], newTodo)
    queryClient.invalidateQueries({ queryKey: ['todos', 'list'] })
  },
})
```

- After a mutation, **invalidate** affected queries (simplest, correct) or `setQueryData` for targeted updates. Prefer invalidation unless you have a reason to hand-write the update.
- Return the promise from `invalidateQueries` in `onSuccess` if you want the mutation to stay pending until refetch completes.
- Use `onSettled` for logic that should run on both success and error.

### Optimistic updates

Prefer the simpler UI-only variant (use `mutation.variables` + `isPending` to render pending state) over cache manipulation when possible. When you do touch the cache:

```ts
useMutation({
  mutationFn: updateTodo,
  onMutate: async (newTodo) => {
    await queryClient.cancelQueries({ queryKey: ['todos', 'detail', newTodo.id] })
    const previous = queryClient.getQueryData(['todos', 'detail', newTodo.id])
    queryClient.setQueryData(['todos', 'detail', newTodo.id], newTodo)
    return { previous }
  },
  onError: (_err, newTodo, ctx) => {
    queryClient.setQueryData(['todos', 'detail', newTodo.id], ctx?.previous)
  },
  onSettled: (newTodo) => {
    queryClient.invalidateQueries({ queryKey: ['todos', 'detail', newTodo.id] })
  },
})
```

## Suspense

Use `useSuspenseQuery` when you want Suspense/ErrorBoundary handling. `data` is guaranteed defined (never `undefined`), no `isPending` branch needed. Don't use `enabled` with it — for conditional fetching keep `useQuery`.

## Configuration

- Set global defaults once on the `QueryClient` (`defaultOptions.queries.staleTime`, `retry`, `gcTime`).
- Create the `QueryClient` in a stable place (module scope, or `useState(() => new QueryClient())` in an app component) — never inline in render.
- `gcTime` (default 5 min) controls how long inactive data is cached; `staleTime` controls when it refetches. They're independent.

## Common mistakes to flag in review

- Calling `refetch()` to change parameters instead of changing the key.
- Missing dependencies in the query key (stale data on param change).
- `staleTime: 0` everywhere causing refetch storms, or `useEffect` + `setState` wrappers around query data.
- Putting all keys in one global file instead of colocated factories.
- Creating `QueryClient` inside a component body (new client every render wipes the cache).
- Using `isLoading` where `isPending` is meant.
- Reaching into `data` with `data?.unreadCount ?? 0` instead of branching on `isPending`/`isError` first — this ships fake/default values to the UI and hides loading and error states.
- Inlining a `{ queryKey, queryFn }` object in `useQuery` instead of calling a `queryOptions` factory entry.
- Manual `try/catch` around fetches that should be query/mutation error states.

## Source of truth

If unsure about an exact API (option names, v5 vs older), consult the official docs at https://tanstack.com/query/latest rather than guessing — several names changed in v5 (`cacheTime`→`gcTime`, `isLoading`→`isPending`, `keepPreviousData` is now `placeholderData: keepPreviousData`, `useErrorBoundary`→`throwOnError`).
