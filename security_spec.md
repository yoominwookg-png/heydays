# Security Specification - Heydays Band Club

## Data Invariants
- A Comment must belong to an existing Post.
- A ScoreNote must belong to an existing Score and the author of the note.
- A Message must have a sender and a receiver.
- A User can only edit their own profile (except admins).
- Only admins can pin posts or create notices.

## The "Dirty Dozen" Payloads

1. **Identity Spoofing**: Attempt to create a post with `authorId` not matching `request.auth.uid`.
2. **Elevated Privilege**: Attempt to create a post of type `notice` as a regular member.
3. **Ghost Update**: Attempt to update a post's `likes` count directly without incrementing.
4. **Relational Orphan**: Attempt to add a comment to a non-existent post ID.
5. **Private Leak**: Attempt to read high-level `User` data (like password if it existed, or bio) of another user if restricted.
6. **Self-Assigned Role**: Attempt to set `role: 'admin'` during user profile creation.
7. **Cross-User Note Access**: Attempt to read or edit a `ScoreNote` belonging to another user.
8. **Message Interception**: Attempt to read `messages` where the user is neither sender nor receiver.
9. **Notification Spam**: Attempt to create a notification for another user.
10. **Immutable Field Tampering**: Attempt to change `createdAt` on an existing post.
11. **Denial of Wallet**: Attempt to inject 1MB string into `id` field.
12. **Status Shortcutting**: Attempt to change a post type from `review` to `notice`.

## Test Runner Plan
- `firestore.rules.test.ts` will verify that these payloads are rejected.
- We will use the Firebase Rules Simulator logic via unit tests.
