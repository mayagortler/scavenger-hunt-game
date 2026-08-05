# Open When App Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a working mobile app where a creator can build a labeled, optionally date-locked "package" of text/photo/audio/video content and share an unguessable link, and a recipient can open that link (in the app or a browser) to view the content once unlocked.

**Architecture:** One Expo (React Native) codebase targets iOS, Android, and web via Expo Router — the web build is what serves recipients who don't have the app installed. Supabase provides Postgres (data), Auth (creator accounts only), and Storage (media files). All security-sensitive rules — who can read a package's content, whether a package is sealed against new content, who can mark a package opened — are enforced in Postgres via Row Level Security and a small set of `SECURITY DEFINER` functions, never solely in the app.

**Tech Stack:** Expo (React Native, TypeScript, Expo Router), Supabase (Postgres, Auth, Storage, local dev via Supabase CLI), Jest + ts-jest for the one automated test suite (server-side lock enforcement).

## Global Constraints

- No push notifications (spec: out of scope for v1).
- No editing or adding content to a package once it is sealed (spec: "Post-send editing").
- Once opened, a package stays viewable indefinitely — never re-locks (spec: "Reread").
- Date locks must be enforced server-side (Postgres), not only hidden in the app UI (spec: "Server-enforced lock").
- Recipients never need an account; only creators do (spec: "Users").
- Package/content access is via an unguessable link ID, never a browsable/listable public table (spec: "Link security").

## Prerequisites (manual setup — do this before Task 1)

These are one-time environment steps a human needs to do; they are not part of the numbered tasks below.

