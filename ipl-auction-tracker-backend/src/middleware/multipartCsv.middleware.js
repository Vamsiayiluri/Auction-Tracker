const MAX_UPLOAD_BYTES = 1024 * 1024;

const parseContentDisposition = (value = "") => {
  const params = {};
  value.split(";").forEach((part) => {
    const [rawKey, ...rawValue] = part.trim().split("=");
    if (!rawKey || !rawValue.length) return;
    params[rawKey] = rawValue.join("=").replace(/^"|"$/g, "");
  });
  return params;
};

const parseMultipartBody = (buffer, boundary) => {
  const body = buffer.toString("utf8");
  const sections = body.split(`--${boundary}`).slice(1, -1);
  const fields = {};
  const files = {};

  sections.forEach((section) => {
    const trimmed = section.replace(/^\r\n/, "").replace(/\r\n$/, "");
    const separatorIndex = trimmed.indexOf("\r\n\r\n");
    if (separatorIndex === -1) return;

    const rawHeaders = trimmed.slice(0, separatorIndex);
    const value = trimmed.slice(separatorIndex + 4);
    const dispositionHeader = rawHeaders
      .split("\r\n")
      .find((header) => header.toLowerCase().startsWith("content-disposition:"));
    if (!dispositionHeader) return;

    const disposition = parseContentDisposition(
      dispositionHeader.slice(dispositionHeader.indexOf(":") + 1)
    );
    if (!disposition.name) return;

    if (disposition.filename) {
      files[disposition.name] = {
        originalname: disposition.filename,
        buffer: Buffer.from(value, "utf8"),
      };
    } else {
      fields[disposition.name] = value.trim();
    }
  });

  return { fields, files };
};

export const multipartCsvUpload = (req, res, next) => {
  const contentType = req.headers["content-type"] || "";
  const boundaryMatch = contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/i);

  if (!contentType.toLowerCase().includes("multipart/form-data") || !boundaryMatch) {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: [{ row: null, message: "multipart/form-data with a CSV file is required" }],
    });
  }

  const boundary = boundaryMatch[1] || boundaryMatch[2];
  const chunks = [];
  let totalBytes = 0;
  let tooLarge = false;

  req.on("data", (chunk) => {
    totalBytes += chunk.length;
    if (totalBytes > MAX_UPLOAD_BYTES) {
      tooLarge = true;
      return;
    }
    chunks.push(chunk);
  });

  req.on("end", () => {
    if (tooLarge) {
      return res.status(413).json({
        success: false,
        message: "Validation failed",
        errors: [{ row: null, message: "CSV file must be 1 MB or smaller" }],
      });
    }

    const parsed = parseMultipartBody(Buffer.concat(chunks), boundary);
    req.body = parsed.fields;
    req.file = parsed.files.csv || parsed.files.file || null;
    return next();
  });

  req.on("error", () =>
    res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: [{ row: null, message: "Unable to read uploaded CSV file" }],
    })
  );
};
