import { renderHook, act, waitFor } from "@testing-library/react";
import { useConsultorioRealtime } from "@/hooks/useConsultorioRealtime";
import { mockRealTimeProvider } from "../mocks/factories";

describe("useConsultorioRealtime", () => {
  const buildInitialLoader = () =>
    jest.fn().mockResolvedValue({
      consultorioId: "C1",
      estado: "ConMedicoDisponible",
      patientId: null,
      timestamp: 1,
    });

  it("connects on mount and disconnects on unmount", async () => {
    const provider = mockRealTimeProvider();
    const loadInitialState = buildInitialLoader();

    const { unmount } = renderHook(() =>
      useConsultorioRealtime({
        realTime: provider,
        consultorioId: "C1",
        loadInitialState,
      }),
    );

    await waitFor(() => {
      expect(loadInitialState).toHaveBeenCalledWith("C1");
      expect(provider.connect).toHaveBeenCalledTimes(1);
    });
    unmount();
    expect(provider.disconnect).toHaveBeenCalledTimes(1);
  });

  it("stores consultorio state from consultorio_updated event", async () => {
    const provider = mockRealTimeProvider();
    const loadInitialState = buildInitialLoader();
    const { result } = renderHook(() =>
      useConsultorioRealtime({
        realTime: provider,
        consultorioId: "C1",
        loadInitialState,
      }),
    );

    await waitFor(() => {
      expect(provider.connect).toHaveBeenCalledTimes(1);
    });

    act(() => {
      provider._simulateConsultorioUpdated({
        consultorioId: "C1",
        estado: "ConMedicoDisponible",
        patientId: null,
        timestamp: 100,
      });
    });

    expect(result.current.consultorio).toEqual({
      consultorioId: "C1",
      estado: "ConMedicoDisponible",
      patientId: null,
      timestamp: 100,
    });
  });

  it("updates consultorio state from patient_assigned and attention_finished", async () => {
    const provider = mockRealTimeProvider();
    const loadInitialState = buildInitialLoader();
    const { result } = renderHook(() =>
      useConsultorioRealtime({
        realTime: provider,
        consultorioId: "C1",
        loadInitialState,
      }),
    );

    await waitFor(() => {
      expect(provider.connect).toHaveBeenCalledTimes(1);
    });

    act(() => {
      provider._simulatePatientAssigned({
        consultorioId: "C1",
        estado: "EnAtencion",
        patientId: "123",
        timestamp: 200,
      });
    });

    expect(result.current.consultorio?.estado).toBe("EnAtencion");
    expect(result.current.consultorio?.patientId).toBe("123");

    act(() => {
      provider._simulateAttentionFinished({
        consultorioId: "C1",
        estado: "ConMedicoDisponible",
        patientId: null,
        timestamp: 300,
      });
    });

    expect(result.current.consultorio?.estado).toBe("ConMedicoDisponible");
    expect(result.current.consultorio?.patientId).toBeNull();
    expect(result.current.patientName).toBeNull();
  });

  it("resolves patientName from turnos snapshot for current consultorio", async () => {
    const provider = mockRealTimeProvider();
    const loadInitialState = buildInitialLoader();
    const { result } = renderHook(() =>
      useConsultorioRealtime({
        realTime: provider,
        consultorioId: "C1",
        loadInitialState,
      }),
    );

    await waitFor(() => {
      expect(provider.connect).toHaveBeenCalledTimes(1);
    });

    act(() => {
      provider._simulatePatientAssigned({
        consultorioId: "C1",
        estado: "EnAtencion",
        patientId: "12345",
        timestamp: 200,
      });
    });

    act(() => {
      provider._simulateSnapshot([
        {
          id: "t-1",
          name: "Paciente Demo",
          documentId: 12345,
          office: "C1",
          timestamp: 1,
          status: "called",
        },
      ]);
    });

    expect(result.current.patientName).toBe("Paciente Demo");
  });

  it("tracks connection and error state", async () => {
    const provider = mockRealTimeProvider();
    const loadInitialState = buildInitialLoader();
    const { result } = renderHook(() =>
      useConsultorioRealtime({
        realTime: provider,
        consultorioId: "C1",
        loadInitialState,
      }),
    );

    await waitFor(() => {
      expect(provider.connect).toHaveBeenCalledTimes(1);
    });

    act(() => {
      provider._simulateConnect();
    });
    expect(result.current.connected).toBe(true);

    act(() => {
      provider._simulateError("ws error");
    });
    expect(result.current.connected).toBe(false);
    expect(result.current.error).toBe("ws error");
  });

  it("clears stale consultorio data when selected consultorio changes", async () => {
    const provider = mockRealTimeProvider();
    const loadInitialState = jest
      .fn()
      .mockResolvedValueOnce({
        consultorioId: "C1",
        estado: "ConMedicoDisponible",
        patientId: null,
        timestamp: 1,
      })
      .mockResolvedValueOnce({
        consultorioId: "C2",
        estado: "SinMedico",
        patientId: null,
        timestamp: 2,
      });

    const { result, rerender } = renderHook(
      ({ currentConsultorioId }) =>
        useConsultorioRealtime({
          realTime: provider,
          consultorioId: currentConsultorioId,
          loadInitialState,
        }),
      {
        initialProps: { currentConsultorioId: "C1" },
      },
    );

    await waitFor(() => {
      expect(result.current.consultorio?.consultorioId).toBe("C1");
    });

    rerender({ currentConsultorioId: "C2" });

    await waitFor(() => {
      expect(result.current.consultorio).toBeNull();
    });

    await waitFor(() => {
      expect(result.current.consultorio?.consultorioId).toBe("C2");
    });
  });

  it("refreshState allows manual reload of consultorio data", async () => {
    const provider = mockRealTimeProvider();
    const loadInitialState = jest
      .fn()
      .mockResolvedValueOnce({
        consultorioId: "C1",
        estado: "ConMedicoDisponible",
        patientId: null,
        timestamp: 10,
      })
      .mockResolvedValueOnce({
        consultorioId: "C1",
        estado: "ConMedicoNoDisponible",
        patientId: null,
        timestamp: 11,
      });

    const { result } = renderHook(() =>
      useConsultorioRealtime({
        realTime: provider,
        consultorioId: "C1",
        loadInitialState,
      }),
    );

    await waitFor(() => {
      expect(result.current.consultorio?.estado).toBe("ConMedicoDisponible");
    });

    await act(async () => {
      await result.current.refreshState();
    });

    expect(result.current.consultorio?.estado).toBe("ConMedicoNoDisponible");
    expect(loadInitialState).toHaveBeenCalledTimes(2);
  });
});