1. Install [Node.js](https://nodejs.org) (LTS) and confirm with `node -v`.
2. Install [Docker Desktop](https://www.docker.com/products/docker-desktop/) and make sure it's running — local Supabase runs inside Docker containers.
3. Install the Supabase CLI: `npm install -g supabase`. Confirm with `supabase --version`.
4. Install the **Expo Go** app on a physical phone (iOS App Store or Google Play) — this is how you'll preview the app during development without building a native binary.
5. (Optional, only needed once you're ready to share a real link outside of Expo Go) Create a free account at supabase.com and a new project — the local Supabase stack used in this plan is enough to build and test everything first.

---

### Task 1: Initialize the Expo project

**Files:**
- Create: entire project scaffold via `create-expo-app` (package.json, app.json, tsconfig.json, app/ directory, etc.)

**Interfaces:**
- Consumes: nothing (first task)
- Produces: a runnable Expo project at the repository root, with Expo Router already configured (the default Expo template includes it)

- [ ] **Step 1: Scaffold the project**

```bash
npx create-expo-app@latest . --template blank-typescript
```

Run this in the repository root (`/Users/mayagortler/Desktop/Test`). Answer any prompts with defaults.

- [ ] **Step 2: Add Expo Router**

```bash
npx expo install expo-router react-native-safe-area-context react-native-screens expo-linking expo-constants expo-status-bar
```

Update `package.json`'s `"main"` field to `"expo-router/entry"`, and delete the default `App.tsx` (Expo Router uses file-based routing under `app/` instead).

- [ ] **Step 3: Create a minimal root route**

Create `app/_layout.tsx`:

```tsx
import { Stack } from 'expo-router';

export default function RootLayout() {
  return <Stack />;
}
```

Create `app/index.tsx`:

```tsx
import { Text, View } from 'react-native';

export default function Home() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text>Open When</Text>
    </View>
  );
}
```

- [ ] **Step 4: Run it and verify**

```bash
npx expo start
```

Scan the QR code with Expo Go on your phone. Expected: a screen showing the text "Open When".

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: scaffold Expo Router project"
```

---

### Task 2: Local Supabase and database schema

**Files:**
- Create: `supabase/config.toml` (generated)
- Create: `supabase/migrations/0001_init.sql`

**Interfaces:**
- Consumes: nothing
- Produces: two Postgres tables — `packages` and `content_pieces` — available on the local Supabase instance for every later task

- [ ] **Step 1: Initialize Supabase locally**

```bash
supabase init
supabase start
```

This starts local Postgres, Auth, Storage, and Studio in Docker. Expected output includes an `API URL` (`http://127.0.0.1:54321`), an `anon key`, and a `service_role key` — copy these somewhere temporarily, you'll need them in Task 3.

- [ ] **Step 2: Write the schema migration**

Create `supabase/migrations/0001_init.sql`:

```sql
create table packages (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references auth.users(id) on delete cascade,
  label text not null,
  recipient_name text not null,
  lock_type text not null check (lock_type in ('unlocked', 'date_locked')),
  unlock_date timestamptz,
  sealed boolean not null default false,
  opened boolean not null default false,
  created_at timestamptz not null default now(),
  constraint unlock_date_required check (
    (lock_type = 'unlocked' and unlock_date is null) or
    (lock_type = 'date_locked' and unlock_date is not null)
  )
);

create table content_pieces (
  id uuid primary key default gen_random_uuid(),
  package_id uuid not null references packages(id) on delete cascade,
  type text not null check (type in ('text', 'photo', 'audio', 'video')),
  content text not null,
  order_index integer not null,
  created_at timestamptz not null default now()
);

create index content_pieces_package_id_idx on content_pieces(package_id);

insert into storage.buckets (id, name, public)
values ('package-media', 'package-media', false)
on conflict (id) do nothing;
```

- [ ] **Step 3: Apply the migration**

```bash
supabase db reset
```

This drops and recreates the local database, applying all migrations in order.

- [ ] **Step 4: Verify in Studio**

Open the Studio URL printed by `supabase start` (typically `http://127.0.0.1:54323`). Expected: the Table Editor shows `packages` and `content_pieces` tables, and Storage shows a `package-media` bucket.

- [ ] **Step 5: Commit**

```bash
git add supabase/
git commit -m "feat: add packages and content_pieces schema"
```

---

### Task 3: Row Level Security, access functions, and the lock-enforcement test

**Files:**
- Create: `supabase/migrations/0002_rls.sql`
- Create: `package.json` test dependencies (modify)
- Create: `jest.config.js`
- Create: `tests/integration/env.setup.js`
- Create: `.env.test` (not committed)
- Create: `.env.test.example`
- Create: `tests/integration/rls.integration.test.ts`

**Interfaces:**
- Consumes: `packages` and `content_pieces` tables from Task 2
- Produces: RPC functions `get_package_by_link(p_id uuid)`, `get_package_content(p_id uuid)`, `mark_opened(p_id uuid)` — these are the only way the app ever reads/updates a package as a recipient (consumed by Task 5's `lib/packages.ts`)

- [ ] **Step 1: Write the RLS and RPC migration**

Create `supabase/migrations/0002_rls.sql`:

```sql
alter table packages enable row level security;
alter table content_pieces enable row level security;

create policy "creators manage own packages"
  on packages
  for all
  using (auth.uid() = creator_id)
  with check (auth.uid() = creator_id);

create policy "creators select own content pieces"
  on content_pieces
  for select
  using (
    exists (
      select 1 from packages p
      where p.id = content_pieces.package_id
        and p.creator_id = auth.uid()
    )
  );

create policy "creators insert content pieces into unsealed own packages"
  on content_pieces
  for insert
  with check (
    exists (
      select 1 from packages p
      where p.id = content_pieces.package_id
        and p.creator_id = auth.uid()
        and p.sealed = false
    )
  );

create policy "creators delete own content pieces before sealing"
  on content_pieces
  for delete
  using (
    exists (
      select 1 from packages p
      where p.id = content_pieces.package_id
        and p.creator_id = auth.uid()
        and p.sealed = false
    )
  );

create or replace function get_package_by_link(p_id uuid)
returns table (
  id uuid,
  label text,
  lock_type text,
  unlock_date timestamptz,
  sealed boolean,
  opened boolean
)
language sql
security definer
set search_path = public
as $$
  select id, label, lock_type, unlock_date, sealed, opened
  from packages
  where id = p_id;
$$;

create or replace function get_package_content(p_id uuid)
returns setof content_pieces
language sql
security definer
set search_path = public
as $$
  select cp.*
  from content_pieces cp
  join packages p on p.id = cp.package_id
  where cp.package_id = p_id
    and (p.lock_type = 'unlocked' or p.unlock_date <= now());
$$;

create or replace function mark_opened(p_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update packages
  set opened = true
  where id = p_id
    and (lock_type = 'unlocked' or unlock_date <= now());
$$;

grant execute on function get_package_by_link(uuid) to anon, authenticated;
grant execute on function get_package_content(uuid) to anon, authenticated;
grant execute on function mark_opened(uuid) to anon, authenticated;

create policy "creators upload media to own unsealed packages"
  on storage.objects
  for insert
  with check (
    bucket_id = 'package-media'
    and exists (
      select 1 from packages p
      where p.id::text = (storage.foldername(name))[1]
        and p.creator_id = auth.uid()
        and p.sealed = false
    )
  );

create policy "read unlocked package media"
  on storage.objects
  for select
  using (
    bucket_id = 'package-media'
    and exists (
      select 1 from packages p
      where p.id::text = (storage.foldername(name))[1]
        and (p.lock_type = 'unlocked' or p.unlock_date <= now())
    )
  );
```

- [ ] **Step 2: Apply it**

```bash
supabase db reset
```

- [ ] **Step 3: Install test tooling**

```bash
npm install --save-dev jest ts-jest @types/jest dotenv
npm install @supabase/supabase-js
```

- [ ] **Step 4: Configure Jest**

Create `jest.config.js`:

```js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/tests/integration/**/*.test.ts'],
  setupFiles: ['./tests/integration/env.setup.js'],
};
```

Create `tests/integration/env.setup.js`:

```js
require('dotenv').config({ path: '.env.test' });
```

Create `.env.test.example` (committed, as a template):

```
SUPABASE_URL=http://127.0.0.1:54321
SUPABASE_ANON_KEY=paste-local-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=paste-local-service-role-key-here
```

Copy it to `.env.test` and fill in the real values from `supabase status`:

```bash
cp .env.test.example .env.test
supabase status
```

Add `.env.test` and `.env` to `.gitignore` (create the file if it doesn't already have these lines):

```
.env
.env.test
node_modules/
```

- [ ] **Step 5: Write the failing test**

Create `tests/integration/rls.integration.test.ts`:

```ts
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const ANON_KEY = process.env.SUPABASE_ANON_KEY!;

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function createSignedInCreator(): Promise<SupabaseClient> {
  const email = `test-${Date.now()}-${Math.floor(Math.random() * 1e6)}@example.com`;
  const password = 'password123';

  const { error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (createError) throw createError;

  const client = createClient(SUPABASE_URL, ANON_KEY);
  const { error: signInError } = await client.auth.signInWithPassword({ email, password });
  if (signInError) throw signInError;

  return client;
}

describe('date lock enforcement', () => {
  it('hides content before the unlock date and reveals it after', async () => {
    const creator = await createSignedInCreator();
    const { data: userData } = await creator.auth.getUser();
    const creatorId = userData.user!.id;

    const { data: pkg, error: pkgError } = await creator
      .from('packages')
      .insert({
        creator_id: creatorId,
        label: 'Open when you are sad',
        recipient_name: 'Test Recipient',
        lock_type: 'date_locked',
        unlock_date: new Date(Date.now() + 60_000).toISOString(),
      })
      .select()
      .single();
    if (pkgError) throw pkgError;

    await creator.from('content_pieces').insert({
      package_id: pkg.id,
      type: 'text',
      content: 'secret message',
      order_index: 0,
    });

    const anon = createClient(SUPABASE_URL, ANON_KEY);
    const beforeUnlock = await anon.rpc('get_package_content', { p_id: pkg.id });
    expect(beforeUnlock.data).toEqual([]);

    await admin
      .from('packages')
      .update({ unlock_date: new Date(Date.now() - 1000).toISOString() })
      .eq('id', pkg.id);

    const afterUnlock = await anon.rpc('get_package_content', { p_id: pkg.id });
    expect(afterUnlock.data).toHaveLength(1);
    expect(afterUnlock.data![0].content).toBe('secret message');
  });
});

describe('sealed package protection', () => {
  it('rejects new content pieces once a package is sealed', async () => {
    const creator = await createSignedInCreator();
    const { data: userData } = await creator.auth.getUser();
    const creatorId = userData.user!.id;

    const { data: pkg } = await creator
      .from('packages')
      .insert({
        creator_id: creatorId,
        label: 'Open when you miss me',
        recipient_name: 'Test Recipient',
        lock_type: 'unlocked',
      })
      .select()
      .single();

    await creator.from('packages').update({ sealed: true }).eq('id', pkg!.id);

    const { error } = await creator.from('content_pieces').insert({
      package_id: pkg!.id,
      type: 'text',
      content: 'too late',
      order_index: 0,
    });

    expect(error).not.toBeNull();
  });
});
```

- [ ] **Step 6: Run it to verify it fails**

```bash
npx jest
```

Expected: FAIL, because `.env.test` may not yet have real values, or (once it does) because the RLS policies from Step 1 haven't been applied yet if you skipped Step 2. If both are done, this step should actually already pass — in that case, temporarily comment out the `or p.unlock_date <= now()` clause in `get_package_content` in `0002_rls.sql`, `supabase db reset`, confirm the test now fails on the "reveals it after" assertion, then restore the clause and reset again before Step 7. This confirms the test is actually checking something.

- [ ] **Step 7: Run it to verify it passes**

```bash
supabase db reset
npx jest
```

Expected: both tests PASS.

- [ ] **Step 8: Commit**

```bash
git add supabase/migrations/0002_rls.sql jest.config.js tests/ .env.test.example .gitignore package.json package-lock.json
git commit -m "feat: add RLS policies, access RPCs, and lock-enforcement test"
```

---

### Task 4: Supabase client and creator auth

**Files:**
- Create: `lib/supabase.ts`
- Create: `app/(auth)/login.tsx`
- Modify: `app/_layout.tsx`
- Create: `.env` (not committed)
- Create: `.env.example`

**Interfaces:**
- Consumes: `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY` env vars
- Produces: `supabase` client (default auth-aware Supabase client), exported from `lib/supabase.ts` — consumed by every later task that touches data

- [ ] **Step 1: Install auth dependencies**

```bash
npx expo install @react-native-async-storage/async-storage react-native-url-polyfill
npm install @supabase/supabase-js
```

- [ ] **Step 2: Create the Supabase client**

Create `lib/supabase.ts`:

```ts
import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  }
);
```

- [ ] **Step 3: Set environment variables**

Create `.env.example` (committed):

```
EXPO_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
EXPO_PUBLIC_SUPABASE_ANON_KEY=paste-local-anon-key-here
```

Copy to `.env` and fill in the same local anon key used in Task 3.

- [ ] **Step 4: Build the login screen**

Create `app/(auth)/login.tsx`:

```tsx
import { useState } from 'react';
import { View, TextInput, Button, Text } from 'react-native';
import { router } from 'expo-router';
import { supabase } from '../../lib/supabase';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<'signIn' | 'signUp'>('signIn');

  async function handleSubmit() {
    setError(null);
    const { error } =
      mode === 'signIn'
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password });

    if (error) {
      setError(error.message);
      return;
    }
    router.replace('/(creator)');
  }

  return (
    <View style={{ flex: 1, justifyContent: 'center', padding: 24, gap: 12 }}>
      <Text style={{ fontSize: 24 }}>{mode === 'signIn' ? 'Log in' : 'Sign up'}</Text>
      <TextInput
        placeholder="Email"
        autoCapitalize="none"
        value={email}
        onChangeText={setEmail}
        style={{ borderWidth: 1, padding: 10, borderRadius: 8 }}
      />
      <TextInput
        placeholder="Password"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
        style={{ borderWidth: 1, padding: 10, borderRadius: 8 }}
      />
      {error && <Text style={{ color: 'red' }}>{error}</Text>}
      <Button title={mode === 'signIn' ? 'Log in' : 'Sign up'} onPress={handleSubmit} />
      <Text onPress={() => setMode(mode === 'signIn' ? 'signUp' : 'signIn')}>
        {mode === 'signIn' ? "Don't have an account? Sign up" : 'Already have an account? Log in'}
      </Text>
    </View>
  );
}
```

- [ ] **Step 5: Wire root layout to redirect based on session**

Modify `app/_layout.tsx`:

```tsx
import { useEffect, useState } from 'react';
import { Stack, router, useSegments } from 'expo-router';
import { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

export default function RootLayout() {
  const [session, setSession] = useState<Session | null>(null);
  const [loaded, setLoaded] = useState(false);
  const segments = useSegments();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoaded(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!loaded) return;
    const inAuthGroup = segments[0] === '(auth)';
    const inPackageGroup = segments[0] === 'package';
    if (!session && !inAuthGroup && !inPackageGroup) {
      router.replace('/(auth)/login');
    } else if (session && inAuthGroup) {
      router.replace('/(creator)');
    }
  }, [session, loaded, segments]);

  return <Stack screenOptions={{ headerShown: false }} />;
}
```

Delete `app/index.tsx` from Task 1 — the redirect logic above now handles routing.

- [ ] **Step 6: Manual verification**

```bash
npx expo start
```

In Expo Go: expect to land on the login screen, sign up with a test email/password, and see the app attempt to navigate to `/(creator)` (a 404/blank screen is expected here since that route doesn't exist until Task 6 — confirm in the terminal logs that no auth error occurred).

- [ ] **Step 7: Commit**

```bash
git add lib/ app/ .env.example
git commit -m "feat: add Supabase client and creator auth"
```

---

### Task 5: Data access layer

**Files:**
- Create: `lib/packages.ts`

**Interfaces:**
- Consumes: `supabase` from `lib/supabase.ts` (Task 4); RPCs `get_package_by_link`, `get_package_content`, `mark_opened` from `supabase/migrations/0002_rls.sql` (Task 3)
- Produces (consumed by Tasks 6, 7, 9):
  - `type Package = { id, label, recipient_name, lock_type, unlock_date, sealed, opened, created_at }`
  - `type ContentPiece = { id, package_id, type, content, order_index, created_at }`
  - `createDraftPackage(params: { label, recipientName, lockType, unlockDate? }): Promise<Package>`
  - `addContentPiece(params: { packageId, type, content, orderIndex }): Promise<ContentPiece>`
  - `uploadPackageMedia(params: { packageId, fileUri, fileExtension }): Promise<string>` (returns the storage path to pass as `content`)
  - `sealPackage(packageId: string): Promise<void>`
  - `getMyPackages(): Promise<Package[]>`
  - `getPackageByLink(packageId: string): Promise<Package | null>`
  - `getPackageContent(packageId: string): Promise<ContentPiece[]>`
  - `getSignedMediaUrl(storagePath: string): Promise<string>`
  - `markPackageOpened(packageId: string): Promise<void>`

- [ ] **Step 1: Write the data access layer**

Create `lib/packages.ts`:

```ts
import { supabase } from './supabase';

export type LockType = 'unlocked' | 'date_locked';
export type ContentType = 'text' | 'photo' | 'audio' | 'video';

export interface Package {
  id: string;
  label: string;
  recipient_name: string;
  lock_type: LockType;
  unlock_date: string | null;
  sealed: boolean;
  opened: boolean;
  created_at: string;
}

export interface ContentPiece {
  id: string;
  package_id: string;
  type: ContentType;
  content: string;
  order_index: number;
  created_at: string;
}

export async function createDraftPackage(params: {
  label: string;
  recipientName: string;
  lockType: LockType;
  unlockDate?: string;
}): Promise<Package> {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) throw new Error('Must be signed in to create a package');

  const { data, error } = await supabase
    .from('packages')
    .insert({
      creator_id: userData.user.id,
      label: params.label,
      recipient_name: params.recipientName,
      lock_type: params.lockType,
      unlock_date: params.lockType === 'date_locked' ? params.unlockDate : null,
    })
    .select()
    .single();

  if (error) throw error;
  return data as Package;
}

export async function addContentPiece(params: {
  packageId: string;
  type: ContentType;
  content: string;
  orderIndex: number;
}): Promise<ContentPiece> {
  const { data, error } = await supabase
    .from('content_pieces')
    .insert({
      package_id: params.packageId,
      type: params.type,
      content: params.content,
      order_index: params.orderIndex,
    })
    .select()
    .single();

  if (error) throw error;
  return data as ContentPiece;
}

export async function uploadPackageMedia(params: {
  packageId: string;
  fileUri: string;
  fileExtension: string;
}): Promise<string> {
  const response = await fetch(params.fileUri);
  const blob = await response.blob();
  const filename = `${Date.now()}-${Math.floor(Math.random() * 1e6)}.${params.fileExtension}`;
  const path = `${params.packageId}/${filename}`;

  const { error } = await supabase.storage.from('package-media').upload(path, blob);
  if (error) throw error;
  return path;
}

export async function sealPackage(packageId: string): Promise<void> {
  const { error } = await supabase.from('packages').update({ sealed: true }).eq('id', packageId);
  if (error) throw error;
}

export async function getMyPackages(): Promise<Package[]> {
  const { data, error } = await supabase
    .from('packages')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data as Package[];
}

export async function getPackageByLink(packageId: string): Promise<Package | null> {
  const { data, error } = await supabase
    .rpc('get_package_by_link', { p_id: packageId })
    .maybeSingle();
  if (error) throw error;
  return data as Package | null;
}

export async function getPackageContent(packageId: string): Promise<ContentPiece[]> {
  const { data, error } = await supabase.rpc('get_package_content', { p_id: packageId });
  if (error) throw error;
  return (data ?? []) as ContentPiece[];
}

export async function getSignedMediaUrl(storagePath: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from('package-media')
    .createSignedUrl(storagePath, 3600);
  if (error) throw error;
  return data.signedUrl;
}

export async function markPackageOpened(packageId: string): Promise<void> {
  const { error } = await supabase.rpc('mark_opened', { p_id: packageId });
  if (error) throw error;
}
```

- [ ] **Step 2: Type-check it**

```bash
npx tsc --noEmit
```

Expected: no errors. (This file isn't covered by the Jest suite — it's a thin wrapper around behavior already proven by Task 3's RLS tests, so it's verified for real once it's wired into screens in Tasks 6, 7, and 9.)

- [ ] **Step 3: Commit**

```bash
git add lib/packages.ts
git commit -m "feat: add packages data access layer"
```

---

### Task 6: Creator dashboard

**Files:**
- Create: `app/(creator)/_layout.tsx`
- Create: `app/(creator)/index.tsx`

**Interfaces:**
- Consumes: `getMyPackages`, `Package` from `lib/packages.ts` (Task 5)
- Produces: the `/(creator)` route landing screen, with a link to `/(creator)/new` (built in Task 7)

- [ ] **Step 1: Create the creator route group layout**

Create `app/(creator)/_layout.tsx`:

```tsx
import { Stack } from 'expo-router';

export default function CreatorLayout() {
  return <Stack screenOptions={{ headerShown: true }} />;
}
```

- [ ] **Step 2: Build the dashboard screen**

Create `app/(creator)/index.tsx`:

```tsx
import { useCallback, useState } from 'react';
import { View, Text, FlatList, Pressable, Share } from 'react-native';
import { useFocusEffect, router } from 'expo-router';
import * as Linking from 'expo-linking';
import { getMyPackages, Package } from '../../lib/packages';

export default function Dashboard() {
  const [packages, setPackages] = useState<Package[]>([]);

  useFocusEffect(
    useCallback(() => {
      getMyPackages().then(setPackages).catch(console.error);
    }, [])
  );

  function shareLink(pkg: Package) {
    const url = Linking.createURL(`/package/${pkg.id}`);
    Share.share({ message: `${pkg.label}: ${url}` });
  }

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <Pressable
        onPress={() => router.push('/(creator)/new')}
        style={{ backgroundColor: '#4a90d9', padding: 14, borderRadius: 8, marginBottom: 16 }}
      >
        <Text style={{ color: 'white', textAlign: 'center' }}>New package</Text>
      </Pressable>

      <FlatList
        data={packages}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={{ borderWidth: 1, borderRadius: 8, padding: 14, marginBottom: 10 }}>
            <Text style={{ fontWeight: 'bold' }}>{item.label}</Text>
            <Text>For: {item.recipient_name}</Text>
            <Text>{item.opened ? 'Opened' : item.sealed ? 'Sent, not yet opened' : 'Draft'}</Text>
            {item.sealed && (
              <Pressable onPress={() => shareLink(item)} style={{ marginTop: 8 }}>
                <Text style={{ color: '#4a90d9' }}>Share link</Text>
              </Pressable>
            )}
          </View>
        )}
        ListEmptyComponent={<Text>No packages yet — tap "New package" to create one.</Text>}
      />
    </View>
  );
}
```

- [ ] **Step 3: Manual verification**

```bash
npx expo start
```

In Expo Go, log in: expect to land on the dashboard with an empty list and a working "New package" button (navigating to a not-yet-built screen is fine — confirm in Step 4 of Task 7 instead).

- [ ] **Step 4: Commit**

```bash
git add app/\(creator\)/
git commit -m "feat: add creator dashboard"
```

---

### Task 7: New package creation flow

**Design note (matches spec "Failed upload mid-creation"):** each content piece is uploaded and saved to the database the moment it's added, not batched at the end. If one upload fails, only that piece shows an error and can be retried — pieces already saved are unaffected. "Seal & send" only has to seal an already-fully-saved package, so it can't partially fail.

**Files:**
- Create: `app/(creator)/new.tsx`

**Interfaces:**
- Consumes: `createDraftPackage`, `addContentPiece`, `uploadPackageMedia`, `sealPackage`, `ContentType`, `LockType` from `lib/packages.ts` (Task 5)
- Produces: the `/(creator)/new` route, linked from Task 6's dashboard

- [ ] **Step 1: Install media picker dependencies**

```bash
npx expo install expo-image-picker expo-av
```

- [ ] **Step 2: Build the creation screen**

Create `app/(creator)/new.tsx`:

```tsx
import { useState, useRef } from 'react';
import { View, Text, TextInput, Button, Pressable, Switch, ScrollView } from 'react-native';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Audio } from 'expo-av';
import {
  createDraftPackage,
  addContentPiece,
  uploadPackageMedia,
  sealPackage,
  ContentType,
  Package,
} from '../../lib/packages';

const MAX_VIDEO_SECONDS = 60;
const MAX_RECORDING_MS = 120_000;

interface SavedPiece {
  status: 'saved';
  type: ContentType;
  label: string;
  orderIndex: number;
}

interface PendingPiece {
  status: 'uploading' | 'error';
  type: ContentType;
  label: string;
  orderIndex: number;
  text?: string;
  fileUri?: string;
  fileExtension?: string;
  error?: string;
}

type Piece = SavedPiece | PendingPiece;

export default function NewPackage() {
  const [label, setLabel] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [dateLocked, setDateLocked] = useState(false);
  const [unlockDate, setUnlockDate] = useState('');
  const [pkg, setPkg] = useState<Package | null>(null);
  const [pieces, setPieces] = useState<Piece[]>([]);
  const [textDraft, setTextDraft] = useState('');
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [sealing, setSealing] = useState(false);
  const nextOrderIndex = useRef(0);

  async function ensurePackage(): Promise<Package> {
    if (pkg) return pkg;
    if (!label.trim() || !recipientName.trim()) {
      throw new Error('Fill in a label and recipient name before adding content');
    }
    const created = await createDraftPackage({
      label,
      recipientName,
      lockType: dateLocked ? 'date_locked' : 'unlocked',
      unlockDate: dateLocked ? new Date(unlockDate).toISOString() : undefined,
    });
    setPkg(created);
    return created;
  }

  async function savePiece(
    orderIndex: number,
    type: ContentType,
    displayLabel: string,
    upload: (packageId: string) => Promise<string>
  ) {
    setPieces((p) => [...p, { status: 'uploading', type, label: displayLabel, orderIndex }]);
    try {
      const activePkg = await ensurePackage();
      const content = await upload(activePkg.id);
      await addContentPiece({ packageId: activePkg.id, type, content, orderIndex });
      setPieces((p) =>
        p.map((piece) =>
          piece.orderIndex === orderIndex ? { status: 'saved', type, label: displayLabel, orderIndex } : piece
        )
      );
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Upload failed';
      setPieces((p) =>
        p.map((piece) =>
          piece.orderIndex === orderIndex
            ? { ...(piece as PendingPiece), status: 'error', error: message }
            : piece
        )
      );
    }
  }

  function retryPiece(piece: PendingPiece) {
    setPieces((p) => p.filter((item) => item.orderIndex !== piece.orderIndex));
    if (piece.type === 'text') {
      savePiece(piece.orderIndex, 'text', piece.text!.slice(0, 40), async () => piece.text!);
    } else {
      savePiece(piece.orderIndex, piece.type, piece.type, (packageId) =>
        uploadPackageMedia({ packageId, fileUri: piece.fileUri!, fileExtension: piece.fileExtension! })
      );
    }
  }

  function addTextPiece() {
    if (!textDraft.trim()) return;
    const text = textDraft;
    const orderIndex = nextOrderIndex.current++;
    setTextDraft('');
    savePiece(orderIndex, 'text', text.slice(0, 40), async () => text);
  }

  async function addPhoto() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
    });
    if (result.canceled) return;
    const orderIndex = nextOrderIndex.current++;
    savePiece(orderIndex, 'photo', 'photo', (packageId) =>
      uploadPackageMedia({ packageId, fileUri: result.assets[0].uri, fileExtension: 'jpg' })
    );
  }

  async function addVideo() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      videoMaxDuration: MAX_VIDEO_SECONDS,
    });
    if (result.canceled) return;
    const orderIndex = nextOrderIndex.current++;
    savePiece(orderIndex, 'video', 'video', (packageId) =>
      uploadPackageMedia({ packageId, fileUri: result.assets[0].uri, fileExtension: 'mp4' })
    );
  }

  async function startRecording() {
    await Audio.requestPermissionsAsync();
    await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
    const { recording } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
    setRecording(recording);
    setTimeout(() => stopRecording(recording), MAX_RECORDING_MS);
  }

  async function stopRecording(active?: Audio.Recording) {
    const target = active ?? recording;
    if (!target) return;
    setRecording(null);
    await target.stopAndUnloadAsync();
    const uri = target.getURI();
    if (!uri) return;
    const orderIndex = nextOrderIndex.current++;
    savePiece(orderIndex, 'audio', 'voice memo', (packageId) =>
      uploadPackageMedia({ packageId, fileUri: uri, fileExtension: 'm4a' })
    );
  }

  const hasBlockingPiece = pieces.some((p) => p.status !== 'saved');
  const savedCount = pieces.filter((p) => p.status === 'saved').length;

  async function handleSeal() {
    if (!pkg || savedCount === 0 || hasBlockingPiece) return;
    setSealing(true);
    try {
      await sealPackage(pkg.id);
      router.replace('/(creator)');
    } finally {
      setSealing(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
      <TextInput
        placeholder="Label (e.g. Open when you're sad)"
        value={label}
        onChangeText={setLabel}
        editable={!pkg}
        style={{ borderWidth: 1, padding: 10, borderRadius: 8 }}
      />
      <TextInput
        placeholder="Recipient's name"
        value={recipientName}
        onChangeText={setRecipientName}
        editable={!pkg}
        style={{ borderWidth: 1, padding: 10, borderRadius: 8 }}
      />

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Text>Lock until a date</Text>
        <Switch value={dateLocked} onValueChange={setDateLocked} disabled={!!pkg} />
      </View>
      {dateLocked && (
        <TextInput
          placeholder="YYYY-MM-DD"
          value={unlockDate}
          onChangeText={setUnlockDate}
          editable={!pkg}
          style={{ borderWidth: 1, padding: 10, borderRadius: 8 }}
        />
      )}

      <Text style={{ fontWeight: 'bold', marginTop: 12 }}>Content ({savedCount})</Text>
      {pieces.map((piece) => (
        <View key={piece.orderIndex} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text>
            {piece.type}: {piece.label} —{' '}
            {piece.status === 'uploading' ? 'uploading...' : piece.status === 'error' ? piece.error : 'saved'}
          </Text>
          {piece.status === 'error' && <Button title="Retry" onPress={() => retryPiece(piece)} />}
        </View>
      ))}

      <TextInput
        placeholder="Write a text letter"
        value={textDraft}
        onChangeText={setTextDraft}
        style={{ borderWidth: 1, padding: 10, borderRadius: 8 }}
        multiline
      />
      <Button title="Add text" onPress={addTextPiece} />
      <Button title="Add photo" onPress={addPhoto} />
      <Button title="Add video (max 60s)" onPress={addVideo} />
      {recording ? (
        <Button title="Stop recording" onPress={() => stopRecording()} />
      ) : (
        <Button title="Record audio (max 2 min)" onPress={startRecording} />
      )}

      <Pressable
        onPress={handleSeal}
        disabled={sealing || hasBlockingPiece || savedCount === 0}
        style={{ backgroundColor: '#4a90d9', padding: 14, borderRadius: 8, marginTop: 16 }}
      >
        <Text style={{ color: 'white', textAlign: 'center' }}>
          {sealing ? 'Sealing...' : 'Seal & send'}
        </Text>
      </Pressable>
    </ScrollView>
  );
}
```

- [ ] **Step 3: Manual verification — happy path**

```bash
npx expo start
```

In Expo Go: from the dashboard, tap "New package," fill in a label and recipient name, add a text piece and a photo (each should briefly show "uploading..." then "saved"), leave it unlocked, tap "Seal & send." Expected: redirected back to the dashboard, and the new package appears in the list marked "Sent, not yet opened." Check the Supabase Studio Table Editor to confirm the `packages` row has `sealed = true` and the `content_pieces` rows exist with the photo's `content` set to a storage path (not a raw URI).

- [ ] **Step 4: Manual verification — failed upload retry**

With the local Supabase stack stopped (`supabase stop`), try adding a photo. Expected: the piece shows an error message instead of "saved," and "Seal & send" stays disabled. Run `supabase start` again, tap "Retry" on that piece. Expected: it uploads successfully and switches to "saved," and "Seal & send" becomes available.

- [ ] **Step 5: Commit**

```bash
git add app/\(creator\)/new.tsx
git commit -m "feat: add new package creation flow with per-piece upload and retry"
```

---

### Task 8: Content stack viewer component

**Implementation note:** the spec's confirmed mockup showed pieces as a fanned stack of cards peeking behind each other, swiped through one at a time. This task delivers the same *behavior* — tap in, swipe to advance through pieces one full-screen card at a time, in creator-defined order — using a simple horizontal paging list rather than a custom gesture-stack animation. The fanned-cards-behind visual polish is deferred (see "Out of scope" at the end of this plan) so the core flow ships first; it can be layered on top of this same component later without changing its interface.

**Files:**
- Create: `components/ContentStack.tsx`

**Interfaces:**
- Consumes: `ContentPiece` type from `lib/packages.ts` (Task 5); expects each piece passed in to already have a resolved `mediaUrl` for non-text types (resolution happens in Task 9, not here — keeps this component free of network calls)
- Produces: `<ContentStack pieces={resolvedPieces} />` component — consumed by Task 9's recipient screen

- [ ] **Step 1: Build the component**

Create `components/ContentStack.tsx`:

```tsx
import { useState } from 'react';
import { View, Text, Image, Dimensions, FlatList } from 'react-native';
import { Video, Audio, ResizeMode } from 'expo-av';
import { ContentPiece } from '../lib/packages';

export interface ResolvedPiece extends ContentPiece {
  mediaUrl?: string;
}

const { width } = Dimensions.get('window');

function PieceCard({ piece }: { piece: ResolvedPiece }) {
  if (piece.type === 'text') {
    return (
      <View style={{ width, padding: 24, justifyContent: 'center', flex: 1 }}>
        <Text style={{ fontSize: 18 }}>{piece.content}</Text>
      </View>
    );
  }
  if (piece.type === 'photo') {
    return (
      <View style={{ width, justifyContent: 'center', flex: 1 }}>
        <Image source={{ uri: piece.mediaUrl }} style={{ width, height: width }} resizeMode="contain" />
      </View>
    );
  }
  if (piece.type === 'video') {
    return (
      <View style={{ width, justifyContent: 'center', flex: 1 }}>
        <Video
          source={{ uri: piece.mediaUrl! }}
          style={{ width, height: width }}
          useNativeControls
          resizeMode={ResizeMode.CONTAIN}
        />
      </View>
    );
  }
  return <AudioCard piece={piece} />;
}

function AudioCard({ piece }: { piece: ResolvedPiece }) {
  const [playing, setPlaying] = useState(false);

  async function toggle() {
    const { sound } = await Audio.Sound.createAsync({ uri: piece.mediaUrl! });
    if (!playing) {
      await sound.playAsync();
      setPlaying(true);
    }
  }

  return (
    <View style={{ width, padding: 24, justifyContent: 'center', alignItems: 'center', flex: 1 }}>
      <Text onPress={toggle} style={{ fontSize: 18 }}>
        {playing ? 'Playing...' : 'Tap to play voice memo'}
      </Text>
    </View>
  );
}

export function ContentStack({ pieces }: { pieces: ResolvedPiece[] }) {
  return (
    <FlatList
      data={pieces}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => <PieceCard piece={item} />}
      horizontal
      pagingEnabled
      showsHorizontalScrollIndicator={false}
    />
  );
}
```

- [ ] **Step 2: Type-check it**

```bash
npx tsc --noEmit
```

Expected: no errors. (Real behavior is verified visually once wired into the recipient screen in Task 9.)

- [ ] **Step 3: Commit**

```bash
git add components/ContentStack.tsx
git commit -m "feat: add content stack viewer component"
```

---

### Task 9: Recipient package view screen

**Files:**
- Create: `app/package/[id].tsx`

**Interfaces:**
- Consumes: `getPackageByLink`, `getPackageContent`, `getSignedMediaUrl`, `markPackageOpened` from `lib/packages.ts` (Task 5); `ContentStack`, `ResolvedPiece` from `components/ContentStack.tsx` (Task 8)
- Produces: the `/package/[id]` route — this is what the shareable link generated in Task 6 points to, and works both inside Expo Go/a built app and in the Expo web build

- [ ] **Step 1: Build the recipient screen**

Create `app/package/[id].tsx`:

```tsx
import { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import {
  getPackageByLink,
  getPackageContent,
  getSignedMediaUrl,
  markPackageOpened,
  Package,
} from '../../lib/packages';
import { ContentStack, ResolvedPiece } from '../../components/ContentStack';

function isUnlocked(pkg: Package): boolean {
  return pkg.lock_type === 'unlocked' || (pkg.unlock_date !== null && new Date(pkg.unlock_date) <= new Date());
}

export default function PackageView() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [pkg, setPkg] = useState<Package | null>(null);
  const [pieces, setPieces] = useState<ResolvedPiece[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const fetchedPkg = await getPackageByLink(id);
      if (!fetchedPkg || cancelled) {
        setLoading(false);
        return;
      }
      setPkg(fetchedPkg);

      if (isUnlocked(fetchedPkg)) {
        const content = await getPackageContent(id);
        const resolved: ResolvedPiece[] = await Promise.all(
          content
            .sort((a, b) => a.order_index - b.order_index)
            .map(async (piece) => ({
              ...piece,
              mediaUrl: piece.type === 'text' ? undefined : await getSignedMediaUrl(piece.content),
            }))
        );
        if (!cancelled) setPieces(resolved);
        await markPackageOpened(id);
      }
      if (!cancelled) setLoading(false);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }

  if (!pkg) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
        <Text>This package doesn't exist.</Text>
      </View>
    );
  }

  if (!isUnlocked(pkg)) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
        <Text style={{ fontSize: 20, marginBottom: 8 }}>{pkg.label}</Text>
        <Text>Locked until {new Date(pkg.unlock_date!).toLocaleDateString()}</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <Text style={{ fontSize: 20, padding: 16 }}>{pkg.label}</Text>
      <ContentStack pieces={pieces} />
    </View>
  );
}
```

- [ ] **Step 2: Manual verification — unlocked package**

```bash
npx expo start
```

Using the package created in Task 7's manual test (unlocked), open its shareable link (from the dashboard's "Share link," or copy the URL shown by `Linking.createURL` in the debug logs) in Expo Go. Expected: the label appears, followed by the text and photo pieces, swipeable left/right. Check Supabase Studio: the package's `opened` column is now `true`.

- [ ] **Step 3: Manual verification — date-locked package**

Create a second package via Task 7's flow with "Lock until a date" on and a future date. Open its link. Expected: shows the label and "Locked until [date]," no content, and Studio confirms `opened` stays `false`. Manually edit `unlock_date` to a past date in Studio, reload the link. Expected: content now appears.

- [ ] **Step 4: Manual verification — web fallback**

```bash
npx expo start --web
```

Open the same unlocked package's link in a desktop browser tab. Expected: the same locked/unlocked behavior as in Expo Go, confirming the "no app required" recipient path works.

- [ ] **Step 5: Commit**

```bash
git add app/package/
git commit -m "feat: add recipient package view screen"
```

---

### Task 10: End-to-end QA pass

**Files:** none (verification only)

**Interfaces:**
- Consumes: the full app from Tasks 1–9
- Produces: confidence the spec's two user flows work end-to-end on both platforms, per the spec's "Testing approach" section

- [ ] **Step 1: Full creator → recipient flow, iOS (Expo Go)**

Sign up a fresh creator account, create one unlocked package (all four content types: text, photo, audio, video) and one date-locked package, share both links, open both links as if you were the recipient. Expected: unlocked package's full stack displays and plays correctly; date-locked package shows the locked state until its date passes.

- [ ] **Step 2: Repeat Step 1 on Android (Expo Go)**

Same walkthrough, on an Android device via Expo Go. Expected: identical behavior to Step 1.

- [ ] **Step 3: Confirm the resend-link path**

From the dashboard, use "Share link" on an already-sent package and confirm the same link opens the same content (covers the spec's "lost link" resend behavior).

- [ ] **Step 4: Confirm sealed packages reject edits**

Attempt to call `addContentPiece` against an already-sealed package's ID directly (e.g. temporarily add a debug button, or use Supabase Studio's SQL editor to run an insert as an authenticated role) — expected: rejected by RLS, matching Task 3's automated test.

- [ ] **Step 5: Commit any fixes found during QA**

If any step above surfaces a bug, fix it in the relevant file from Tasks 1–9 and commit with a `fix:` prefixed message describing the bug.

---

## Out of scope for this plan (noted, not silently dropped)

- **The fanned/peeking card-stack visual.** Task 8 implements the confirmed swipe-through-pieces behavior with a simpler horizontal paging list; the visual polish of adjacent cards peeking behind the front one (as shown in the design mockup) is a follow-up on top of the same `ContentStack` component.
- **Production hosting of the web fallback and real universal/app links.** This plan uses `expo-linking`'s dev-mode URLs, which work for testing the full flow via Expo Go on the same network. Making links work for a recipient with no Expo Go installed (a real `https://` link that opens a hosted web page or deep-links into an installed build) requires deploying the Expo web build and configuring platform-specific app-link verification — a follow-up plan once this version is validated.
- Push notifications, post-seal editing, and mood-based unlock triggers — excluded per the spec's "Out of scope for v1" section.
