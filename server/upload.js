// =============================================================================
// Video upload endpoint — accepts pre-compressed MP4 from client and stores
// in Supabase storage bucket `videos`. Returns public URL.
// Auth: creator JWT.  Limits: 200MB, MP4/WebM/QuickTime only.
// =============================================================================

const express = require("express");
const multer = require("multer");

const MAX_BYTES = 200 * 1024 * 1024; // 200MB
const ALLOWED_MIME = new Set(["video/mp4", "video/webm", "video/quicktime", "video/x-m4v"]);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_BYTES, files: 1 },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_MIME.has(file.mimetype)) {
      return cb(new Error("Tipo file non supportato (servono MP4 / WebM / MOV)"));
    }
    cb(null, true);
  },
});

const SAFE_NAME_RE = /^[a-zA-Z0-9._-]+$/;

const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5MB
const ALLOWED_IMAGE_MIME = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

const uploadImage = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_IMAGE_BYTES, files: 1 },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_IMAGE_MIME.has(file.mimetype)) {
      return cb(new Error("Formato immagine non supportato (JPG/PNG/WebP/GIF)"));
    }
    cb(null, true);
  },
});

const MAX_DOC_BYTES = 25 * 1024 * 1024; // 25MB
const ALLOWED_DOC_MIME = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/zip",
  "application/x-zip-compressed",
  "text/plain",
  "text/csv",
  "application/json",
]);

const uploadDocument = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_DOC_BYTES, files: 1 },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_DOC_MIME.has(file.mimetype)) {
      return cb(new Error("Formato documento non supportato (PDF, DOC/DOCX, XLS/XLSX, PPT/PPTX, ZIP, TXT, CSV)"));
    }
    cb(null, true);
  },
});

function extForDoc(mime) {
  return ({
    "application/pdf": "pdf",
    "application/msword": "doc",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
    "application/vnd.ms-excel": "xls",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
    "application/vnd.ms-powerpoint": "ppt",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation": "pptx",
    "application/zip": "zip",
    "application/x-zip-compressed": "zip",
    "text/plain": "txt",
    "text/csv": "csv",
    "application/json": "json",
  }[mime] || "bin");
}

function sanitizeOriginalName(name) {
  if (!name || typeof name !== "string") return "documento";
  return name.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 120);
}

