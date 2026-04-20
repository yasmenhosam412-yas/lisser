const express = require("express");
const cors = require("cors");
const { exec } = require("child_process");
const fs = require("fs");
const path = require("path");

const app = express();
app.use(cors());
app.use(express.json());

// =========================
// CACHE DIR
// =========================
const CACHE_DIR = path.join(__dirname, "cache");
if (!fs.existsSync(CACHE_DIR)) {
  fs.mkdirSync(CACHE_DIR);
}

// =========================
// HEALTH
// =========================
app.get("/", (req, res) => {
  res.json({ ok: true, message: "Audio Backend Running 🚀" });
});

// =========================
// GET VIDEO ID
// =========================
function getVideoId(url) {
  const match = url.match(/(youtu\.be\/|v=|shorts\/)([^&?/]+)/);
  return match ? match[2] : null;
}

// =========================
// MAIN CONVERT FUNCTION
// =========================
function convertToAudio(url, videoId) {
  return new Promise((resolve, reject) => {
    const output = path.join(CACHE_DIR, `${videoId}.mp3`);

    // CACHE HIT
    if (fs.existsSync(output)) {
      return resolve(output);
    }

    const cmd = `
yt-dlp \
-f bestaudio \
--extract-audio \
--audio-format mp3 \
--audio-quality 128K \
--no-playlist \
--geo-bypass \
--cookies cookies.txt \
-o "${output}" \
"${url}"
`;

    exec(cmd, { timeout: 120000 }, (err) => {
      if (err) return reject(err);
      resolve(output);
    });
  });
}

// =========================
// API
// =========================
app.post("/audio", async (req, res) => {
  try {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({ error: "missing_url" });
    }

    const videoId = getVideoId(url);

    if (!videoId) {
      return res.status(400).json({ error: "invalid_url" });
    }

    const filePath = await convertToAudio(url, videoId);

    return res.json({
      ok: true,
      audioUrl: `/file/${videoId}`,
    });

  } catch (err) {
    return res.status(500).json({
      error: "download_failed",
      details: err.message,
    });
  }
});

// =========================
// SERVE FILES
// =========================
app.get("/file/:id", (req, res) => {
  const file = path.join(CACHE_DIR, `${req.params.id}.mp3`);

  if (!fs.existsSync(file)) {
    return res.status(404).json({ error: "not_found" });
  }

  res.sendFile(file);
});

// =========================
app.listen(3001, "0.0.0.0", () => {
  console.log("🚀 Audio backend running on port 3001");
});
