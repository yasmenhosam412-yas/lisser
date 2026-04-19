const express = require("express");
const cors = require("cors");
const { exec } = require("child_process");

const app = express();
app.use(cors());
app.use(express.json());

app.post("/audio", (req, res) => {
  const { url } = req.body;

  if (!url) return res.status(400).json({ error: "Missing URL" });

  const command = `yt-dlp -f bestaudio --dump-json "${url}"`;

  exec(command, (err, stdout) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: "yt-dlp failed" });
    }

    try {
      const data = JSON.parse(stdout);

      const audioUrl =
        data.formats
          .filter(f => f.acodec !== "none")
          .sort((a, b) => (b.abr || 0) - (a.abr || 0))[0]?.url;

      res.json({
        audioUrl,
        duration: data.duration,
        title: data.title,
      });
    } catch (e) {
      res.status(500).json({ error: "parse error" });
    }
  });
});

app.listen(3000, "0.0.0.0", () => {
  console.log("yt-dlp backend running");
});