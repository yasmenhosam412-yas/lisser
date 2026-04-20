const express = require("express");
const cors = require("cors");
const { exec } = require("child_process");

const app = express();

app.use(cors());
app.use(express.json());

// ======================
// HEALTH
// ======================
app.get("/", (req, res) => {
  res.json({ ok: true });
});

// ======================
// AUDIO
// ======================
app.post("/audio", (req, res) => {
  const { url } = req.body;

  if (!url) {
    return res.status(400).json({ error: "Missing URL" });
  }

  // 🔥 lightweight & stable command
  const cmd = `yt-dlp -f ba \
--no-playlist \
--geo-bypass \
--user-agent "Mozilla/5.0" \
--extractor-args "youtube:player_client=android" \
--get-url "${url}"`;

  exec(cmd, { timeout: 25000 }, (err, stdout, stderr) => {
    if (err) {
      return res.status(500).json({
        error: "yt-dlp_failed",
        details: stderr?.toString() || err.message
      });
    }

    const audioUrl = stdout.trim();

    if (!audioUrl) {
      return res.status(500).json({
        error: "no_audio_found"
      });
    }

    return res.json({
      ok: true,
      audioUrl
    });
  });
});

app.listen(3001, "0.0.0.0", () => {
  console.log("🚀 Light YouTube API running");
});
