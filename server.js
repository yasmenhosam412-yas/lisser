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
// RUN YT-DLP (ROBUST)
// ============================
function runYtDlp(url) {
  return new Promise((resolve, reject) => {
    const cmd = `
yt-dlp \
-f "bestaudio/best" \
--no-playlist \
--geo-bypass \
--force-ipv4 \
--cookies cookies.txt \
--extractor-args "youtube:player_client=android,web" \
--user-agent "Mozilla/5.0" \
--socket-timeout 10 \
-g "${url}"
`;

    exec(cmd, { timeout: 30000 }, (err, stdout, stderr) => {
      if (err) {
        return reject(stderr || err.message);
      }

      const result = stdout.trim();

      if (!result) {
        return reject("No audio URL found");
      }

      resolve(result);
    });
  });
}

// ============================
// AUDIO API
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

    // 🔥 try yt-dlp
    const audioUrl = await runYtDlp(url);

    return res.json({
      ok: true,
      source: "yt-dlp",
      audioUrl,
    });

  } catch (err) {
    console.error("YT-DLP ERROR:", err);

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
  console.log("🚀 Production YouTube API running on 3001");
});