module.exports = function createUploadRouter({ supabase, requireUserJWT }) {
  const router = express.Router();

  router.post("/video", (req, res, next) => {
    upload.single("file")(req, res, (err) => {
      if (err) {
        if (err.code === "LIMIT_FILE_SIZE") {
          return res.status(413).json({ error: "File troppo grande (max 200MB)" });
        }
        console.warn("[upload]", err.message);
        return res.status(400).json({ error: err.message });
      }
      next();
    });
  }, async (req, res) => {
    const user = await requireUserJWT(req);
    if (!user) return res.status(401).json({ error: "Autenticazione richiesta" });
    if (!req.file) return res.status(400).json({ error: "Nessun file ricevuto" });

    // Sanitize original filename for the storage path
    const ext = (req.file.mimetype === "video/webm") ? "webm"
      : (req.file.mimetype === "video/quicktime" || req.file.mimetype === "video/x-m4v") ? "mov"
      : "mp4";
    const safeStem = String(Date.now()) + "-" + Math.random().toString(36).slice(2, 10);
    const fileName = `videos/${user.id}/${safeStem}.${ext}`;

    if (!SAFE_NAME_RE.test(`${safeStem}.${ext}`)) {
      return res.status(400).json({ error: "Nome file non valido" });
    }

    try {
      const { error: upErr } = await supabase.storage
        .from("videos")
        .upload(fileName, req.file.buffer, {
          contentType: req.file.mimetype,
          cacheControl: "3600",
          upsert: false,
        });
      if (upErr) {
        console.error("[upload:supabase]", upErr.message);
        return res.status(500).json({ error: "Errore upload storage" });
      }

      const { data: pub } = supabase.storage.from("videos").getPublicUrl(fileName);
      console.log(`[upload] ${user.id} → ${fileName} (${req.file.size} bytes)`);
      return res.json({
        url: pub.publicUrl,
        path: fileName,
        size: req.file.size,
        mime: req.file.mimetype,
      });
    } catch (err) {
      console.error("[upload]", err.message);
      return res.status(500).json({ error: "Errore upload" });
    }
  });

  // ---------------------------------------------------------------------------
  // POST /api/upload/image  — for profile / cover / course cover
  // ---------------------------------------------------------------------------
  router.post("/image", (req, res, next) => {
    uploadImage.single("file")(req, res, (err) => {
      if (err) {
        if (err.code === "LIMIT_FILE_SIZE") {
          return res.status(413).json({ error: "Immagine troppo grande (max 5MB)" });
        }
        return res.status(400).json({ error: err.message });
      }
      next();
    });
  }, async (req, res) => {
    const user = await requireUserJWT(req);
    if (!user) return res.status(401).json({ error: "Autenticazione richiesta" });
    if (!req.file) return res.status(400).json({ error: "Nessun file ricevuto" });

    const ext = req.file.mimetype === "image/png" ? "png"
      : req.file.mimetype === "image/webp" ? "webp"
      : req.file.mimetype === "image/gif" ? "gif"
      : "jpg";
    const safeStem = String(Date.now()) + "-" + Math.random().toString(36).slice(2, 10);
    const fileName = `images/${user.id}/${safeStem}.${ext}`;

    try {
      const { error: upErr } = await supabase.storage
        .from("images")
        .upload(fileName, req.file.buffer, {
          contentType: req.file.mimetype,
          cacheControl: "31536000",
          upsert: false,
        });
      if (upErr) {
        console.error("[upload:image]", upErr.message);
        return res.status(500).json({ error: "Errore upload immagine" });
      }
      const { data: pub } = supabase.storage.from("images").getPublicUrl(fileName);
      console.log(`[upload:image] ${user.id} → ${fileName} (${req.file.size} bytes)`);
      return res.json({
        url: pub.publicUrl,
        path: fileName,
        size: req.file.size,
        mime: req.file.mimetype,
      });
    } catch (err) {
      console.error("[upload:image]", err.message);
      return res.status(500).json({ error: "Errore upload" });
    }
  });

  // ---------------------------------------------------------------------------
  // POST /api/upload/document  — for course lesson handouts/attachments
  // ---------------------------------------------------------------------------
  router.post("/document", (req, res, next) => {
    uploadDocument.single("file")(req, res, (err) => {
      if (err) {
        if (err.code === "LIMIT_FILE_SIZE") {
          return res.status(413).json({ error: "Documento troppo grande (max 25MB)" });
        }
        return res.status(400).json({ error: err.message });
      }
      next();
    });
  }, async (req, res) => {
    const user = await requireUserJWT(req);
    if (!user) return res.status(401).json({ error: "Autenticazione richiesta" });
    if (!req.file) return res.status(400).json({ error: "Nessun file ricevuto" });

    const originalName = sanitizeOriginalName(req.file.originalname);
    const ext = extForDoc(req.file.mimetype);
    const safeStem = String(Date.now()) + "-" + Math.random().toString(36).slice(2, 10);
    const fileName = `documents/${user.id}/${safeStem}.${ext}`;

    try {
      const { error: upErr } = await supabase.storage
        .from("documents")
        .upload(fileName, req.file.buffer, {
          contentType: req.file.mimetype,
          cacheControl: "3600",
          upsert: false,
        });
      if (upErr) {
        console.error("[upload:document]", upErr.message);
        return res.status(500).json({ error: "Errore upload documento" });
      }
      const { data: pub } = supabase.storage.from("documents").getPublicUrl(fileName);
      console.log(`[upload:document] ${user.id} → ${fileName} (${req.file.size} bytes)`);
      return res.json({
        url: pub.publicUrl,
        path: fileName,
        name: originalName,
        size: req.file.size,
        mime: req.file.mimetype,
      });
    } catch (err) {
      console.error("[upload:document]", err.message);
      return res.status(500).json({ error: "Errore upload" });
    }
  });

  return router;
};
