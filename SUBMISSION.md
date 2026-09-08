# Convex directory submission

Status: prepared, not submitted. Publish the stable npm package and complete the Estulio production migration first.

- Name: Convex Credits
- Maintainer: CLIPIN
- npm package: `@clipin/convex-credits`
- Repository: https://github.com/clipinfit/convex-credits
- Website: https://convex-credits.vercel.app
- Documentation: https://convex-credits.vercel.app/docs
- License: Apache-2.0
- Thumbnail: `apps/web/public/directory-thumbnail.png` (1536 × 864)
- Editable thumbnail source: `assets/directory-thumbnail.svg`

## Short description

Transactional credits for Convex background jobs. Reserve, complete, release, refund, and reconcile with durable operation keys.

## Description

Convex Credits manages available balances, charge state, and credit movements inside Convex. Reserve credits before starting a job. Complete a successful charge without adding another movement. Release a failed job's reservation once, or refund completed work up to its unrefunded amount.

Every mutation accepts an operation key. Identical retries return the original result. Conflicting requests fail. Transfers update both accounts atomically. A resumable import preserves source history and pending charges, then checks balances and counts before account activation.

The host controls authentication, prices, verified payments, and job execution. The component includes a typed TypeScript client, a convex-test registration helper, a working example backend, and documentation.

## Submission steps

1. Verify the stable npm package URL and public repository.
2. Sign in at https://www.convex.dev/components/submit.
3. Enter the verified package, repository, and documentation links.
4. Attach the thumbnail if the form offers it.
5. Submit and retain the submission status or confirmation URL.

The directory reviews submissions before listing them. Submission does not mean approval.
