# Phase 2 — Hook Extraction (SRP)

## Principle

When two or more files contain >50% identical logic, extract that logic into a
custom hook or utility function. A page component should **only render**; all
state management and side effects live in hooks.

---

## Pattern: Extracting Duplicated Logic into a Custom Hook

### Before (Anti-Pattern)

```
page.tsx               dashboard/page.tsx
├─ audioEnabled state  ├─ audioEnabled state     ← DUPLICATED
├─ useEffect(audio)    ├─ useEffect(audio)       ← DUPLICATED
├─ useEffect(toast)    ├─ useEffect(toast)       ← DUPLICATED
├─ showToast state     ├─ showToast state        ← DUPLICATED
└─ render turnos       └─ render dashboard
```

### After (SRP)

```
useAudioNotification.ts   ← Single source of truth for audio
useNewItemToast.ts        ← Single source of truth for toast detection

page.tsx                  dashboard/page.tsx
├─ useAudioNotification() ├─ useAudioNotification()  ← Reuse
├─ useNewItemToast()      ├─ useNewItemToast()        ← Reuse
└─ render turnos          └─ render dashboard
```

---

## 2.1 — `useAudioNotification` (NUEVO)

### Responsabilidad

Encapsular **todo** el ciclo de vida de audio del navegador:

- Inicialización del `AudioService`
- Listeners de `click`/`touchstart` para unlock (autoplay policy)
- Estado `audioEnabled`
- Cleanup de listeners

### API

```typescript
interface UseAudioNotificationOptions {
  src: string;
  volume?: number;
  notifier?: SoundNotifier; // DIP: inyectable, default = audioService
}

function useAudioNotification(options: UseAudioNotificationOptions): {
  audioEnabled: boolean;
};
```

### Implementación de Referencia

```typescript
"use client";
import { useState, useEffect } from "react";
import { audioService } from "@/services/AudioService";
import type { SoundNotifier } from "@/services/SoundNotifier";

export function useAudioNotification({
  src,
  volume = 0.6,
  notifier = audioService,
}: {
  src: string;
  volume?: number;
  notifier?: SoundNotifier;
}) {
  const [audioEnabled, setAudioEnabled] = useState(false);

  useEffect(() => {
    notifier.init(src, volume);

    const unlock = async () => {
      await notifier.unlock();
      if (notifier.isEnabled()) {
        setAudioEnabled(true);
      }
    };

    document.addEventListener("click", unlock, { once: true });
    document.addEventListener("touchstart", unlock, { once: true });

    return () => {
      document.removeEventListener("click", unlock);
      document.removeEventListener("touchstart", unlock);
    };
  }, [src, volume, notifier]);

  return { audioEnabled };
}
```

---

## 2.2 — `useNewItemToast` (NUEVO)

### Responsabilidad

Detectar cuando nuevos ítems aparecen en un array, reproducir un sonido (si
está habilitado), y mostrar una notificación toast temporal.

### API

```typescript
function useNewItemToast(
  items: unknown[],
  options: {
    playSound: boolean;
    notifier?: SoundNotifier;
    toastDuration?: number; // ms, default 3000
  },
): {
  showToast: boolean;
};
```

### Implementación de Referencia

```typescript
"use client";
import { useState, useEffect, useRef } from "react";
import { audioService } from "@/services/AudioService";
import type { SoundNotifier } from "@/services/SoundNotifier";

export function useNewItemToast(
  items: unknown[],
  {
    playSound,
    notifier = audioService,
    toastDuration = 3000,
  }: {
    playSound: boolean;
    notifier?: SoundNotifier;
    toastDuration?: number;
  },
) {
  const [showToast, setShowToast] = useState(false);
  const lastCountRef = useRef(items.length);

  useEffect(() => {
    if (items.length > lastCountRef.current) {
      if (playSound) {
        notifier.play();
      }
      setShowToast(true);
      const timer = setTimeout(() => setShowToast(false), toastDuration);
      return () => clearTimeout(timer);
    }
    lastCountRef.current = items.length;
  }, [items.length, playSound, notifier, toastDuration]);

  return { showToast };
}
```

---

## 2.3 — Refactorizar `page.tsx` y `dashboard/page.tsx`

### Principio

Después de extraer los hooks, cada page debe quedar como **componente de
presentación pura**:

```typescript
// ANTES: ~130 líneas con 4 responsabilidades mezcladas
// DESPUÉS: ~40 líneas, solo rendering
export default function TurnosPage() {
  const { turnos, error, connected } = useTurnosWebSocket();
  const { audioEnabled } = useAudioNotification({ src: "/sounds/ding.mp3" });

  const pendientes = turnos.filter(t => t.estado === "PENDIENTE");
  const { showToast } = useNewItemToast(pendientes, { playSound: audioEnabled });

  return (
    <main>
      {/* Indicador de conexión */}
      {/* Lista de turnos */}
      {/* Toast notification */}
    </main>
  );
}
```

### Checklist Post-Refactor

```
□ page.tsx no tiene ningún useEffect
□ page.tsx no tiene ningún useRef
□ page.tsx no importa AudioService directamente
□ page.tsx tiene < 50 líneas
□ La lógica de audio está en useAudioNotification
□ La lógica de toast/detección está en useNewItemToast
□ Ambas pages usan los mismos hooks (cero duplicación)
```

---

## 2.4 — Extraer `formatHora` a utilidades

### De:

```typescript
// dashboard/page.tsx, líneas 72-79
function formatHora(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleTimeString("es-CO", {
    hour: "2-digit",
    minute: "2-digit",
  });
}
```

### A:

```typescript
// src/lib/formatters.ts
export function formatHora(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleTimeString("es-CO", {
    hour: "2-digit",
    minute: "2-digit",
  });
}
```

**Razón:** Función pura de presentación. Puede ser usada por cualquier componente.
No tiene razón de vivir dentro de un page component.
