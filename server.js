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
// CACHE FOLDER
// ======================
const CACHE_DIR = path.join(__dirname, "cache");

if (!fs.existsSync(CACHE_DIR)) {
  fs.mkdirSync(CACHE_DIR);
}

// ======================
// HEALTH
// ======================
app.get("/", (req, res) => {
  res.json({ ok: true, message: "🚀 Cached YouTube API Running" });
});

// ======================
// HASH URL
// ======================
function hashUrl(url) {
  return crypto.createHash("md5").update(url).digest("hex");
}

// ======================
// GET AUDIO
// ======================
app.post("/audio", (req, res) => {
  const { url } = req.body;

  if (!url) {
    return res.status(400).json({ error: "Missing URL" });
  }

  const id = hashUrl(url);
  const cacheFile = path.join(CACHE_DIR, `${id}.json`);

  // ======================
  // 1. CACHE HIT
  // ======================
  if (fs.existsSync(cacheFile)) {
    const cached = JSON.parse(fs.readFileSync(cacheFile, "utf-8"));

    return res.json({
      ok: true,
      cached: true,
      audioUrl: cached.audioUrl,
    });
  }

  // ======================
  // 2. CACHE MISS → yt-dlp
  // ======================
  const cmd = `
yt-dlp -f ba \
--no-playlist \
--geo-bypass \
--user-agent "Mozilla/5.0" \
--extractor-args "youtube:player_client=web" \
--get-url "${url}"
  `;

  exec(cmd, { timeout: 30000 }, (err, stdout, stderr) => {
    if (err) {
      return res.status(500).json({
        error: "yt-dlp_failed",
        details: stderr?.toString() || err.message,
      });
    }

    const audioUrl = stdout.trim();

    if (!audioUrl) {
      return res.status(500).json({
        error: "no_audio_found",
      });
    }

    // ======================
    // SAVE CACHE
    // ======================
    fs.writeFileSync(
      cacheFile,
      JSON.stringify({
        url,
        audioUrl,
        createdAt: Date.now(),
      })
    );

    return res.json({
      ok: true,
      cached: false,
      audioUrl,
    });
  });
});

// ======================
// START
// ======================
app.listen(3001, "0.0.0.0", () => {
  console.log("🚀 Cached YouTube API running on 3001");
});
