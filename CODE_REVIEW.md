# Code review: Soundcheck

**Reviewer:** Principal Engineer (new to project)
**Date:** 2026-01-18
**Severity scale:** 🔴 Critical | 🟠 Major | 🟡 Minor | 🔵 Nitpick

---

## Executive summary

This codebase has several fundamental architectural issues that will cause problems at scale and in production. While the prototype demonstrates the core concept, it lacks the robustness expected of production software. The absence of tests, inadequate error handling, security vulnerabilities, and tight coupling between concerns are the primary issues.

---

## 🔴 Critical issues

### 1. Zero test coverage

**Location:** Entire codebase
**Issue:** There are no tests whatsoever—no unit tests, no integration tests, no E2E tests.

**Why this matters:**
- You cannot refactor with confidence
- Regressions will ship to production undetected
- New team members have no executable documentation of expected behavior
- The CLAUDE.md mentions "TDD where possible" but this was clearly ignored

**What good looks like:**
```
src/
├── lib/
│   ├── hooks/
│   │   ├── useSpotifyPlayer.ts
│   │   └── useSpotifyPlayer.test.ts  ← Test alongside implementation
```

**Action required:** Add Vitest (per your stated stack preferences), write tests for:
- `useSpotifyPlayer` hook behavior
- `useHashToken` parsing logic
- `buildAgentConfig` output structure
- Client tool handlers in `QuizPlayer`

---

### 2. OAuth tokens exposed in URL fragment

**Location:** `src/app/play/page.tsx:9-19`

```typescript
function getTokenFromHash(): string | null {
  const hash = window.location.hash;
  const params = new URLSearchParams(hash.substring(1));
  const token = params.get("access_token");
  if (token) {
    window.history.replaceState(null, "", window.location.pathname);
  }
  return token;
}
```

**Issues:**
1. **Token leakage via Referer header** – Before `replaceState` executes, the token is in the URL. Any external resource loaded (images, scripts, analytics) could capture it via `Referer`.
2. **Browser history exposure** – The token momentarily exists in browser history.
3. **No token validation** – The token is trusted blindly without any verification.
4. **Implicit grant flow is deprecated** – Spotify recommends PKCE authorization code flow.

**What good looks like:**
- Use Authorization Code with PKCE (server-side token exchange)
- Validate token format before use
- Store tokens in httpOnly cookies or secure session storage
- Implement token refresh logic

---

### 3. Access token stored only in ref, lost on re-render paths

**Location:** `src/lib/hooks/useSpotifyPlayer.ts:43-48`

```typescript
const accessTokenRef = useRef<string | null>(null);

const setAccessToken = useCallback((token: string) => {
  accessTokenRef.current = token;
}, []);
```

**Issues:**
1. Token is only in a ref—if the component unmounts and remounts, it's gone
2. No persistence mechanism (sessionStorage, etc.)
3. If user refreshes the page after the hash is cleared, they lose authentication
4. No token expiration handling—Spotify tokens expire after 1 hour

**What good looks like:**
- Store token with expiration timestamp in sessionStorage
- Check expiration before API calls
- Implement refresh token flow (requires PKCE migration)
- Clear storage on logout

---

### 4. Spotify SDK script injected without cleanup race condition

**Location:** `src/lib/hooks/useSpotifyPlayer.ts:57-105`

```typescript
useEffect(() => {
  const script = document.createElement("script");
  script.src = "https://sdk.scdn.co/spotify-player.js";
  document.body.appendChild(script);

  window.onSpotifyWebPlaybackSDKReady = () => {
    // ... player setup
  };

  return () => {
    if (playerRef.current) {
      playerRef.current.disconnect();
    }
  };
}, []);
```

**Issues:**
1. **Script not removed on cleanup** – Multiple mounts will inject multiple scripts
2. **Global callback overwritten** – If two components use this hook, second overwrites first
3. **No duplicate script check** – Should check if script already exists
4. **Cleanup race condition** – Script might load after component unmounts, creating orphaned player

**What good looks like:**
```typescript
useEffect(() => {
  // Check if SDK already loaded
  if (window.Spotify) {
    initializePlayer();
    return;
  }

  // Check if script already injecting
  if (document.querySelector('script[src*="spotify-player.js"]')) {
    // Wait for existing script
    return;
  }

  const script = document.createElement("script");
  // ...

  return () => {
    script.remove(); // Clean up script
    playerRef.current?.disconnect();
  };
}, []);
```

