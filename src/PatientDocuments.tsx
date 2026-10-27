import { useEffect, useRef, useState } from "react";
import { Camera, Upload, Download, Trash2 } from "lucide-react";

type Attachment = {
  id: string;
  name: string;
  type: string;
  data: string;
  date: string;
  size: number;
};
const allowed = ["application/pdf", "image/jpeg", "image/png", "image/webp"];

export function PatientDocuments({
  value,
  onSave,
}: {
  value: string;
  onSave: (value: string) => boolean;
}) {
  const upload = useRef<HTMLInputElement>(null);
  const mobileCamera = useRef<HTMLInputElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const [scanning, setScanning] = useState(false);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (!scanning) return;
    let active = true;
    let stream: MediaStream | undefined;
    async function openCamera() {
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error("unsupported");
        }
        const opened = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
          audio: false,
        });
        if (!active) {
          opened.getTracks().forEach((track) => track.stop());
          return;
        }
        stream = opened;
        if (video.current) {
          video.current.srcObject = stream;
          await video.current.play();
        }
      } catch (error) {
        if (!active) return;
        const name = error instanceof DOMException ? error.name : "";
        setMessage(
          name === "NotAllowedError"
            ? "Camera access was denied. Allow camera access in your browser's site settings and try again."
            : name === "NotFoundError"
              ? "No camera was found. Connect a webcam or use Upload record."
              : "Unable to open the camera. Use HTTPS or localhost, check that your camera is available, or use Upload record.",
        );
        setScanning(false);
      }
    }
    void openCamera();
    return () => {
      active = false;
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, [scanning]);
  async function capture() {
    const source = video.current;
    if (!source?.videoWidth || !source.videoHeight) return;
    setReady(false);
    const canvas = document.createElement("canvas");
    canvas.width = source.videoWidth;
    canvas.height = source.videoHeight;
    const context = canvas.getContext("2d");
    if (!context) {
      setMessage("Unable to capture this image. Please try again.");
      setReady(true);
      return;
    }
    context.drawImage(source, 0, 0);
    try {
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/jpeg", 0.85),
      );
      if (!blob) throw new Error("capture");
      setScanning(false);
      await saveFile(
        new File([blob], `scan-${Date.now()}.jpg`, { type: "image/jpeg" }),
      );
    } catch {
      setMessage("Unable to capture this image. Please try again.");
      setReady(true);
    }
  }
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const documents: Attachment[] = JSON.parse(value);
  async function attach(input: HTMLInputElement) {
    const file = input.files?.[0];
    input.value = "";
    if (!file) return;
    await saveFile(file);
  }
  async function saveFile(file: File) {
    if (!allowed.includes(file.type)) {
      setMessage("Choose a PDF, JPG, PNG, or WebP file.");
      return;
    }
    if (
      !file.size ||
      documents.reduce((sum, doc) => sum + doc.size, 0) + file.size >
        2 * 1024 * 1024
    ) {
      setMessage(
        "Choose a nonempty file. Attachments must total 2 MB or less per patient.",
      );
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      const data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error("read"));
        reader.readAsDataURL(file);
      });
      const next = [
        ...documents,
        {
          id: crypto.randomUUID(),
          name: file.name,
          type: file.type,
          data,
          size: file.size,
          date: new Date().toISOString(),
        },
      ];
      setMessage(
        onSave(JSON.stringify(next))
          ? "Record attached successfully."
          : "Unable to save attachment. Browser storage may be full or disabled.",
      );
    } catch {
      setMessage("Unable to read this file. Please try again.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section
      className="patient-documents"
      aria-labelledby="documents-title"
      aria-busy={busy}
    >
      <h3 id="documents-title">Scanned & uploaded records</h3>
      <p>
        Attach a PDF or photo (2 MB total per patient). Scan opens a live camera
        preview. Take photo opens the native camera on supported phones (or a
        file picker on desktop). Allow camera access when prompted. Documents
        are saved in this browser. Details must be entered manually.
      </p>
      <div className="module-actions">
        <button
          className="button secondary"
          disabled={busy || scanning}
          onClick={() => {
            setMessage("");
            setReady(false);
            setScanning(true);
          }}
        >
          <Camera size={16} />
          Scan record
        </button>
        <button
          className="button secondary"
          disabled={busy || scanning}
          onClick={() => mobileCamera.current?.click()}
        >
          <Camera size={16} />
          Take photo
        </button>
        <button
          className="button secondary"
          disabled={busy}
          onClick={() => upload.current?.click()}
        >
          <Upload size={16} />
          Upload record
        </button>
      </div>
      <input
        ref={upload}
        type="file"
        accept={allowed.join(",")}
        aria-label="Upload patient record"
        hidden
        onChange={(e) => void attach(e.currentTarget)}
      />
      <input
        ref={mobileCamera}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        capture="environment"
        aria-label="Take patient record photo"
        hidden
        onChange={(e) => void attach(e.currentTarget)}
      />
      {scanning && (
        <div className="camera-preview">
          <video
            ref={video}
            autoPlay
            muted
            playsInline
            aria-label="Patient record camera preview"
            onLoadedData={() => setReady(true)}
          />
          <p>Position the record inside the preview, then capture a photo.</p>
          <div className="module-actions">
            <button
              className="button primary"
              disabled={!ready || busy}
              onClick={() => void capture()}
            >
              Capture photo
            </button>
            <button
              className="button secondary"
              onClick={() => {
                setScanning(false);
                setReady(false);
              }}
            >
              Cancel camera
            </button>
          </div>
        </div>
      )}
      <div role="status">{busy ? "Saving attachment…" : message}</div>
      {!documents.length && <p>No documents attached yet.</p>}
      <ul className="document-list">
        {documents.map((doc) => (
          <li key={doc.id}>
            <div>
              <strong>{doc.name}</strong>
              <small>
                {new Date(doc.date).toLocaleDateString()} ·{" "}
                {Math.ceil(doc.size / 1024)} KB
              </small>
            </div>
            <a
              className="button secondary"
              href={doc.data}
              download={doc.name}
              aria-label={`Download ${doc.name}`}
            >
              <Download size={16} />
            </a>
            <button
              className="button secondary"
              disabled={busy}
              aria-label={`Remove ${doc.name}`}
              onClick={() => {
                if (
                  window.confirm(`Remove ${doc.name} from this patient record?`)
                )
                  setMessage(
                    onSave(
                      JSON.stringify(
                        documents.filter((item) => item.id !== doc.id),
                      ),
                    )
                      ? "Attachment removed."
                      : "Unable to remove attachment.",
                  );
              }}
            >
              <Trash2 size={16} />
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
