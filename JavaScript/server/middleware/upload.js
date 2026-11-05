const multer = require("multer");
const path = require("node:path");
const { randomUUID } = require("node:crypto");
const { mkdir, unlink, writeFile } = require("node:fs/promises");

const uploadsDirectory = path.join(__dirname, "..", "uploads");
const maxFileSize = 5 * 1024 * 1024;

const pngSignature = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
]);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: maxFileSize,
    files: 1,
  },
});

function getImageExtension(buffer) {
  if (buffer.subarray(0, pngSignature.length).equals(pngSignature)) {
    return ".png";
  }

  if (
    buffer.length >= 3 &&
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff
  ) {
    return ".jpg";
  }

  if (
    buffer.length >= 12 &&
    buffer.toString("ascii", 0, 4) === "RIFF" &&
    buffer.toString("ascii", 8, 12) === "WEBP"
  ) {
    return ".webp";
  }

  return null;
}

async function removeUpload(filePath) {
  try {
    await unlink(filePath);
  } catch (err) {
    if (err.code !== "ENOENT") {
      console.error("Could not remove failed upload:", err.code || err.message);
    }
  }
}

function single(fieldName) {
  const parseUpload = upload.single(fieldName);

  return (req, res, next) => {
    parseUpload(req, res, async (err) => {
      if (err instanceof multer.MulterError) {
        if (err.code === "LIMIT_FILE_SIZE") {
          return res.status(413).json({
            message: "L’image ne doit pas dépasser 5 Mo.",
          });
        }

        return res.status(400).json({
          message: "Le fichier envoyé est invalide.",
        });
      }

      if (err) {
        return next(err);
      }

      if (!req.file) {
        return next();
      }

      const extension = getImageExtension(req.file.buffer);

      if (!extension) {
        return res.status(400).json({
          message: "Formats acceptés : JPEG, PNG et WebP.",
        });
      }

      const filename = `${randomUUID()}${extension}`;
      const filePath = path.join(uploadsDirectory, filename);

      try {
        await mkdir(uploadsDirectory, { recursive: true });
        await writeFile(filePath, req.file.buffer, { flag: "wx" });
      } catch (writeError) {
        return next(writeError);
      }

      delete req.file.buffer;
      req.file.filename = filename;
      req.file.path = filePath;

      res.once("finish", () => {
        if (res.statusCode >= 400) {
          void removeUpload(filePath);
        }
      });

      return next();
    });
  };
}

module.exports = { single };
