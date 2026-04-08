"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import AuthGuard from "@/components/AuthGuard/AuthGuard";
import { env } from "@/config/env";
import { HttpMedicalCommandAdapter } from "@/infrastructure/adapters/HttpMedicalCommandAdapter";
import type { ConsultorioStateResponse } from "@/domain/ports/MedicalCommandService";
import { useDeps } from "@/providers/DependencyProvider";
import styles from "@/styles/page.module.css";

const getConsultorioStateLabel = (
  estado: ConsultorioStateResponse["estado"],
): string => {
  switch (estado) {
    case "SinMedico":
      return "Sin medico";
    case "ConMedicoDisponible":
      return "Disponible";
    case "ConMedicoNoDisponible":
      return "No disponible";
    case "EnAtencion":
      return "En atencion";
    default:
      return estado;
  }
};

const canReleaseConsultorio = (state: ConsultorioStateResponse): boolean =>
  state.estado !== "SinMedico" && state.estado !== "EnAtencion" && !!state.medicoId;

const sortConsultorioStates = (
  states: ConsultorioStateResponse[],
  consultorioIds: string[],
): ConsultorioStateResponse[] => {
  const indexByConsultorioId = new Map(
    consultorioIds.map((consultorioId, index) => [consultorioId, index] as const),
  );

  return [...states].sort((left, right) => {
    const leftIndex = indexByConsultorioId.get(left.consultorioId) ?? Number.MAX_SAFE_INTEGER;
    const rightIndex = indexByConsultorioId.get(right.consultorioId) ?? Number.MAX_SAFE_INTEGER;
    return leftIndex - rightIndex;
  });
};

const resolveMedicoLabel = (state: ConsultorioStateResponse): string => {
  if (state.medicoNombre && state.medicoNombre.trim()) {
    return state.medicoNombre;
  }

  if (state.medicoId && state.medicoId.trim()) {
    return state.medicoId;
  }

  return "Sin medico";
};

export default function ConsultoriosOpsPage() {
  return (
    <AuthGuard allowedRoles={["admin", "employee"]}>
      <ConsultoriosOpsPanel />
    </AuthGuard>
  );
}

