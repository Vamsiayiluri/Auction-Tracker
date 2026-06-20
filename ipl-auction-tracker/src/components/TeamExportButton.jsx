import { useState } from "react";
import { Alert, Button, Snackbar } from "@mui/material";
import FileDownloadRoundedIcon from "@mui/icons-material/FileDownloadRounded";
import api from "../utils/api";

const fallbackMessage = "Unable to export teams right now.";

const filenameFromDisposition = (disposition) => {
  if (!disposition) return "";
  const utf8Match = disposition.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match) return decodeURIComponent(utf8Match[1].replace(/"/g, ""));
  const plainMatch = disposition.match(/filename="?([^";]+)"?/i);
  return plainMatch?.[1] || "";
};

const fallbackFilename = (name = "Tournament") =>
  `${String(name || "Tournament")
    .trim()
    .replace(/[^A-Za-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "") || "Tournament"}_Teams.xlsx`;

async function readBlobError(error) {
  const data = error?.response?.data;
  if (data instanceof Blob) {
    try {
      const text = await data.text();
      return JSON.parse(text).message || fallbackMessage;
    } catch {
      return fallbackMessage;
    }
  }
  return data?.message || fallbackMessage;
}

export default function TeamExportButton({
  endpoint,
  tournamentName,
  allowed,
  size = "medium",
  variant = "outlined",
}) {
  const [downloading, setDownloading] = useState(false);
  const [message, setMessage] = useState("");

  if (!allowed) return null;

  const download = async () => {
    setDownloading(true);
    setMessage("");
    try {
      const response = await api.get(endpoint, { responseType: "blob" });
      const filename =
        filenameFromDisposition(response.headers["content-disposition"]) ||
        fallbackFilename(tournamentName);
      const url = window.URL.createObjectURL(response.data);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      setMessage(await readBlobError(error));
    } finally {
      setDownloading(false);
    }
  };

  return (
    <>
      <Button
        variant={variant}
        size={size}
        startIcon={<FileDownloadRoundedIcon />}
        disabled={downloading}
        onClick={download}
      >
        {downloading ? "Exporting..." : "Export Teams to Excel"}
      </Button>
      <Snackbar
        open={Boolean(message)}
        autoHideDuration={5000}
        onClose={() => setMessage("")}
      >
        <Alert severity="error" onClose={() => setMessage("")}>
          {message}
        </Alert>
      </Snackbar>
    </>
  );
}
