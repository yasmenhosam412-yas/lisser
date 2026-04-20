const express = require("express");
const cors = require("cors");
const { exec } = require("child_process");
const fs = require("fs");
const path = require("path");

const app = express();
app.use(cors());
app.use(express.json());

const CACHE_DIR = "./cache";
if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR);

// ======================
// HEALTH
// ======================
app.get("/", (req, res) => {
  res.json({ ok: true, status: "running" });
});

// ======================
// VIDEO ID
// ======================
function getVideoId(url) {
  const match = url.match(/(youtu\.be\/|v=|shorts\/)([^&?/]+)/);
  return match ? match[2] : null;
}

// ======================
// CACHE CHECK
// ======================
function getCachePath(id) {
  return path.join(CACHE_DIR, `${id}.mp3`);
}

// ======================
// DOWNLOAD AUDIO (STABLE)
// ======================
function downloadAudio(url, outputPath) {
  return new Promise((resolve, reject) => {
    const cmd = `
ffmpeg -y -i "$(yt-dlp -f bestaudio -g ${url})" 
-acodec libmp3lame -b:a 128k ${outputPath}
`;

    exec(cmd, { maxBuffer: 1024 * 1024 * 10 }, (err) => {
      if (err) return reject(err);
      resolve(outputPath);
    });
  });
}

// ======================
// AUDIO ENDPOINT
// ======================
app.post("/audio", async (req, res) => {
  try {
    const { url } = req.body;

    if (!url) return res.status(400).json({ error: "Missing URL" });

    const videoId = getVideoId(url);
    if (!videoId) return res.status(400).json({ error: "Invalid URL" });

    const cachedFile = getCachePath(videoId);

    // 🔥 CACHE HIT
    if (fs.existsSync(cachedFile)) {
      return res.json({
        ok: true,
        cached: true,
        audioUrl: `/cache/${videoId}.mp3`,
      });
    }

    // 🔥 DOWNLOAD ONCE
    await downloadAudio(url, cachedFile);

    return res.json({
      ok: true,
      cached: false,
      audioUrl: `/cache/${videoId}.mp3`,
    });

  } catch (err) {
    return res.status(500).json({
      error: "failed",
      details: err.message,
    });
  }
});

// ======================
// SERVE CACHE
// ======================
app.use("/cache", express.static(CACHE_DIR));

// ======================
app.listen(3001, "0.0.0.0", () => {
  console.log("🚀 Stable Audio Cache API running");
});