---

## 🟠 Major issues

### 5. Hardcoded theme with no theme selection

**Location:** `src/app/play/page.tsx:99`

```typescript
<QuizPlayer agentId={ELEVENLABS_AGENT_ID} theme="80s Hits" />
```

**Issue:** The theme is hardcoded. The `buildAgentConfig` function and `QuizTheme` type exist but are never used. There's no way for users to select different quiz themes.

**What's missing:**
- Theme selection UI
- Theme data (song lists) – where do these come from?
- API route or data source for themes

---

### 6. No loading states or error boundaries

**Location:** Throughout application

**Issues:**
1. No loading indicator while Spotify SDK initializes
2. No error boundary around `QuizPlayer`
3. `conversation.startSession` can fail but UI doesn't handle this
4. `playSnippet` errors are swallowed and returned as strings to the AI

**Example of silent failure:**
```typescript
// QuizPlayer.tsx:76-83
try {
  await playSnippet(params.track_uri);
  return `Playing song ${params.song_number}`;
} catch (error) {
  return `Error playing song: ${error instanceof Error ? error.message : "Unknown error"}`;
  // ← Error returned to AI, but UI shows nothing to user
}
```

**What good looks like:**
- Suspense boundaries with fallbacks
- Error boundaries with recovery options
- Toast/notification system for transient errors
- Explicit loading states in UI

---

### 7. `parseInt` without validation

**Location:** `src/components/QuizPlayer.tsx:114-116, 128-130`

```typescript
currentScore: parseInt(params.current_score, 10),
songsCompleted: parseInt(params.songs_completed, 10),
```

**Issue:** If the AI sends malformed data (and LLMs do this), `parseInt` returns `NaN`, which will break the UI and calculations.

**What good looks like:**
```typescript
function parseIntSafe(value: string, fallback: number = 0): number {
  const parsed = parseInt(value, 10);
  return Number.isNaN(parsed) ? fallback : parsed;
}
```

---

### 8. `alert()` used for user feedback

**Location:** `src/components/QuizPlayer.tsx:153`

```typescript
if (!spotifyState.isReady) {
  alert("Spotify player not ready. Please make sure you're logged in.");
  return;
}
```

**Issue:** `alert()` is a blocking, modal, non-styleable 1990s API. It breaks the user experience and is inaccessible.

**What good looks like:**
- Inline error messages
- Toast notifications
- Disabled button with tooltip explaining why

---

### 9. Memory leak: messages array grows unbounded

**Location:** `src/components/QuizPlayer.tsx:137-145`

```typescript
onMessage: (message) => {
  setMessages((prev) => [
    ...prev,
    { role: message.source === "user" ? "user" : "agent", content: message.message },
  ]);
},
```

**Issue:** Messages accumulate indefinitely. In a long session or multiple rounds, this will cause:
- Increasing memory usage
- Slower re-renders (entire array re-rendered each message)
- Eventually, browser tab crash

**What good looks like:**
- Limit message history (e.g., last 50 messages)
- Use virtualized list for rendering
- Clear messages between rounds

---

### 10. Missing callback route

**Location:** `src/lib/config/constants.ts:6-7`

```typescript
export const SPOTIFY_REDIRECT_URI =
  process.env.NEXT_PUBLIC_SPOTIFY_REDIRECT_URI || "http://localhost:3000/callback";
```

**Issue:** The default redirect points to `/callback`, but there's no `src/app/callback/` route. The code actually redirects to `/play` (see `play/page.tsx:43`), making this constant misleading.

**Impact:** Configuration confusion, potential production issues if someone uses the documented default.

---

## 🟡 Minor issues

### 11. Unused font import

**Location:** `src/app/layout.tsx:10-14`

```typescript
const pirataOne = Pirata_One({
  variable: "--font-pirata",
  weight: "400",
  subsets: ["latin"],
});
```

**Issue:** This font is imported but `--font-pirata` is never used in any SCSS file. Unnecessary network request.

---

### 12. ESLint disabled for legitimate warning

