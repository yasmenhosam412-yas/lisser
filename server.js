const express = require("express");
const cors = require("cors");
const { exec } = require("child_process");

const app = express();

app.use(cors());
app.use(express.json());

// ============================
// 🏠 HEALTH CHECK
// ============================
app.get("/", (req, res) => {
  res.send("YT-DLP API is running 🚀");
});

// ============================
// 🎧 AUDIO ENDPOINT
// ============================
app.post("/audio", (req, res) => {
  const { url } = req.body;

  if (!url) {
    return res.status(400).json({ error: "Missing URL" });
  }

  // ✅ FIXED yt-dlp command (stable for YouTube 2026)
  const command = `yt-dlp -f "bestaudio/best" \
--cookies cookies.txt \
--js-runtimes node \
--extractor-args "youtube:player_client=web" \
-g "${url}"`;

  exec(command, { timeout: 20000 }, (err, stdout, stderr) => {
    if (err) {
      console.error("yt-dlp error:", stderr || err.message);
      return res.status(500).json({
        error: "yt-dlp failed",
        details: stderr?.toString() || err.message,
      });
    }

    const audioUrl = stdout.trim();

    if (!audioUrl) {
      return res.status(500).json({
        error: "No audio URL found",
      });
    }

    return res.json({
      audioUrl,
      ok: true,
    });
  });
});

// ============================
// 🚀 START SERVER
// ============================
const PORT = 3001;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 yt-dlp backend running on port ${PORT}`);
});
