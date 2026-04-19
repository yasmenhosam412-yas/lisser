const express = require("express");
const cors = require("cors");
const { exec } = require("child_process");

const app = express();
app.use(cors());
app.use(express.json());

// ============================
// 🎧 AUDIO ENDPOINT
// ============================
app.post("/audio", (req, res) => {
  const { url } = req.body;

  if (!url) {
    return res.status(400).json({ error: "Missing URL" });
  }

  // 🔥 FAST & STABLE METHOD
  const command = `yt-dlp -f "bestaudio[ext=m4a]/bestaudio" -g "${url}"`;

  exec(command, { timeout: 15000 }, (err, stdout, stderr) => {
    if (err) {
      console.error("yt-dlp error:", err.message);
      return res.status(500).json({ error: "yt-dlp failed" });
    }

    const audioUrl = stdout.trim();

    if (!audioUrl) {
      return res.status(500).json({ error: "No audio URL found" });
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
app.listen(3001, "0.0.0.0", () => {
  console.log("🚀 yt-dlp backend running on port 3001");
});
