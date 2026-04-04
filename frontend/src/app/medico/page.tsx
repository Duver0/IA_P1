"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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

const formatConsultorioState = (estado: string): string => {
  switch (estado) {
    case "SinMedico":
      return "Sin medico";
    case "ConMedicoDisponible":
      return "Con medico disponible";
    case "EnAtencion":
      return "En atencion";
    case "ConMedicoNoDisponible":
      return "Con medico no disponible";
    default:
      return estado;
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
  const [occupiableConsultorioIds, setOccupiableConsultorioIds] = useState<string[]>([]);
  const [isLoadingOccupiableConsultorios, setIsLoadingOccupiableConsultorios] = useState(true);
  const medicalCommands = useMemo(
    () => new HttpMedicalCommandAdapter(env.API_BASE_URL),
    [],
  );
  const loadInitialState = useCallback(
    (consultorioId: string) => medicalCommands.getConsultorioState(consultorioId),
    [medicalCommands],
  );
  const { consultorio, patientName, connected, error, refreshState } = useConsultorioRealtime({
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
  const showAssignControls = !consultorio || consultorioEstado === "SinMedico";
  const needsOccupiableConsultorioOptions =
    showAssignControls || consultorioBelongsToAnotherDoctor;
  const hasOccupiableConsultorios = occupiableConsultorioIds.length > 0;
  const showConsultorioSelector =
    needsOccupiableConsultorioOptions && hasOccupiableConsultorios;

  const refreshOccupiableConsultorios = useCallback(async () => {
    if (!needsOccupiableConsultorioOptions) {
      setOccupiableConsultorioIds([]);
      setIsLoadingOccupiableConsultorios(false);
      return;
    }

    setIsLoadingOccupiableConsultorios(true);

    try {
      const states = await Promise.allSettled(
        consultorioIds.map(async (consultorioId) => ({
          consultorioId,
          state: await medicalCommands.getConsultorioState(consultorioId),
        })),
      );

      const occupiableIds = states.flatMap((result) => {
        if (result.status !== "fulfilled") {
          return [];
        }

        const { consultorioId, state } = result.value;
        const belongsToAuthenticatedDoctor = !!user?.id && state.medicoId === user.id;
        const canBeOccupied = state.estado === "SinMedico" || belongsToAuthenticatedDoctor;

        return canBeOccupied ? [consultorioId] : [];
      });

      setOccupiableConsultorioIds(occupiableIds);
    } finally {
      setIsLoadingOccupiableConsultorios(false);
    }
  }, [consultorioIds, medicalCommands, needsOccupiableConsultorioOptions, user?.id]);

  useEffect(() => {
    void refreshOccupiableConsultorios();
  }, [refreshOccupiableConsultorios]);

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
  const showMarkAvailable =
    isManagedByAuthenticatedDoctor && consultorioEstado === "ConMedicoNoDisponible";
  const showMarkUnavailable =
    isManagedByAuthenticatedDoctor &&
    (consultorioEstado === "ConMedicoDisponible" || consultorioEstado === "EnAtencion");
  const showFinalizeAttention =
    isManagedByAuthenticatedDoctor && consultorioEstado === "EnAtencion";
  const showReleaseConsultorio =
    isManagedByAuthenticatedDoctor && consultorioEstado === "ConMedicoNoDisponible";

  const syncConsultorioState = useCallback(() => {
    const syncSnapshot = () => {
      void refreshState();
      void refreshOccupiableConsultorios();
    };

    syncSnapshot();

    // Reintentos cortos para converger incluso cuando el comando se procesa de forma asíncrona.
    setTimeout(() => {
      syncSnapshot();
    }, 350);

    setTimeout(() => {
      syncSnapshot();
    }, 900);
  }, [refreshOccupiableConsultorios, refreshState]);

  const runCommand = async (command: () => Promise<{ message: string }>) => {
    setIsSubmitting(true);
    setCommandResult(null);
    setCommandError(null);

    try {
      const result = await command();
      setCommandResult(result.message);
      syncConsultorioState();
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

    await runCommand(() => medicalCommands.setDisponibilidad(disponible));
  };

  const runFinalizeAttention = async () => {
    if (!consultorio || consultorio.estado !== "EnAtencion" || !isManagedByAuthenticatedDoctor) {
      setCommandResult(null);
      setCommandError("Solo puedes finalizar atencion en tu consultorio asignado.");
      return;
    }

    await runCommand(() => medicalCommands.finalizeAttention());
  };

  const runReleaseConsultorio = async () => {
    if (!consultorio || consultorio.estado === "SinMedico" || !isManagedByAuthenticatedDoctor) {
      setCommandResult(null);
      setCommandError("Solo puedes liberar tu consultorio asignado.");
      return;
    }

    await runCommand(() => medicalCommands.releaseConsultorio());
  };

  return (
    <main className={styles.container}>
      <h1 className={styles.title}>Panel de Consultorio Medico</h1>

      <p className={connected ? styles.connected : styles.disconnected}>
        {connected
          ? "Conectado en tiempo real"
          : "Desconectado del canal realtime"}
      </p>

      {error && <p className={styles.error}>{error}</p>}
      {commandError && <p className={styles.error}>{commandError}</p>}
      {commandResult && <p className={styles.success}>{commandResult}</p>}

      <section className={styles.card}>
        <h2 className={styles.sectionTitle}>Acciones</h2>

        {(showAssignControls || consultorioBelongsToAnotherDoctor) && isLoadingOccupiableConsultorios && (
          <p className={styles.empty}>Cargando consultorios disponibles...</p>
        )}

        {showAssignControls && !isLoadingOccupiableConsultorios && !hasOccupiableConsultorios && (
          <p className={styles.empty}>No hay consultorios disponibles para ocupar en este momento.</p>
        )}

        {showConsultorioSelector && (
          <div className={styles.inlineForm}>
            <select
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
                className={styles.secondaryButton}
                disabled={isSubmitting}
                onClick={() =>
                  runCommand(() =>
                    medicalCommands.assignConsultorio(selectedConsultorioId),
                  )
                }
              >
                Asignar consultorio
              </button>
            )}
          </div>
        )}

        {consultorioBelongsToAnotherDoctor && (
          <p className={styles.empty}>
            El consultorio seleccionado esta asignado a otro medico. Selecciona tu consultorio para gestionar acciones.
          </p>
        )}

        <div className={styles.actions}>
          {showMarkAvailable && (
            <button
              type="button"
              className={styles.primaryButton}
              disabled={isSubmitting}
              onClick={() => void runDisponibilidad(true)}
            >
              Marcar disponible
            </button>
          )}

          {showMarkUnavailable && (
            <button
              type="button"
              className={styles.secondaryButton}
              disabled={isSubmitting}
              onClick={() => void runDisponibilidad(false)}
            >
              Marcar no disponible
            </button>
          )}

          {showFinalizeAttention && (
            <button
              type="button"
              className={styles.warningButton}
              disabled={isSubmitting}
              onClick={() => void runFinalizeAttention()}
            >
              Finalizar interaccion
            </button>
          )}

          {showReleaseConsultorio && (
            <button
              type="button"
              className={styles.warningButton}
              disabled={isSubmitting}
              onClick={() => void runReleaseConsultorio()}
            >
              Liberar consultorio
            </button>
          )}
        </div>
      </section>

      <section className={styles.cardsGrid}>
        <article className={styles.card}>
          <h2 className={styles.sectionTitle}>Estado actual del consultorio</h2>

          {consultorio ? (
            <div className={styles.statusGrid}>
              <div>
                <span className={styles.label}>Consultorio</span>
                <p className={styles.value}>{consultorio.consultorioId}</p>
              </div>
              <div>
                <span className={styles.label}>Estado</span>
                <p className={styles.value}>{formatConsultorioState(consultorio.estado)}</p>
              </div>
              <div>
                <span className={styles.label}>Ultima actualizacion</span>
                <p className={styles.value}>{formatTimestamp(consultorio.timestamp)}</p>
              </div>
            </div>
          ) : (
            <p className={styles.empty}>Aun no se reciben eventos de consultorio.</p>
          )}
        </article>

        <article className={styles.card}>
          <h2 className={styles.sectionTitle}>Datos del paciente</h2>

          {consultorio ? (
            <div className={styles.statusGrid}>
              <div>
                <span className={styles.label}>Nombre</span>
                <p className={styles.value}>
                  {consultorio.patientId
                    ? patientName ?? "Nombre pendiente de sincronizacion"
                    : "Sin paciente asignado"}
                </p>
              </div>
              <div>
                <span className={styles.label}>Documento</span>
                <p className={styles.value}>{consultorio.patientId ?? "Sin documento"}</p>
              </div>
              <div>
                <span className={styles.label}>Estado de atencion</span>
                <p className={styles.value}>
                  {consultorio.estado === "EnAtencion" ? "Paciente en atencion" : "Sin atencion activa"}
                </p>
              </div>
              <div>
                <span className={styles.label}>Consultorio asignado</span>
                <p className={styles.value}>{consultorio.consultorioId}</p>
              </div>
            </div>
          ) : (
            <p className={styles.empty}>Aun no hay datos de paciente para mostrar.</p>
          )}
        </article>
      </section>
    </main>
  );
}