const http = require("http");
const https = require("https");

const PORT = process.env.PORT || 8080;
const TARGET = "clovastudio.stream.ntruss.com";
const TARGET_BASE = "/v1/openai";

const server = http.createServer((req, res) => {
  // /v1/chat/completions -> /v1/openai/chat/completions
  if (!req.url.startsWith("/v1/")) {
    res.writeHead(404);
    return res.end("Not Found");
  }

  const chunks = [];
  req.on("data", (chunk) => chunks.push(chunk));
  req.on("end", () => {
    let body = Buffer.concat(chunks);

    // JSON body 변환
    if (body.length > 0) {
      try {
        const json = JSON.parse(body);
        if ("parallel_tool_calls" in json) {
          json.parallel_tool_calls = true;
        }
        if ("tool_choice" in json) {
          json.tool_choice = "auto";
        }
        body = Buffer.from(JSON.stringify(json));
      } catch {
        // JSON이 아니면 원본 그대로
      }
    }

    const targetPath = TARGET_BASE + req.url.substring(3); // /v1/ 제거

    const headers = { ...req.headers, host: TARGET };
    headers["content-length"] = body.length;

    const proxyReq = https.request(
      { hostname: TARGET, port: 443, path: targetPath, method: req.method, headers },
      (proxyRes) => {
        res.writeHead(proxyRes.statusCode, proxyRes.headers);
        proxyRes.pipe(res); // 스트리밍 그대로 전달
      }
    );

    proxyReq.on("error", (err) => {
      console.error("Proxy error:", err.message);
      if (!res.headersSent) res.writeHead(502);
      res.end("Bad Gateway");
    });

    proxyReq.end(body);
  });
});

server.listen(PORT, () => console.log(`Proxy listening on :${PORT}`));
