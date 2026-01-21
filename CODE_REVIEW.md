# Code review: Soundcheck

**Reviewer:** Principal Engineer (new to project)
**Date:** 2026-01-20
**Severity scale:** Critical | High | Medium | Low

---

## Executive summary

**Overall quality: 6.5/10**

The codebase demonstrates solid fundamentals—good TypeScript usage, reasonable file organization, and thoughtful security considerations in OAuth handling. Recent commits (72442a6) show attention to critical issues like OAuth security and race conditions.

However, several significant issues need addressing: a potential infinite loop bug, deprecated OAuth patterns, missing critical tests, and gaps in error handling that will bite you in production.

---

## Critical issues (fix immediately)

### 1. SpotifyContext has a dependency tracking bug that can cause infinite re-renders

**File:** `src/lib/contexts/SpotifyContext.tsx:20`

```typescript
useEffect(() => {
  if (accessToken) {
    spotify.setAccessToken(accessToken);
  }
}, [accessToken, spotify]); // BUG: spotify object is unstable
```

**Problem:** The `spotify` object returned by `useSpotifyPlayer()` is a new reference on every render. Including it in the dependency array means this effect runs on every render, which calls `setAccessToken`, which can trigger state updates, creating a render loop.

**Why this matters:** This can cause performance issues, excessive API calls, and potentially freeze the browser tab.

**Fix:** Remove `spotify` from the dependency array:

```typescript
}, [accessToken]);
```

Or better, extract the stable function at the top level:

```typescript
const { setAccessToken } = spotify;

useEffect(() => {
  if (accessToken) {
    setAccessToken(accessToken);
  }
}, [accessToken, setAccessToken]);
```

---

### 2. OAuth uses deprecated Implicit Flow instead of Authorization Code Flow with PKCE

**File:** `src/app/play/page.tsx:47`

```typescript
authUrl.searchParams.set("response_type", "token"); // Implicit Flow
```

**Problems:**

1. **Security:** Implicit Flow exposes the access token in the URL, browser history, and potentially via Referer headers (despite the hash-clearing mitigation)
2. **No refresh tokens:** Users must re-authenticate after token expires (1 hour)
3. **Deprecated:** OAuth 2.1 formally deprecates Implicit Flow. Major providers (including Spotify) recommend against it

**Teaching moment for junior engineers:** OAuth flows are one of the most common sources of security vulnerabilities. The Implicit Flow was designed for an era before modern browsers had robust CORS support. Today, Authorization Code Flow with PKCE is the standard for SPAs.

