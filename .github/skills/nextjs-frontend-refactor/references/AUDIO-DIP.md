# Phase 6 — AudioService Abstraction (DIP)

## Principle

Services exported as singleton instances create a hard dependency. Components
and hooks that import `audioService` directly cannot be tested without module
mocking hacks. The fix: **define an interface, implement it, inject it.**

---

## 6.1 — Create `SoundNotifier` Interface

### `src/services/SoundNotifier.ts` (NUEVO)

```typescript
/**
 * Abstraction for sound notification services.
 * Any implementation must handle browser autoplay policies.
 */
export interface SoundNotifier {
  /** Initialize the audio source. Called once. */
  init(src: string, volume?: number): void;

  /** Attempt to unlock audio playback (requires user gesture). */
  unlock(): Promise<void>;

  /** Play the notification sound if unlocked. */
  play(): void;

  /** Returns true if audio has been successfully unlocked. */
  isEnabled(): boolean;
}
```

**Design decisions:**

- 4 methods — minimal surface area (ISP)
- No reference to `HTMLAudioElement` or any browser API
- A `NoopSoundNotifier` for tests would have 4 trivial methods
- Could be implemented with Web Audio API, Howler.js, or any other library

---

## 6.2 — `AudioService` Implements `SoundNotifier`

### Modified `src/services/AudioService.ts`

```typescript
import type { SoundNotifier } from "./SoundNotifier";

class AudioService implements SoundNotifier {
  private audio: HTMLAudioElement | null = null;
  private enabled = false;
  private ready = false;

  init(src: string, volume = 0.6): void {
    if (this.audio) return;

    this.audio = new Audio(src);
    this.audio.volume = volume;
    this.audio.preload = "auto";

    this.audio.addEventListener("canplaythrough", () => {
      this.ready = true;
    });
  }

  async unlock(): Promise<void> {
    if (!this.audio || this.enabled) return;

    try {
      await this.audio.play();
      this.audio.pause();
      this.audio.currentTime = 0;
      this.enabled = true;
    } catch {
      this.enabled = false;
    }
  }

  play(): void {
    if (!this.audio || !this.enabled || !this.ready) return;

    try {
      this.audio.currentTime = 0;
      const promise = this.audio.play();
      if (promise !== undefined) {
        promise.catch(() => {});
      }
    } catch {}
  }

  isEnabled(): boolean {
    return this.enabled;
  }
}

/** Default singleton instance for production use. */
export const audioService: SoundNotifier = new AudioService();
```

**Key changes:**

- `implements SoundNotifier` — contract enforced by TypeScript
- Export type is now `SoundNotifier`, not `AudioService`
- Internal implementation is identical (minimal change, low risk)

---

## 6.3 — Inject `SoundNotifier` in Hooks

### In `useAudioNotification`

```typescript
import type { SoundNotifier } from "@/services/SoundNotifier";
import { audioService } from "@/services/AudioService";

export function useAudioNotification({
  src,
  volume = 0.6,
  notifier = audioService, // ← Default to production singleton
}: {
  src: string;
  volume?: number;
  notifier?: SoundNotifier;
}) {
  // Uses notifier.init(), notifier.unlock(), notifier.isEnabled()
}
```

### In consuming pages

```typescript
// Production — no change needed, uses default
const { audioEnabled } = useAudioNotification({ src: "/sounds/ding.mp3" });

// Test — inject mock
const mockNotifier: SoundNotifier = {
  init: vi.fn(),
  unlock: vi.fn(),
  play: vi.fn(),
  isEnabled: vi.fn().mockReturnValue(true),
};
const { audioEnabled } = useAudioNotification({
  src: "/sounds/test.mp3",
  notifier: mockNotifier,
});
```

---

## Mock para Testing

### `NoopSoundNotifier`

```typescript
// For use in tests or SSR environments
export class NoopSoundNotifier implements SoundNotifier {
  init(): void {}
  async unlock(): Promise<void> {}
  play(): void {}
  isEnabled(): boolean {
    return false;
  }
}
```

---

## Verification

```bash
# SoundNotifier interface exists
ls src/services/SoundNotifier.ts

# AudioService implements SoundNotifier
grep "implements SoundNotifier" src/services/AudioService.ts
# Expected: 1 result

# No direct import of AudioService class in hooks/pages
grep -rn "import.*AudioService" src/hooks/ src/app/
# Expected: only imports of { audioService } (the instance), not the class

# Hooks accept SoundNotifier parameter
grep -n "SoundNotifier" src/hooks/useAudioNotification.ts
# Expected: at least 1 result

npm run build
```
