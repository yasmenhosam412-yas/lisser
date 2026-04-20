const express = require("express");
const cors = require("cors");
const { exec } = require("child_process");

const app = express();

app.use(cors());
app.use(express.json());

// ============================
// HEALTH
// ============================
app.get("/", (req, res) => {
  res.json({ ok: true, status: "running" });
});

// ============================
// VIDEO ID
// ============================
function getVideoId(url) {
  const match = url.match(/(youtu\.be\/|v=|shorts\/)([^&?/]+)/);
  return match ? match[2] : null;
}

// ============================
// YT-DLP CORE (FIXED)
// ============================
function runYtDlp(url) {
  return new Promise((resolve, reject) => {
    const cmd = `
yt-dlp \
-f "bestaudio" \
--no-playlist \
--geo-bypass \
--extractor-args "youtube:player_client=android" \
--user-agent "Mozilla/5.0" \
-g "${url}"
`;

    exec(cmd, { timeout: 30000 }, (err, stdout, stderr) => {
      if (err) return reject(stderr || err.message);

      const result = stdout.trim();
      if (!result) return reject("No audio found");

      resolve(result);
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
      return res.status(400).json({ error: "Missing URL" });
    }

    const videoId = getVideoId(url);

    if (!videoId) {
      return res.status(400).json({ error: "Invalid URL" });
    }

    const audioUrl = await runYtDlp(url);

    return res.json({
      ok: true,
      audioUrl,
      source: "yt-dlp"
    });

  } catch (err) {
    console.error(err);

    return res.status(500).json({
      error: "internal_error",
      details: err.toString(),
    });
  }
});

// ============================
// START
// ============================
app.listen(3001, "0.0.0.0", () => {
  console.log("🚀 Stable YouTube API running on 3001");
});
