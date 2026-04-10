"use client";

import { useEffect, useRef, useState } from "react";
import { useTicketsWebSocket } from "@/hooks/useTicketsWebSocket";
import { useAudioNotification } from "@/hooks/useAudioNotification";
import { useDeps } from "@/providers/DependencyProvider";
import AuthGuard from "@/components/AuthGuard/AuthGuard";
import styles from "@/styles/page.module.css";

const formatTime = (timestamp: number | null | undefined): string => {
  if (typeof timestamp !== "number") {
    return "Sin registro";
  }

  return new Date(timestamp).toLocaleTimeString("es-ES", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
};

const formatConsultationDuration = (
  startTime: number,
  endTime: number | null | undefined,
): string => {
  if (typeof endTime !== "number" || endTime < startTime) {
    return "Sin registro";
  }

  const totalSeconds = Math.floor((endTime - startTime) / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes}m ${seconds.toString().padStart(2, "0")}s`;
};

const HISTORY_PAGE_SIZE = 10;

export default function ServedDashboard() {
  return (
    <AuthGuard>
      <ServedDashboardContent />
    </AuthGuard>
  );
}

function ServedDashboardContent() {
  const { realTime, audio } = useDeps();
  const { tickets, error, connected } = useTicketsWebSocket(realTime);
  const { audioEnabled, showToast, toastMessage, notify } =
    useAudioNotification(audio);
  const [currentPage, setCurrentPage] = useState(1);

  const lastCountRef = useRef(0);
  const initializedRef = useRef(false);

  useEffect(() => {
    const servedCount = tickets.filter((t) => t.status === "served").length;

    if (!initializedRef.current) {
      lastCountRef.current = servedCount;
      if (servedCount > 0) {
        initializedRef.current = true;
      }
      return;
    }

    if (servedCount > lastCountRef.current) {
      notify("✅ Turno completado");
    }

    lastCountRef.current = servedCount;
  }, [tickets, notify]);

  const servedTickets = tickets
    .filter((t) => t.status === "served")
    .sort(
      (a, b) =>
        (b.consultationEndedAt ?? b.timestamp) -
        (a.consultationEndedAt ?? a.timestamp),
    );

  const totalPages = Math.max(1, Math.ceil(servedTickets.length / HISTORY_PAGE_SIZE));
  const visibleCurrentPage = Math.min(currentPage, totalPages);

  const pageStartIndex = (visibleCurrentPage - 1) * HISTORY_PAGE_SIZE;
  const visibleServedTickets = servedTickets.slice(
    pageStartIndex,
    pageStartIndex + HISTORY_PAGE_SIZE,
  );
  const pageEndCount = Math.min(
    pageStartIndex + visibleServedTickets.length,
    servedTickets.length,
  );

  return (
    <main className={styles.container}>
      <h1 className={styles.title}>Historial</h1>

      <p className={connected ? styles.connected : styles.disconnected}>
        {connected
          ? "🟢 Conectado en tiempo real"
          : "🔴 Desconectado — reconectando..."}
      </p>

      {!audioEnabled && (
        <p className={styles.audioHint}>
          Toca la pantalla para habilitar el sonido 🔔
        </p>
      )}

      {error && <p className={styles.error}>{error}</p>}

      {servedTickets.length > 0 && (
        <>
          <h2 className={styles.sectionTitle}>✅ Historial ({servedTickets.length})</h2>
          <ul className={styles.list}>
            {visibleServedTickets.map((t) => (
              <li key={t.id} className={`${styles.item} ${styles.served}`}>
                <div className={styles.historyContent}>
                  <div className={styles.historyHeader}>
                    <span className={styles.name}>{t.name}</span>
                    <span className={styles.historyOffice}>{`Consultorio ${t.office ?? "N/A"}`}</span>
                  </div>

                  <div className={styles.historyMeta}>
                    <span className={styles.historyMetaItem}>{`Inicio: ${formatTime(t.timestamp)}`}</span>
                    <span className={styles.historyMetaItem}>{`Fin: ${formatTime(t.consultationEndedAt)}`}</span>
                    <span className={styles.historyMetaItem}>{`Tiempo en consulta: ${formatConsultationDuration(
                      t.timestamp,
                      t.consultationEndedAt,
                    )}`}</span>
                  </div>
                </div>
              </li>
            ))}
          </ul>

          {totalPages > 1 && (
            <div className={styles.paginationContainer}>
              <span className={styles.paginationSummary}>
                Mostrando {pageStartIndex + 1}-{pageEndCount} de {servedTickets.length}
              </span>

              <div className={styles.paginationControls}>
                <button
                  type="button"
                  className={styles.paginationButton}
                  onClick={() => {
                    setCurrentPage((previousPage) => {
                      const normalizedPage = Math.min(previousPage, totalPages);
                      return Math.max(1, normalizedPage - 1);
                    });
                  }}
                  disabled={visibleCurrentPage === 1}
                >
                  Anterior
                </button>

                <span className={styles.paginationPageIndicator}>
                  Pagina {visibleCurrentPage} de {totalPages}
                </span>

                <button
                  type="button"
                  className={styles.paginationButton}
                  onClick={() => {
                    setCurrentPage((previousPage) => {
                      const normalizedPage = Math.min(previousPage, totalPages);
                      return Math.min(totalPages, normalizedPage + 1);
                    });
                  }}
                  disabled={visibleCurrentPage === totalPages}
                >
                  Siguiente
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {servedTickets.length === 0 && !error && (
        <p className={styles.empty}>No hay turnos atendidos</p>
      )}

      {showToast && <div className={styles.toast}>{toastMessage}</div>}
    </main>
  );
}
