import { useEffect, useState } from "react";
import { Check, Download, Share } from "lucide-react";
import { Modal } from "./components";

interface InstallPrompt extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function useAppInstall() {
  const [prompt, setPrompt] = useState<InstallPrompt | null>(null);
  const [installed, setInstalled] = useState(false);
  useEffect(() => {
    const display = window.matchMedia("(display-mode: standalone)");
    const update = () =>
      setInstalled(
        display.matches ||
          Boolean(
            (navigator as Navigator & { standalone?: boolean }).standalone,
          ),
      );
    const available = (event: Event) => {
      event.preventDefault();
      setPrompt(event as InstallPrompt);
    };
    const complete = () => {
      setInstalled(true);
      setPrompt(null);
    };
    update();
    display.addEventListener("change", update);
    window.addEventListener("beforeinstallprompt", available);
    window.addEventListener("appinstalled", complete);
    return () => {
      display.removeEventListener("change", update);
      window.removeEventListener("beforeinstallprompt", available);
      window.removeEventListener("appinstalled", complete);
    };
  }, []);
  return { prompt, installed, clearPrompt: () => setPrompt(null) };
}

export function InstallDialog({
  prompt,
  installed,
  clearPrompt,
  onClose,
}: ReturnType<typeof useAppInstall> & { onClose: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <Modal
      title={installed ? "You’re ready to go" : "Dareme, one tap away"}
      onClose={onClose}
    >
      <div className="install-symbol">
        {installed ? <Check size={30} /> : <Download size={30} />}
      </div>
      <p className="dialog-intro">
        {installed
          ? "Open Dareme from your home screen whenever you like."
          : "Add Dareme to your home screen. It opens in its own window, just like an app."}
      </p>
      {prompt && !installed ? (
        <button
          className="button primary full"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            setError("");
            try {
              await prompt.prompt();
              const choice = await prompt.userChoice;
              clearPrompt();
              if (choice.outcome === "accepted") onClose();
            } catch {
              clearPrompt();
              setError("Use your browser’s menu to add Dareme instead.");
            } finally {
              setBusy(false);
            }
          }}
        >
          <Download size={17} />
          {busy ? "Opening install…" : "Install Dareme"}
        </button>
      ) : (
        !installed && (
          <div className="install-instructions">
            <div>
              <Share size={20} />
              <p>
                <strong>On iPhone or iPad</strong>
                <span>Open in Safari. Tap Share, then Add to Home Screen.</span>
              </p>
            </div>
            <div>
              <Download size={20} />
              <p>
                <strong>On Android</strong>
                <span>
                  Open Chrome’s menu. Tap Install app or Add to Home screen.
                </span>
              </p>
            </div>
            <p className="small-muted">
              On a computer, use your browser’s install icon if available. You
              can also keep using Dareme here.
            </p>
          </div>
        )
      )}
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
      <button className="button light full" onClick={onClose}>
        {installed ? "Done" : "Keep exploring"}
      </button>
    </Modal>
  );
}
