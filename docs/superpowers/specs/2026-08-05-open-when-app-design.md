# Open When — Design Spec

Date: 2026-08-05

## Overview

"Open When" is a mobile app for creating digital versions of the classic "open when..." letter-gift — a set of sealed, labeled messages (e.g. "open when you're sad," "open when you miss me") given to someone to open at the right moment. The app supports both gifting a package to someone else and creating a personal time capsule for yourself.

## Core concepts

- **Package** — one occasion, created by one creator for one recipient. Has a label (e.g. "Open when you're sad"), a lock rule, and a stack of content.
- **Content stack** — an ordered list of content pieces inside a package. Each piece is exactly one type: text letter, photo, audio clip, or video. A package can hold any number of pieces, in any mix, added by the creator in the order they should be experienced.
- **Lock rule** — set per package (not per content piece), chosen by the creator:
  - **Unlocked** — always visible and openable by the recipient.
  - **Date-locked** — hidden/grayed out until a specific date the creator sets, then becomes openable.

A recipient typically receives multiple packages over time — one per occasion — rather than one package containing everything.

## Users

- **Creators** have accounts (via Supabase auth). Their account stores their created packages, so they can review what they've sent and resend a lost link.
- **Recipients** do not need accounts. They access a package via a shareable, unguessable link generated when the creator seals the package. Opening the link launches the app if installed, or a browser view with the same experience if not.

## Data model

**Package**
- `id` (unique, unguessable — used in the shareable link)
- `label` (string, e.g. "Open when you're sad")
- `creator_id` (references the creator's account)
- `recipient_name` (display name only, no account link)
- `lock_type` (`unlocked` | `date_locked`)
- `unlock_date` (set only if `date_locked`)
- `sealed` (boolean — once true, no further content pieces can be added; packages are sealed once sent, per decision below)
- `opened` (boolean — set true the first time the recipient views it; stays viewable afterward, does not re-lock)

**Content piece**
- `id`
- `package_id` (references its package)
- `type` (`text` | `photo` | `audio` | `video`)
- `content` (the text itself, or a reference to the stored media file)
- `order` (position within the package's content stack)

## Key decisions

- **Rich media**: supported per content piece — photos, audio, and video, alongside plain text.
- **Post-send editing**: packages are sealed once sent; no adding content after the link is generated (v1). Creators make a new package for anything later.
- **Reread**: once opened, a package stays viewable indefinitely — not a one-time reveal.
- **Notifications**: none in v1. Recipients check manually via the link/app; no push infrastructure for the first version.
- **Unlock trigger**: date/time only for date-locked packages (no mood self-report trigger in v1).

## User flows

### Creating a package
1. Creator logs in, taps "New package."
2. Sets the label and the recipient's display name.
3. Adds content pieces one at a time (text, photo, audio, video), building the ordered stack.
4. Sets the lock: unlocked, or a specific unlock date.
5. Taps "Done" — the package is sealed, and a shareable link/code is generated.
6. Creator sends the link to the recipient through any channel they choose (text, email, etc.).

### Receiving and opening a package
1. Recipient taps the link — opens in the app if installed, otherwise a browser view with the same experience.
2. If date-locked and the unlock date hasn't arrived: shown as locked, with the unlock date visible, not openable.
3. Once unlocked (immediately, or once the date passes): recipient taps it and sees the content stack as swipeable cards, one piece at a time, in the order the creator set.
4. The package is marked opened and remains viewable anytime after.
5. If the recipient doesn't have the app, a prompt on the browser view offers to install it, so they can also create their own packages.

## Interaction: content stack

Opening a package presents its content pieces as a stack of cards (front piece visible, others peeking behind), swiped through one at a time in creator-defined order — not a scrollable list, and not all shown combined on one screen. (Mocked up and confirmed via the visual companion during design.)

## Architecture

- **App**: built with Expo (React Native), producing one codebase that runs on iOS, Android, and the web — the web build serves the no-install-required link-opening experience for recipients.
- **Backend**: Supabase, providing:
  - **Auth** — creator accounts only.
  - **Database (Postgres)** — packages and content pieces.
  - **Storage** — photo/audio/video files attached to content pieces.
- **Links**: shareable package links use an unguessable ID; the app resolves the ID to the package via Supabase, with lock-state enforced server-side (see below).

## Error handling & edge cases

- **Link security**: package links use unguessable IDs, not sequential/predictable ones, so a package can't be stumbled onto by guessing.
- **Server-enforced lock**: the date-lock check happens in Supabase (not just hidden in the app UI), so the content can't be retrieved early by bypassing the app.
- **Lost link**: recipients have no account to recover a lost link through; the creator can find the package in their own account and resend the same link.
- **Large media uploads**: photo/audio/video uploads need a reasonable size cap (e.g. a few minutes max for video) to avoid failed uploads and excess storage use. Exact limits to be set during implementation.
- **Failed upload mid-creation**: if a media upload fails while building a package, only that piece shows an error and can be retried — other pieces already added are unaffected.

## Testing approach

Given this is a first build, testing stays lightweight and practical:
- Manual walkthroughs of both flows (create → send → open) covering both an unlocked and a date-locked package, on iOS and Android via Expo.
- A small number of automated checks focused on logic that's easy to get subtly wrong — primarily that the date-lock is enforced server-side in Supabase, not just in the app.
- Everything else (UI, uploads, swipe interaction) verified manually during development, since it's faster to iterate on visually than to write tests for at this stage.

## Out of scope for v1

- Push notifications on unlock.
- Editing/adding content to a package after it's sealed and sent.
- Mood/occasion self-report unlock trigger (only date-based locks).
- Recipient accounts.