**Location:** `src/lib/hooks/useSpotifyPlayer.ts:4`

```typescript
/* eslint-disable react-hooks/set-state-in-effect */
```

**Issue:** This rule exists for good reason. Setting state in effect cleanup or async callbacks can cause memory leaks if component unmounts. The code should be restructured rather than disabling the rule.

---

### 13. Inconsistent error handling patterns

**Location:** Various

- `useSpotifyPlayer`: Sets error in state
- `QuizPlayer`: Returns error string to AI
- `handleStart`: Uses `alert()`
- `elevenlabs.ts`: Throws errors

**What good looks like:** Consistent error handling strategy across the application, preferably with a central error handling service or context.

---

### 14. `window.location.reload()` for "Play Again"

**Location:** `src/components/QuizPlayer.tsx:183`

```typescript
<button onClick={() => window.location.reload()}>
  Play Again
</button>
```

**Issue:** Full page reload is heavy-handed. Loses any app state, re-downloads all resources, re-initializes Spotify SDK.

**What good looks like:**
- Reset component state
- Disconnect and reconnect conversation
- Clear progress/results
- Optional: Reset Spotify player position

---

### 15. Type coercion via `eslint-disable`

**Location:** `src/lib/clients/elevenlabs.ts:60-68`

```typescript
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const response = await sdk.conversationalAi.agents.create(config as any);
```

**Issue:** Casting to `any` bypasses TypeScript's safety. If the ElevenLabs SDK types don't match, you should:
1. File an issue/PR with ElevenLabs
2. Create proper type declarations
3. Use `unknown` with type guards if necessary

---

### 16. No accessibility considerations

**Location:** Entire application

**Missing:**
- ARIA labels on icon buttons
- Focus management when modals/views change
- Screen reader announcements for score changes
- Keyboard navigation support
- Color contrast verification

---

## 🔵 Nitpicks

### 17. Unused variable with eslint-disable

**Location:** `src/app/play/page.tsx:35-36`

```typescript
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const [manualToken, _setManualToken] = useState<string | null>(hashToken);
```

**Issue:** If you need to disable eslint for unused variables, the variable probably shouldn't exist. The `manualToken` mechanism appears to be vestigial code from a removed feature.

---

### 18. Magic numbers and strings

**Location:** `src/lib/services/agent-config.ts:140`

```typescript
voice_id: voiceId || "21m00Tcm4TlvDq8ikWAM", // Default Rachel voice
```

**Issue:** Magic string with comment is fragile. Should be in constants.

---

### 19. Inconsistent component export style

**Location:** Throughout

```typescript
// Some files
export function QuizPlayer() {}

// Other files
export default function Home() {}
```

**Recommendation:** Pick one style and stick with it. Named exports are generally preferred as they're easier to refactor and tree-shake.

---

## Architecture concerns

### Coupling issues

The `QuizPlayer` component is a 300-line monolith that handles:
- ElevenLabs conversation management
- Spotify playback control
- Quiz state management
- UI rendering
- Score tracking
- Results display

This violates single responsibility principle. Consider:
- Custom hook for quiz logic (`useQuizGame`)
- Separate components for game phases (Start, Playing, Results)
- State machine for game flow

### Missing abstraction layer

Client tools are defined inline in `QuizPlayer` but their schemas are in `agent-config.ts`. This creates a maintenance burden—you have to update two places when changing tool behavior.

### No data persistence

- No score history
- No user preferences
- No session recovery
- No analytics

---

## Recommendations prioritized

1. **Immediate:** Fix OAuth security issues (migrate to PKCE)
2. **This week:** Add basic error boundaries and loading states
3. **This sprint:** Write tests for core logic (hooks, config builder)
4. **Next sprint:** Refactor QuizPlayer into smaller components
5. **Backlog:** Add accessibility, analytics, score persistence

---

## Conclusion

This codebase was clearly built as a rapid prototype. That's fine for proving a concept, but it's not production-ready. The security issues around token handling are the most pressing—they should be addressed before any public deployment.

For junior engineers reading this: the issues above aren't about being "perfect"—they're about understanding that every line of code has consequences. Tests prevent regressions. Error handling prevents confused users. Security practices prevent breaches. Take the time to do things properly from the start; technical debt compounds faster than you think.