function ConsultoriosOpsPanel() {
  const { realTime } = useDeps();
  const medicalCommands = useMemo(
    () => new HttpMedicalCommandAdapter(env.API_BASE_URL),
    [],
  );
  const consultorioIds = useMemo(
    () => Array.from({ length: env.CONSULTORIOS_TOTAL }, (_, index) => `C${index + 1}`),
    [],
  );

  const [consultorioStates, setConsultorioStates] = useState<ConsultorioStateResponse[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultMessage, setResultMessage] = useState<string | null>(null);
  const [releaseInProgressConsultorioId, setReleaseInProgressConsultorioId] =
    useState<string | null>(null);

  const upsertConsultorioState = useCallback(
    (nextState: ConsultorioStateResponse) => {
      setConsultorioStates((currentStates) => {
        const nextStates = [...currentStates];
        const existingIndex = nextStates.findIndex(
          (state) => state.consultorioId === nextState.consultorioId,
        );

        if (existingIndex >= 0) {
          nextStates[existingIndex] = nextState;
        } else {
          nextStates.push(nextState);
        }

        return sortConsultorioStates(nextStates, consultorioIds);
      });
    },
    [consultorioIds],
  );

  const refreshConsultorioStates = useCallback(async (options?: { showLoading?: boolean }) => {
    const showLoading = options?.showLoading ?? true;

    if (showLoading) {
      setIsLoading(true);
    }
    setError(null);

    try {
      const stateResults = await Promise.allSettled(
        consultorioIds.map((consultorioId) =>
          medicalCommands.getConsultorioStateForOps(consultorioId),
        ),
      );

      const successfulStates = stateResults
        .filter(
          (
            result,
          ): result is PromiseFulfilledResult<ConsultorioStateResponse> =>
            result.status === "fulfilled",
        )
        .map((result) => result.value);

      setConsultorioStates(sortConsultorioStates(successfulStates, consultorioIds));

      if (successfulStates.length !== consultorioIds.length) {
        setError(
          "No fue posible cargar todos los consultorios. Intenta de nuevo en unos segundos.",
        );
      }
    } catch (opsError: unknown) {
      const message =
        opsError instanceof Error
          ? opsError.message
          : "No fue posible consultar los consultorios";
      setError(message);
    } finally {
      if (showLoading) {
        setIsLoading(false);
      }
    }
  }, [consultorioIds, medicalCommands]);

  useEffect(() => {
    void refreshConsultorioStates();
  }, [refreshConsultorioStates]);

  useEffect(() => {
    let active = true;

    const syncConsultorioStateByEvent = async (consultorioId: string) => {
      try {
        const latestState = await medicalCommands.getConsultorioStateForOps(consultorioId);

        if (!active) {
          return;
        }

        upsertConsultorioState(latestState);
        setError(null);
      } catch {
        if (active) {
          setError("No fue posible sincronizar el estado de consultorios en tiempo real.");
        }
      }
    };

    realTime.connect({
      onSnapshot: () => undefined,
      onTicketUpdate: () => undefined,
      onConsultorioUpdated: (event) => {
        void syncConsultorioStateByEvent(event.consultorioId);
      },
      onPatientAssigned: (event) => {
        void syncConsultorioStateByEvent(event.consultorioId);
      },
      onAttentionFinished: (event) => {
        void syncConsultorioStateByEvent(event.consultorioId);
      },
      onConnect: () => {
        setConnected(true);
        void refreshConsultorioStates({ showLoading: false });
      },
      onDisconnect: () => {
        setConnected(false);
      },
      onError: (message) => {
        setConnected(false);
        setError(message);
      },
    });

    return () => {
      active = false;
      realTime.disconnect();
    };
  }, [medicalCommands, realTime, refreshConsultorioStates, upsertConsultorioState]);

  const runReleaseByConsultorio = useCallback(
    async (consultorioId: string) => {
      setResultMessage(null);
      setError(null);
      setReleaseInProgressConsultorioId(consultorioId);

      try {
        const result = await medicalCommands.releaseConsultorioByConsultorioId(consultorioId);
        setResultMessage(result.message);
        await refreshConsultorioStates({ showLoading: false });
      } catch (opsError: unknown) {
        const message =
          opsError instanceof Error
            ? opsError.message
            : "No fue posible liberar el consultorio";
        setError(message);
      } finally {
        setReleaseInProgressConsultorioId(null);
      }
    },
    [medicalCommands, refreshConsultorioStates],
  );

  const runReleaseAllBlocked = useCallback(async () => {
    const releasableStates = consultorioStates.filter(canReleaseConsultorio);

    if (releasableStates.length === 0) {
      setResultMessage("No hay consultorios ocupados para liberar.");
      setError(null);
      return;
    }

    setResultMessage(null);
    setError(null);
    setReleaseInProgressConsultorioId("ALL");

    try {
      const releaseResults = await Promise.allSettled(
        releasableStates.map((state) =>
          medicalCommands.releaseConsultorioByConsultorioId(state.consultorioId),
        ),
      );

      const releasedCount = releaseResults.filter(
        (result) => result.status === "fulfilled",
      ).length;
      const failedCount = releaseResults.length - releasedCount;

      if (failedCount > 0) {
        setError(
          `Se liberaron ${releasedCount} consultorios. ${failedCount} no pudieron liberarse.`,
        );
      } else {
        setResultMessage(`Se liberaron ${releasedCount} consultorios ocupados.`);
      }

      await refreshConsultorioStates({ showLoading: false });
    } catch (opsError: unknown) {
      const message =
        opsError instanceof Error
          ? opsError.message
          : "No fue posible liberar consultorios ocupados";
      setError(message);
    } finally {
      setReleaseInProgressConsultorioId(null);
    }
  }, [consultorioStates, medicalCommands, refreshConsultorioStates]);

  const hasReleaseInProgress = !!releaseInProgressConsultorioId;

  return (
    <main className={styles.container}>
      <h1 className={styles.title}>Gestion rapida de consultorios</h1>

      <section className={styles.consultorioOpsSection}>
        <div className={styles.consultorioOpsHeader}>
          <h2 className={styles.sectionTitle}>Estado operativo</h2>
          <p className={connected ? styles.connected : styles.disconnected}>
            {connected
              ? "Conectado en tiempo real"
              : "Sin conexion en tiempo real"}
          </p>
          <div className={styles.consultorioOpsActionRow}>
            <button
              type="button"
              className={styles.consultorioOpsReleaseButton}
              disabled={isLoading || hasReleaseInProgress}
              onClick={() => {
                void runReleaseAllBlocked();
              }}
            >
              {releaseInProgressConsultorioId === "ALL"
                ? "Liberando..."
                : "Liberar ocupados"}
            </button>
          </div>
        </div>

        {error && <p className={styles.error}>{error}</p>}
        {resultMessage && <p className={styles.success}>{resultMessage}</p>}

        {consultorioStates.length > 0 ? (
          <ul className={styles.list}>
            {consultorioStates.map((state) => {
              const releaseDisabled =
                isLoading || !canReleaseConsultorio(state) || hasReleaseInProgress;

              return (
                <li key={state.consultorioId} className={styles.item}>
                  <div className={styles.historyContent}>
                    <div className={styles.historyHeader}>
                      <span className={styles.name}>{`Consultorio ${state.consultorioId}`}</span>
                      <span className={styles.historyOffice}>{`Estado: ${getConsultorioStateLabel(
                        state.estado,
                      )}`}</span>
                    </div>

                    <div className={styles.historyMeta}>
                      <span className={styles.historyMetaItem}>{`Medico: ${resolveMedicoLabel(state)}`}</span>
                      <span className={styles.historyMetaItem}>{`Paciente: ${state.patientId ?? "Sin paciente"}`}</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    className={styles.consultorioOpsReleaseButton}
                    disabled={releaseDisabled}
                    onClick={() => {
                      void runReleaseByConsultorio(state.consultorioId);
                    }}
                  >
                    {releaseInProgressConsultorioId === state.consultorioId
                      ? "Liberando..."
                      : "Liberar"}
                  </button>
                </li>
              );
            })}
          </ul>
        ) : (
          !isLoading && (
            <p className={styles.empty}>No hay estados de consultorio disponibles.</p>
          )
        )}
      </section>
    </main>
  );
}
