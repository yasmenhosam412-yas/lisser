const express = require("express");
const cors = require("cors");
const { exec } = require("child_process");
const fs = require("fs");
const path = require("path");

const app = express();

app.use(cors());
app.use(express.json());

// ============================
// CACHE FOLDER
// ============================
const CACHE_DIR = path.join(__dirname, "cache");
if (!fs.existsSync(CACHE_DIR)) {
  fs.mkdirSync(CACHE_DIR);
}

// ============================
// HEALTH
// ============================
app.get("/", (req, res) => {
  res.json({
    ok: true,
    message: "YouTube Audio API Running 🚀",
  });
});

// ============================
// VIDEO ID
// ============================
function getVideoId(url) {
  const match = url.match(/(youtu\.be\/|v=|shorts\/)([^&?/]+)/);
  return match ? match[2] : null;
}

// ============================
// RUN YT-DLP (SAFE MODE)
// ============================
function downloadAudio(videoId, url) {
  return new Promise((resolve, reject) => {
    const output = path.join(CACHE_DIR, `${videoId}.mp3`);

    // لو الملف موجود في الكاش
    if (fs.existsSync(output)) {
      return resolve(output);
    }

    const cmd = `
yt-dlp \
--cookies cookies.txt \
--no-playlist \
--geo-bypass \
-f bestaudio \
--extract-audio \
--audio-format mp3 \
--audio-quality 128K \
-o "${output}" \
"${url}"
`;

    exec(cmd, { timeout: 60000 }, (err) => {
      if (err) return reject(err);
      resolve(output);
    });
  });
}

// ============================
// AUDIO ENDPOINT
// ============================
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

    const filePath = await downloadAudio(videoId, url);

    return res.json({
      ok: true,
      audioUrl: `/file/${videoId}`,
    });

  } catch (err) {
    console.error(err);

    return res.status(500).json({
      error: "download_failed",
      details: err.message,
    });
  }
});

// ============================
// SERVE FILES
// ============================
app.get("/file/:id", (req, res) => {
  const file = path.join(CACHE_DIR, `${req.params.id}.mp3`);

  if (!fs.existsSync(file)) {
    return res.status(404).json({ error: "not_found" });
  }

  res.sendFile(file);
});

// ============================
app.listen(3001, "0.0.0.0", () => {
  console.log("🚀 Stable Audio Server running on 3001");
});