**Fix:** Implement Authorization Code Flow with PKCE:
1. Generate a code verifier and challenge on the client
2. Exchange the authorization code for tokens via a backend endpoint (or Spotify's token endpoint directly if using PKCE)
3. Implement token refresh before expiration

---

## High priority issues

### 3. No token refresh mechanism

**Impact:** After 1 hour, the user's session abruptly ends mid-quiz with no graceful recovery.

**Files:** `src/lib/utils/token-storage.ts`, `src/app/play/page.tsx`

The current implementation has a 5-minute expiration buffer (good), but when the token expires, there's no:
- Warning to the user
- Automatic refresh attempt
- Graceful degradation

**Edge case not handled:** User starts a 10-song quiz, takes 45 minutes, token expires at song 8. Playback fails silently, and `playSnippet` throws an error that only appears in the console.

**Teaching moment:** Always design for session lifecycle. Tokens expire—that's not exceptional, it's expected. Your application should handle it gracefully.

---

### 4. Missing component and integration tests

**Current coverage:** 40 tests across 3 files—all utility functions.

**Untested code (high impact):**

| File | Lines | Risk |
|------|-------|------|
| `QuizPlayer.tsx` | 359 | **Critical** - Core gameplay |
| `useSpotifyPlayer.ts` | 278 | **High** - SDK integration |
| `SpotifyContext.tsx` | 32 | **Medium** - Contains bug |
| `play/page.tsx` | 113 | **Medium** - OAuth flow |

**Why this matters:** The utility tests are excellent (`parsing.test.ts`, `token-storage.test.ts`, `agent-config.test.ts`), but they test the easy parts. The complex, bug-prone parts (component state, async effects, SDK integration) have zero coverage.

**Estimate:** ~40-60 tests needed to properly cover components and hooks.

---

### 5. Race condition risk in QuizPlayer.handleStart

**File:** `src/components/QuizPlayer.tsx:171-182`

```typescript
try {
  setIsStarted(true);
  await conversation.startSession({...}); // What if component unmounts here?
} catch (error) {
  setIsStarted(false); // State update on unmounted component
}
```

**Problem:** If the user navigates away before `startSession` completes, React will warn about state updates on unmounted components.

**Teaching moment:** Async operations that update state need mounted-state guards:

```typescript
const isMountedRef = useRef(true);
useEffect(() => () => { isMountedRef.current = false; }, []);

// Then in async code:
if (isMountedRef.current) {
  setIsStarted(false);
}
```

The `useSpotifyPlayer` hook does this correctly (line 120)—use that as a reference.

---

## Medium priority issues

### 6. Timeout error handling is missing

**File:** `src/lib/hooks/useSpotifyPlayer.ts:262-266`

```typescript
snippetTimeoutRef.current = setTimeout(async () => {
  if (isMountedRef.current) {
    await stopPlayback(); // If this throws, it's unhandled
  }
}, SNIPPET_DURATION_MS);
```

**Problem:** If `stopPlayback()` throws (network error, player disconnected), the error is silently swallowed by the setTimeout. No logging, no recovery.

**Fix:**

```typescript
snippetTimeoutRef.current = setTimeout(async () => {
  if (isMountedRef.current) {
    try {
      await stopPlayback();
    } catch (error) {
      console.error("Failed to stop playback:", error);
      // Optionally update error state
    }
  }
}, SNIPPET_DURATION_MS);
```

---

### 7. Tool parameters use fragile string comparisons

**File:** `src/components/QuizPlayer.tsx:67`

```typescript
const isReplay = params.is_replay === "true";
```

**Problem:** AI models can return parameters in unexpected formats. What if it returns `"True"`, `"TRUE"`, `"yes"`, or the boolean `true`?

**Better approach:**

```typescript
function parseBooleanParam(value: unknown): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    return value.toLowerCase() === "true" || value === "1";
  }
  return false;
}

const isReplay = parseBooleanParam(params.is_replay);
```

This makes the code resilient to AI output variations.

---

### 8. No Premium account validation before quiz start

**File:** `src/app/play/page.tsx`

Spotify Web Playback SDK requires Premium. Currently, a Free user can:
1. Log in successfully
2. See the quiz start screen
3. Click "Start Quiz"
4. Get a cryptic error when playback fails

**Better UX:** Check account type immediately after OAuth callback and show a clear message.

---

### 9. `as any` casts bypass type safety

**File:** `src/lib/clients/elevenlabs.ts:61, 68`

```typescript
const response = await sdk.conversationalAi.agents.create(config as any);
```

**Problem:** These casts hide type mismatches that could cause runtime errors.

**Fix:** Create proper type definitions that extend the SDK types, or contribute types back to the SDK package.

**Teaching moment:** `as any` is almost always a code smell. It tells the compiler "trust me"—but you shouldn't trust yourself. The type system exists to catch your mistakes.

---

### 10. Replay tracking uses both ref and state

**File:** `src/components/QuizPlayer.tsx:57, 74-75`

```typescript
const replaysRef = useRef<Record<string, number>>({});

// Later:
replaysRef.current[songKey] = currentReplays + 1;
setProgress((prev) => ({ ...prev, replaysUsed: currentReplays + 1 }));
```

**Problem:** Two sources of truth. The ref tracks replays per song (a map), while state tracks a single `replaysUsed` number. This works, but it's confusing.

**Cleaner approach:** Either:
1. Track everything in state (use a Map for per-song tracking), or
2. Track everything in refs (if you don't need re-renders for replay changes)

Pick one mental model and stick with it.

---

## Lower priority issues

### 11. SDK script appended to body instead of head

**File:** `src/lib/hooks/useSpotifyPlayer.ts:94`

```typescript
document.body.appendChild(script);
```

Scripts should go in `<head>` for proper HTML semantics and to avoid layout thrashing.

---

### 12. No Spotify API retry logic

**File:** `src/lib/hooks/useSpotifyPlayer.ts:241-259`

Spotify's API can return transient errors (503, 429). The current implementation treats all failures as permanent.

**Recommended:** Add exponential backoff retry for specific status codes:

```typescript
const RETRYABLE_STATUS_CODES = [429, 502, 503, 504];
```

---

### 13. Theme is hardcoded

**File:** `src/app/play/page.tsx:109`

```typescript
<QuizPlayer agentId={ELEVENLABS_AGENT_ID} theme="80s Hits" onLogout={handleLogout} />
```

The `theme` prop is hardcoded to "80s Hits" but the infrastructure exists to support multiple themes. This should be dynamic or at least documented as intentional.

---

### 14. No loading states during async operations

The UI doesn't show loading indicators when:
- Starting a quiz session
- Playing a snippet
- Ending a session

Users don't know if something is happening or if the app is frozen.

---

## Edge cases not handled

1. **Browser back button during quiz:** User loses all progress with no warning
2. **Multiple tabs:** Can two tabs run quizzes simultaneously? (Probably causes Spotify conflicts)
3. **Network disconnection mid-quiz:** WebSocket to ElevenLabs drops, no reconnection logic
4. **Spotify playing in another app:** Device transfer behavior is undefined
5. **Very slow network:** No timeout on API calls, could hang indefinitely
6. **Browser permissions denied:** If microphone access is needed by ElevenLabs, there's no handling for permission denial

---

## Security considerations

**Good practices observed:**
- sessionStorage for tokens (cleared on browser close)
- URL hash cleared immediately after OAuth callback
- Token expiration validation with 5-minute buffer
- API keys in environment variables
- ELEVENLABS_API_KEY not exposed to client

**Concerns:**
1. Implicit OAuth Flow (discussed above)
2. No Content Security Policy headers configured
3. No rate limiting on client-side API calls
4. WebSocket connections not validated (relies on ElevenLabs SDK)

---

## Testing recommendations

### Immediate (before next release)

1. **SpotifyContext test:** Verify the dependency bug is fixed
2. **QuizPlayer state tests:** Test state transitions for start, play, answer, end
3. **useSpotifyPlayer tests:** Mock the Spotify SDK, test the callback queue logic

### Short term

1. **OAuth flow tests:** Mock window.location, test token extraction
2. **Error scenario tests:** Network failures, expired tokens, SDK errors
3. **Integration test:** Full quiz flow with mocked APIs

### Long term

1. **E2E tests with Playwright:** Real browser, real interactions
2. **Visual regression tests:** Ensure UI doesn't break

---

## Architecture recommendations

### Consider a state machine for quiz flow

The current implementation uses multiple `useState` calls that can get out of sync. A state machine (xstate or similar) would make the quiz flow explicit:

```
idle -> starting -> playing -> waitingForGuess -> revealing -> (loop or) finished
```

This makes edge cases explicit and prevents impossible states.

### Consider moving OAuth to a backend

The current client-side OAuth is fine for an MVP, but moving to a backend would:
- Enable Authorization Code Flow (more secure)
- Allow token refresh
- Hide credentials from the client
- Enable server-side Spotify API calls

---

## What the codebase does well

Credit where due—these are patterns worth maintaining:

1. **Race condition handling in SDK loading:** The callback queue pattern in `loadSpotifySDK()` is sophisticated and correctly handles edge cases
2. **Token storage security:** The immediate hash-clearing and sessionStorage usage shows security awareness
3. **File organization:** Clear separation of concerns, proper use of Next.js conventions
4. **TypeScript strict mode:** Catches many bugs at compile time
5. **Utility test quality:** The tests for parsing and token storage are thorough
6. **Good use of parseIntSafe:** Handles AI output variations safely
7. **Message history limiting:** Prevents memory leaks with MAX_MESSAGE_HISTORY cap
8. **Play Again state reset:** Properly resets state instead of reloading page

---

## Action items summary

| Priority | Issue | Effort |
|----------|-------|--------|
| Critical | Fix SpotifyContext dependency array | 5 min |
| High | Migrate to OAuth PKCE flow | 1-2 days |
| High | Add component tests | 1-2 days |
| High | Handle token expiration gracefully | 2-4 hours |
| Medium | Add mounted guards to QuizPlayer | 30 min |
| Medium | Add timeout error handling | 15 min |
| Medium | Improve boolean param parsing | 30 min |
| Low | Move script to head | 5 min |
| Low | Add retry logic | 2-4 hours |

---

## Conclusion

This codebase is a reasonable MVP with solid fundamentals. The architecture is clean, TypeScript usage is good, and there's clear evidence of security awareness. The recent commit (72442a6) shows attention to critical issues.

**Key Strengths:**
- Architecture and organization
- Security-conscious approach to OAuth
- Race condition handling in SDK loading
- Test infrastructure for utilities

**Key Weaknesses:**
- Missing critical test coverage for components
- Deprecated OAuth Implicit Flow
- No token refresh mechanism
- One critical bug in SpotifyContext

**Priority Action:** Fix the SpotifyContext dependency bug immediately, then focus on OAuth modernization and component test coverage in the next sprint.

For junior engineers: focus on the patterns here around async state management, race conditions, and token handling. These are common challenges in modern frontend development, and this codebase demonstrates both good solutions (the SDK loading callback queue) and common pitfalls (the dependency array bug).
