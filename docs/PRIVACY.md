# BodyOS — privacy & data

_Last updated: 2026-07-20. This document states what the app actually does — nothing more._

## What BodyOS stores

Your training log (workouts, sets, personal records), workout templates and weekly plan,
profile (name, goal, experience, equipment), settings, body measurements, and optional
progress photos.

## Where it lives

- **On your device, always.** Everything is stored locally in your browser's storage.
  The app works fully offline; no account is required.
- **In the cloud, only if you sign in.** With an optional account (email/password or
  Google via Firebase), your training data — workouts, templates, records, settings,
  measurements — is synchronized to a private Firestore document only your account can
  read or write (enforced by server-side security rules kept in this repository:
  `firestore.rules`).
- **Progress photos never leave your device.** They are not uploaded, synced, or backed
  up to the cloud under any circumstances. Deleting them in the app deletes them.
- **Body measurements sync** with your account like the rest of your training data.

## Accounts on a shared device

Each account's data is kept in a separate local namespace. Signing out immediately hides
your data; another account on the same device can never see, merge, or upload it. Moving
this device's local data into an account only happens through the explicit
"Import it into this account" action.

## Processors

Cloud sync uses **Google Firebase** (Authentication and Cloud Firestore). Google acts as
a data processor for synced training data. No analytics, advertising, or tracking SDKs
are included in the app.

## Export, restore, deletion

- **Export**: Settings → Data → "Export data" downloads your complete training data as
  JSON. Progress photos are not included in the export.
- **Restore**: Settings → Data → "Import data" (validated before anything is replaced;
  the previous data is snapshotted and restorable via "Undo last restore").
- **Delete local data**: Settings → "Reset all data" erases this device's copy.
- **Delete cloud data**: currently requires deleting your account in Firebase or
  contacting the maintainer; an in-app full account deletion is planned and tracked in
  `docs/audit-2026-07-20.md`.

## What BodyOS is not

BodyOS is a training log. It provides no medical, rehabilitation, or injury-prevention
advice, and its progression suggestions are simple, documented rules (double
progression) — not medical guidance. Consult a professional for health decisions.

## Contact

Open an issue on the repository: https://github.com/fabrykjoh12/bodyos
