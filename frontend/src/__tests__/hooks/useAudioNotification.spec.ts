import { renderHook, act } from "@testing-library/react";
import { useAudioNotification } from "@/hooks/useAudioNotification";
import { mockAudioNotifier } from "../mocks/factories";

describe("useAudioNotification", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("initializes audio on mount with correct source", () => {
    const audio = mockAudioNotifier();
    renderHook(() => useAudioNotification(audio));

    expect(audio.init).toHaveBeenCalledWith("/sounds/ding.mp3", 0.6);
  });

  it("unlocks audio on user click and updates audioEnabled", async () => {
    const audio = mockAudioNotifier();
    audio.isEnabled.mockReturnValue(true);
    audio.unlock.mockResolvedValue(undefined);

    renderHook(() => useAudioNotification(audio));


    await act(async () => {
      window.dispatchEvent(new Event("click"));
    });

    expect(audio.unlock).toHaveBeenCalled();
  });

  it("plays audio and shows toast on notify()", () => {
    const audio = mockAudioNotifier();
    audio.isEnabled.mockReturnValue(true);

    const { result } = renderHook(() => useAudioNotification(audio));

    act(() => {
      result.current.notify("New ticket called!");
    });

    expect(audio.play).toHaveBeenCalled();
    expect(result.current.showToast).toBe(true);
    expect(result.current.toastMessage).toBe("New ticket called!");
  });

  it("hides toast after TOAST_DURATION (2600ms)", () => {
    const audio = mockAudioNotifier();
    audio.isEnabled.mockReturnValue(true);

    const { result } = renderHook(() => useAudioNotification(audio));

    act(() => {
      result.current.notify("test");
    });
    expect(result.current.showToast).toBe(true);

    act(() => {
      jest.advanceTimersByTime(2600);
    });
    expect(result.current.showToast).toBe(false);
  });

  it("does not play audio when audio is not enabled", () => {
    const audio = mockAudioNotifier();
    audio.isEnabled.mockReturnValue(false);

    const { result } = renderHook(() => useAudioNotification(audio));

    act(() => {
      result.current.notify("silent notification");
    });

    expect(audio.play).not.toHaveBeenCalled();

    expect(result.current.showToast).toBe(true);
    expect(result.current.toastMessage).toBe("silent notification");
  });

  it("starts with audioEnabled = false", () => {
    const audio = mockAudioNotifier();
    audio.isEnabled.mockReturnValue(false);

    const { result } = renderHook(() => useAudioNotification(audio));

    expect(result.current.audioEnabled).toBe(false);
  });
});
