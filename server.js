const express = require("express");
const cors = require("cors");
const { exec } = require("child_process");
const fs = require("fs");

const app = express();
app.use(cors());
app.use(express.json());

const CACHE = "./cache";
if (!fs.existsSync(CACHE)) fs.mkdirSync(CACHE);

app.get("/", (req, res) => {
  res.json({ ok: true });
});

function getId(url) {
  const m = url.match(/(youtu\.be\/|v=|shorts\/)([^&?/]+)/);
  return m ? m[2] : null;
}

app.post("/audio", (req, res) => {
  const { url } = req.body;

  if (!url) return res.status(400).json({ error: "missing url" });

  const id = getId(url);
  if (!id) return res.status(400).json({ error: "invalid url" });

  const file = `${CACHE}/${id}.mp3`;

  if (fs.existsSync(file)) {
    return res.json({
      ok: true,
      cached: true,
      url: `/cache/${id}.mp3`,
    });
  }

  const cmd = `
yt-dlp \
-f "bestaudio" \
--no-playlist \
--geo-bypass \
--cookies cookies.txt \
--extractor-args "youtube:player_client=android" \
--user-agent "Mozilla/5.0" \
--add-header "referer:https://www.youtube.com/" \
--extract-audio \
--audio-format mp3 \
-o "${file}" \
"${url}"
`;

  exec(cmd, { maxBuffer: 1024 * 1024 * 50 }, (err) => {
    if (err) {
      return res.status(500).json({
        error: "yt-dlp_failed",
        details: err.message,
      });
    }

    res.json({
      ok: true,
      cached: false,
      url: `/cache/${id}.mp3`,
    });
  });
});

app.use("/cache", express.static(CACHE));

app.listen(3001, "0.0.0.0", () => {
  console.log("🚀 working youtube audio API");
});
