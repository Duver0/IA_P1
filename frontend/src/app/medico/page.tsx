"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import AuthGuard from "@/components/AuthGuard/AuthGuard";
import { env } from "@/config/env";
import { useConsultorioRealtime } from "@/hooks/useConsultorioRealtime";
import { HttpMedicalCommandAdapter } from "@/infrastructure/adapters/HttpMedicalCommandAdapter";
import { useDeps } from "@/providers/DependencyProvider";
import { useAuth } from "@/providers/AuthProvider";
import styles from "@/styles/medico.module.css";

const formatTimestamp = (timestamp: number): string =>
  new Date(timestamp).toLocaleTimeString("es-ES", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

const COMMAND_NOTIFICATION_TIMEOUT_MS = 3500;
const SNAPSHOT_SYNC_RETRY_SHORT_MS = 350;
const SNAPSHOT_SYNC_RETRY_MEDIUM_MS = 900;

type ConsultorioTone =
  | "neutralState"
  | "availableState"
  | "attentionState"
  | "unavailableState";

const getConsultorioStatePresentation = (
  estado: string | null,
): { label: string; tone: ConsultorioTone } => {
  switch (estado) {
    case "SinMedico":
      return { label: "Sin medico", tone: "neutralState" };
    case "ConMedicoDisponible":
      return { label: "Disponible", tone: "availableState" };
    case "EnAtencion":
      return { label: "En atencion", tone: "attentionState" };
    case "ConMedicoNoDisponible":
      return { label: "No disponible", tone: "unavailableState" };
    default:
      return { label: "Sin datos", tone: "neutralState" };
  }
};

export default function MedicoPage() {
  return (
    <AuthGuard allowedRoles={["medico"]}>
      <MedicoPanel />
    </AuthGuard>
  );
}

function MedicoPanel() {
  const { realTime } = useDeps();
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const consultorioIds = useMemo(
    () => Array.from({ length: env.CONSULTORIOS_TOTAL }, (_, index) => `C${index + 1}`),
    [],
  );
  const initialConsultorioId = useMemo(() => {
    const paramConsultorioId = searchParams.get("consultorioId")?.trim();
    if (paramConsultorioId && consultorioIds.includes(paramConsultorioId)) {
      return paramConsultorioId;
    }
    return consultorioIds[0] ?? "C1";
  }, [searchParams, consultorioIds]);
  const [selectedConsultorioId, setSelectedConsultorioId] = useState(initialConsultorioId);
  const [assignedConsultorioId, setAssignedConsultorioId] = useState<string | null>(null);
  const [occupiableConsultorioIds, setOccupiableConsultorioIds] = useState<string[]>([]);
  const [isLoadingOccupiableConsultorios, setIsLoadingOccupiableConsultorios] = useState(true);
  const syncTimeoutIdsRef = useRef<number[]>([]);
  const medicalCommands = useMemo(
    () => new HttpMedicalCommandAdapter(env.API_BASE_URL),
    [],
  );
  const loadInitialState = useCallback(
    (consultorioId: string) => medicalCommands.getConsultorioState(consultorioId),
    [medicalCommands],
  );
  const { consultorio, patientName, currentTicket, connected, error, refreshState } = useConsultorioRealtime({
    realTime,
    consultorioId: selectedConsultorioId,
    loadInitialState,
  });
  const consultorioEstado = consultorio?.estado ?? null;
  const isManagedByAuthenticatedDoctor =
    !!consultorio?.medicoId && consultorio.medicoId === user?.id;
  const consultorioBelongsToAnotherDoctor =
    !!consultorio &&
    consultorioEstado !== "SinMedico" &&
    !!consultorio.medicoId &&
    consultorio.medicoId !== user?.id;
  const hasAssignedConsultorio = !!assignedConsultorioId;
  const showAssignControls =
    !hasAssignedConsultorio && (!consultorio || consultorioEstado === "SinMedico");
  const needsOccupiableConsultorioOptions =
    showAssignControls || consultorioBelongsToAnotherDoctor;
  const hasOccupiableConsultorios = occupiableConsultorioIds.length > 0;
  const showConsultorioSelector =
    needsOccupiableConsultorioOptions && hasOccupiableConsultorios;

  const refreshOccupiableConsultorios = useCallback(async () => {
    setIsLoadingOccupiableConsultorios(true);

    try {
      const states = await Promise.allSettled(
        consultorioIds.map(async (consultorioId) => ({
          consultorioId,
          state: await medicalCommands.getConsultorioState(consultorioId),
        })),
      );

      const availableStates = states
        .filter((result): result is PromiseFulfilledResult<{ consultorioId: string; state: Awaited<ReturnType<typeof medicalCommands.getConsultorioState>> }> => result.status === "fulfilled")
        .map((result) => result.value);

      const assignedState = availableStates.find(({ state }) =>
        !!user?.id && state.medicoId === user.id,
      );

      const assignedId = assignedState?.consultorioId ?? null;
      setAssignedConsultorioId(assignedId);

      const occupiableIds = assignedId
        ? [assignedId]
        : availableStates.flatMap(({ consultorioId, state }) =>
            state.estado === "SinMedico" ? [consultorioId] : [],
          );

      setOccupiableConsultorioIds(occupiableIds);
    } finally {
      setIsLoadingOccupiableConsultorios(false);
    }
  }, [consultorioIds, medicalCommands, user?.id]);

  useEffect(() => {
    if (!needsOccupiableConsultorioOptions) {
      return;
    }

    void refreshOccupiableConsultorios();
  }, [needsOccupiableConsultorioOptions, refreshOccupiableConsultorios]);

  useEffect(() => {
    if (!assignedConsultorioId) {
      return;
    }

    if (selectedConsultorioId !== assignedConsultorioId) {
      setSelectedConsultorioId(assignedConsultorioId);
    }
  }, [assignedConsultorioId, selectedConsultorioId]);

  useEffect(() => {
    if (occupiableConsultorioIds.length === 0) {
      return;
    }

    if (!occupiableConsultorioIds.includes(selectedConsultorioId)) {
      setSelectedConsultorioId(occupiableConsultorioIds[0]);
    }
  }, [occupiableConsultorioIds, selectedConsultorioId]);

  const [commandResult, setCommandResult] = useState<string | null>(null);
  const [commandError, setCommandError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showProcessingNotice, setShowProcessingNotice] = useState(false);
  const [pauseAfterCurrentAttentionPending, setPauseAfterCurrentAttentionPending] = useState(false);

  useEffect(() => {
    if (consultorioEstado === "EnAtencion" && isManagedByAuthenticatedDoctor) {
      return;
    }

    setPauseAfterCurrentAttentionPending(false);
  }, [consultorioEstado, isManagedByAuthenticatedDoctor]);

  useEffect(() => {
    if (!commandResult) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setCommandResult(null);
    }, COMMAND_NOTIFICATION_TIMEOUT_MS);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [commandResult]);

  useEffect(() => {
    if (!commandError) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setCommandError(null);
    }, COMMAND_NOTIFICATION_TIMEOUT_MS);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [commandError]);

  useEffect(() => {
    if (!isSubmitting) {
      setShowProcessingNotice(false);
      return;
    }

    setShowProcessingNotice(true);
    const timeoutId = window.setTimeout(() => {
      setShowProcessingNotice(false);
    }, COMMAND_NOTIFICATION_TIMEOUT_MS);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [isSubmitting]);

  useEffect(() => {
    return () => {
      syncTimeoutIdsRef.current.forEach((timeoutId) => window.clearTimeout(timeoutId));
      syncTimeoutIdsRef.current = [];
    };
  }, []);

  const showMarkAvailable =
    isManagedByAuthenticatedDoctor && consultorioEstado === "ConMedicoNoDisponible";
  const showStartAttention =
    isManagedByAuthenticatedDoctor &&
    consultorioEstado === "ConMedicoDisponible" &&
    !!currentTicket;
  const showMarkUnavailable =
    isManagedByAuthenticatedDoctor &&
    ((consultorioEstado === "ConMedicoDisponible" && !currentTicket) ||
      consultorioEstado === "EnAtencion");
  const showFinalizeAttention =
    isManagedByAuthenticatedDoctor && consultorioEstado === "EnAtencion";
  const showReleaseConsultorio =
    isManagedByAuthenticatedDoctor && consultorioEstado === "ConMedicoNoDisponible";
  const hasContextualActions =
    showMarkAvailable ||
    showStartAttention ||
    showMarkUnavailable ||
    showFinalizeAttention ||
    showReleaseConsultorio;
  const consultorioIdLabel = consultorio?.consultorioId ?? selectedConsultorioId;
  const consultorioStatePresentation = getConsultorioStatePresentation(consultorioEstado);
  const currentPatientDocument =
    consultorio?.patientId ??
    (currentTicket ? String(currentTicket.documentId) : null);
  const patientDisplayName = currentTicket
    ? currentTicket.name
    : consultorio?.patientId
      ? patientName ?? "Nombre del paciente en sincronizacion"
      : "Esperando paciente";
  const patientDocument = currentPatientDocument ?? "Sin documento registrado";
  const patientAttentionState =
    consultorioEstado === "EnAtencion"
      ? "Atencion en curso"
      : currentTicket
        ? "Paciente llamado pendiente de iniciar atencion"
        : "Aun no hay atencion activa";
  const hasFloatingNotifications =
    !!error || !!commandError || !!commandResult || showProcessingNotice;
  const showPauseAfterAttentionHint =
    pauseAfterCurrentAttentionPending &&
    consultorioEstado === "EnAtencion" &&
    isManagedByAuthenticatedDoctor;

  const syncConsultorioState = useCallback((options?: { forceOccupiableRefresh?: boolean }) => {
    const shouldRefreshOccupiable =
      options?.forceOccupiableRefresh ?? needsOccupiableConsultorioOptions;

    const syncSnapshot = () => {
      void refreshState();
      if (shouldRefreshOccupiable) {
        void refreshOccupiableConsultorios();
      }
    };

    syncSnapshot();

    syncTimeoutIdsRef.current.forEach((timeoutId) => window.clearTimeout(timeoutId));
    syncTimeoutIdsRef.current = [];

    // Reintentos cortos para converger incluso cuando el comando se procesa de forma asíncrona.
    const shortTimeoutId = window.setTimeout(() => {
      syncSnapshot();
    }, SNAPSHOT_SYNC_RETRY_SHORT_MS);

    const mediumTimeoutId = window.setTimeout(() => {
      syncSnapshot();
    }, SNAPSHOT_SYNC_RETRY_MEDIUM_MS);

    syncTimeoutIdsRef.current = [shortTimeoutId, mediumTimeoutId];
  }, [needsOccupiableConsultorioOptions, refreshOccupiableConsultorios, refreshState]);

  const runCommand = async (
    command: () => Promise<{ message: string }>,
    options?: {
      successMessage?: string;
      onSuccess?: () => void;
      forceOccupiableRefresh?: boolean;
    },
  ) => {
    setIsSubmitting(true);
    setCommandResult(null);
    setCommandError(null);

    try {
      const result = await command();
      setCommandResult(options?.successMessage ?? result.message);
      options?.onSuccess?.();
      syncConsultorioState({
        forceOccupiableRefresh: options?.forceOccupiableRefresh ?? false,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "No fue posible enviar el comando";
      setCommandError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const runDisponibilidad = async (disponible: boolean) => {
    if (!consultorio || consultorio.estado === "SinMedico") {
      setCommandResult(null);
      setCommandError(`Asigna el consultorio ${selectedConsultorioId} antes de cambiar disponibilidad.`);
      return;
    }

    if (!isManagedByAuthenticatedDoctor) {
      setCommandResult(null);
      setCommandError("Solo puedes gestionar tu consultorio asignado.");
      return;
    }

    const isPauseWhileAttentionInProgress = !disponible && consultorioEstado === "EnAtencion";

    await runCommand(() => medicalCommands.setDisponibilidad(disponible), {
      successMessage: isPauseWhileAttentionInProgress
        ? "Pausa programada: al finalizar esta atencion no se asignaran mas pacientes."
        : undefined,
      onSuccess: () => {
        if (isPauseWhileAttentionInProgress) {
          setPauseAfterCurrentAttentionPending(true);
          return;
        }

        if (disponible) {
          setPauseAfterCurrentAttentionPending(false);
        }
      },
    });
  };

  const runFinalizeAttention = async () => {
    if (!consultorio || consultorio.estado !== "EnAtencion" || !isManagedByAuthenticatedDoctor) {
      setCommandResult(null);
      setCommandError("Solo puedes finalizar atencion en tu consultorio asignado.");
      return;
    }

    await runCommand(() => medicalCommands.finalizeAttention());
  };

  const runStartAttention = async () => {
    if (
      !consultorio ||
      consultorio.estado !== "ConMedicoDisponible" ||
      !isManagedByAuthenticatedDoctor ||
      !currentTicket
    ) {
      setCommandResult(null);
      setCommandError("Solo puedes iniciar atencion con un paciente llamado en tu consultorio.");
      return;
    }

    await runCommand(() =>
      medicalCommands.startAttention({
        pacienteNombre: currentTicket.name,
        pacienteDocumento: String(currentTicket.documentId),
      }),
    );
  };

  const runReleaseConsultorio = async () => {
    if (!consultorio || consultorio.estado === "SinMedico" || !isManagedByAuthenticatedDoctor) {
      setCommandResult(null);
      setCommandError("Solo puedes liberar tu consultorio asignado.");
      return;
    }

    await runCommand(() => medicalCommands.releaseConsultorio(), {
      forceOccupiableRefresh: true,
    });
  };

  return (
    <main className={styles.container}>
      <header className={styles.header}>
        <div className={styles.headerInfo}>
          <h1 className={styles.title}>Panel de consultorio</h1>
          <p className={styles.subtitle}>Toda la informacion clave en una sola vista.</p>
        </div>

        <div className={styles.headerRight}>
          <p className={`${styles.connectionBadge} ${connected ? styles.connected : styles.disconnected}`}>
            {connected ? "Conectado en tiempo real" : "Sin conexion en tiempo real"}
          </p>


            {(showAssignControls || consultorioBelongsToAnotherDoctor) && isLoadingOccupiableConsultorios && (
              <p className={styles.empty}>Cargando consultorios para seleccionar...</p>
            )}

            {showAssignControls && !isLoadingOccupiableConsultorios && !hasOccupiableConsultorios && (
              <p className={styles.empty}>No hay consultorios libres por ahora.</p>
            )}

            {showConsultorioSelector && (
              <div className={styles.inlineForm}>
                <div className={styles.inlineControls}>
                  <select
                    id="consultorio-selector"
                    aria-label="Consultorio"
                    value={selectedConsultorioId}
                    onChange={(event) => setSelectedConsultorioId(event.target.value)}
                    className={styles.input}
                  >
                    {occupiableConsultorioIds.map((consultorioId) => (
                      <option key={consultorioId} value={consultorioId}>
                        {consultorioId}
                      </option>
                    ))}
                  </select>

                  {showAssignControls && (
                    <button
                      type="button"
                      className={`${styles.secondaryButton} ${styles.headerActionButton}`}
                      disabled={isSubmitting}
                      onClick={() =>
                        runCommand(
                          () => medicalCommands.assignConsultorio(selectedConsultorioId),
                          { forceOccupiableRefresh: true },
                        )
                      }
                    >
                      Tomar consultorio
                    </button>
                  )}
                </div>
              </div>
            )}

            {consultorioBelongsToAnotherDoctor && (
              <p className={styles.empty}>
                El consultorio seleccionado lo esta usando otro medico. Cambia a tu consultorio para continuar.
              </p>
            )}

            {showPauseAfterAttentionHint && (
              <p role="status" aria-live="polite" className={styles.pauseHint}>
                Pausa programada: al finalizar esta atencion no se asignaran mas pacientes.
              </p>
            )}

            <div className={`${styles.actions} ${styles.headerActions}`}>
              {showMarkAvailable && (
                <button
                  type="button"
                  className={`${styles.primaryButton} ${styles.headerActionButton}`}
                  disabled={isSubmitting}
                  onClick={() => void runDisponibilidad(true)}
                >
                  Estoy disponible
                </button>
              )}

                {showStartAttention && (
                  <button
                    type="button"
                    className={`${styles.warningButton} ${styles.headerActionButton}`}
                    disabled={isSubmitting}
                    onClick={() => void runStartAttention()}
                  >
                    Iniciar atencion
                  </button>
                )}

              {showMarkUnavailable && (
                <button
                  type="button"
                  className={`${styles.secondaryButton} ${styles.headerActionButton}`}
                  disabled={isSubmitting}
                  onClick={() => void runDisponibilidad(false)}
                >
                  Pausar atencion
                </button>
              )}

              {showFinalizeAttention && (
                <button
                  type="button"
                  className={`${styles.warningButton} ${styles.headerActionButton}`}
                  disabled={isSubmitting}
                  onClick={() => void runFinalizeAttention()}
                >
                  Finalizar atencion
                </button>
              )}

              {showReleaseConsultorio && (
                <button
                  type="button"
                  className={`${styles.ghostButton} ${styles.headerActionButton}`}
                  disabled={isSubmitting}
                  onClick={() => void runReleaseConsultorio()}
                >
                  Salir del consultorio
                </button>
              )}
            </div>

            {!showAssignControls && !consultorioBelongsToAnotherDoctor && !hasContextualActions && (
              <p className={styles.empty}>No hay acciones pendientes en este momento.</p>
            )}
        </div>
      </header>

      {hasFloatingNotifications && (
        <div className={styles.notificationStack} aria-live="polite" aria-atomic="false">
          {error && <p className={styles.error}>{error}</p>}
          {commandError && <p className={styles.error}>{commandError}</p>}
          {commandResult && <p className={styles.success}>{commandResult}</p>}
          {showProcessingNotice && (
            <p role="status" aria-live="polite" className={styles.processing}>
              Procesando accion...
            </p>
          )}
        </div>
      )}

      <section className={styles.panel}>
        <div className={`${styles.stateBanner} ${styles[consultorioStatePresentation.tone]}`}>
          <div>
            <p className={styles.stateCaption}>Estado del consultorio</p>
            <h2 className={styles.stateValue}>{consultorioStatePresentation.label}</h2>
          </div>

          <div className={styles.stateDetails}>
            <p>
              <span>Consultorio:</span> {consultorioIdLabel}
            </p>
            <p>
              <span>Ultima actualizacion:</span>{" "}
              {consultorio ? formatTimestamp(consultorio.timestamp) : "Pendiente"}
            </p>
          </div>
        </div>

        <div className={styles.compactGrid}>
          <article className={styles.block}>
            <h3 className={styles.sectionTitle}>Paciente actual</h3>

            <div className={styles.dataGrid}>
              <div>
                <span className={styles.label}>Nombre</span>
                <p className={styles.value}>{patientDisplayName}</p>
              </div>

              <div>
                <span className={styles.label}>Documento</span>
                <p className={styles.value}>{patientDocument}</p>
              </div>

              <div>
                <span className={styles.label}>Estado de atencion</span>
                <p className={styles.value}>{patientAttentionState}</p>
              </div>

              <div>
                <span className={styles.label}>Consultorio asignado</span>
                <p className={styles.value}>{consultorioIdLabel}</p>
              </div>
            </div>
          </article>
        </div>
      </section>
    </main>
  );
}