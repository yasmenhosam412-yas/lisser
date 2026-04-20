const express = require("express");
const cors = require("cors");
const { exec } = require("child_process");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const app = express();

app.use(cors());
app.use(express.json());

// ======================
// STORAGE
// ======================
const AUDIO_DIR = path.join(__dirname, "audio");

if (!fs.existsSync(AUDIO_DIR)) {
  fs.mkdirSync(AUDIO_DIR);
}

// ======================
// HEALTH
// ======================
app.get("/", (req, res) => {
  res.json({ ok: true, message: "MP3 Cache API Running" });
});

// ======================
// HASH URL
// ======================
function hash(url) {
  return crypto.createHash("md5").update(url).digest("hex");
}

// ======================
// AUDIO ENDPOINT
// ======================
app.post("/audio", (req, res) => {
  const { url } = req.body;

  if (!url) return res.status(400).json({ error: "Missing URL" });

  const id = hash(url);
  const filePath = path.join(AUDIO_DIR, `${id}.mp3`);

  // ======================
  // CACHE HIT
  // ======================
  if (fs.existsSync(filePath)) {
    return res.json({
      ok: true,
      cached: true,
      audioUrl: `/audio-file/${id}`
    });
  }

  // ======================
  // DOWNLOAD + CONVERT
  // ======================
  const cmd = `
yt-dlp -x \
--audio-format mp3 \
--audio-quality 0 \
--no-playlist \
--geo-bypass \
--user-agent "Mozilla/5.0" \
-o "${filePath}" "${url}"
  `;

  exec(cmd, { timeout: 120000 }, (err, stdout, stderr) => {
    if (err) {
      return res.status(500).json({
        error: "download_failed",
        details: stderr?.toString() || err.message
      });
    }

    return res.json({
      ok: true,
      cached: false,
      audioUrl: `/audio-file/${id}`
    });
  });
});

// ======================
// SERVE FILES
// ======================
app.get("/audio-file/:id", (req, res) => {
  const filePath = path.join(AUDIO_DIR, `${req.params.id}.mp3`);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: "not found" });
  }

  res.sendFile(filePath);
});

// ======================
// START
// ======================
app.listen(3001, "0.0.0.0", () => {
  console.log("🚀 MP3 Storage API running");
});
