# Example: Complete Page Refactoring (Before → After)

This example shows how `page.tsx` transforms after applying all 6 phases.

---

## BEFORE — `page.tsx` (~130 lines, 4 responsibilities)

```typescript
"use client";
import { useRef, useState, useEffect } from "react";
import { useTurnosWebSocket } from "@/hooks/useTurnosWebSocket";
import { audioService } from "@/services/AudioService";  // ❌ DIP: concrete singleton
import { Turno } from "@/domain/Turno";

export default function TurnosPage() {
  const { turnos, error, connected } = useTurnosWebSocket();
  const lastCountRef = useRef(0);                          // ❌ SRP: toast logic
  const [audioEnabled, setAudioEnabled] = useState(false); // ❌ SRP: audio logic
  const [showToast, setShowToast] = useState(false);       // ❌ SRP: toast logic

  // ❌ SRP: Audio initialization — DUPLICATED in dashboard/page.tsx
  useEffect(() => {
    audioService.init("/sounds/ding.mp3", 0.6);
    const unlock = async () => {
      await audioService.unlock();
      if (audioService.isEnabled()) setAudioEnabled(true);
    };
    document.addEventListener("click", unlock, { once: true });
    document.addEventListener("touchstart", unlock, { once: true });
    return () => {
      document.removeEventListener("click", unlock);
      document.removeEventListener("touchstart", unlock);
    };
  }, []);

  // ❌ SRP: Toast detection — DUPLICATED in dashboard/page.tsx
  useEffect(() => {
    const pendientes = turnos.filter(t => t.estado === "PENDIENTE");
    if (pendientes.length > lastCountRef.current) {
      if (audioEnabled) audioService.play();
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    }
    lastCountRef.current = pendientes.length;
  }, [turnos, audioEnabled]);

  const pendientes = turnos.filter(t => t.estado === "PENDIENTE");

  return (
    <main>
      {/* ...130 lines of mixed concerns */}
    </main>
  );
}
```

---

## AFTER — `page.tsx` (~35 lines, 1 responsibility: render)

```typescript
"use client";
import { useMemo } from "react";
import { useTurnosWebSocket } from "@/hooks/useTurnosWebSocket";
import { useAudioNotification } from "@/hooks/useAudioNotification";
import { useNewItemToast } from "@/hooks/useNewItemToast";
import { SocketIOConnectionFactory } from "@/services/SocketIOConnectionFactory";

export default function TurnosPage() {
  // ✅ DIP: factory injected
  const factory = useMemo(() => new SocketIOConnectionFactory(), []);
  const { turnos, error, connected } = useTurnosWebSocket(factory);

  // ✅ SRP: audio in dedicated hook
  const { audioEnabled } = useAudioNotification({ src: "/sounds/ding.mp3" });

  // ✅ SRP: toast in dedicated hook
  const pendientes = turnos.filter(t => t.estado === "PENDIENTE");
  const { showToast } = useNewItemToast(pendientes, { playSound: audioEnabled });

  return (
    <main>
      {/* Connection indicator */}
      <span>{connected ? "🟢" : "🔴"}</span>

      {audioEnabled ? null : <p>Haz clic para activar sonido</p>}

      {error && <p className="error">{error}</p>}

      {/* Turno list — ONLY rendering concern */}
      <ul>
        {pendientes.map(t => (
          <li key={t.id}>{t.nombre} — {t.estado}</li>
        ))}
      </ul>

      {showToast && <div className="toast">¡Nuevo turno!</div>}
    </main>
  );
}
```

---

## What Changed

| Aspect                         | Before                           | After                            |
| ------------------------------ | -------------------------------- | -------------------------------- |
| Lines                          | ~130                             | ~35                              |
| Responsibilities               | 4 (render, audio, toast, filter) | 1 (render)                       |
| `useEffect` blocks             | 2                                | 0                                |
| `useRef` calls                 | 1                                | 0                                |
| Direct singleton import        | `audioService`                   | None (injected via hook default) |
| Code duplicated with dashboard | ~80%                             | 0%                               |
| Testable in isolation          | No                               | Yes                              |
