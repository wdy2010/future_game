const http = require("http");
const fs = require("fs");
const path = require("path");

function loadLocalEnv() {
  const envPath = path.join(__dirname, ".env");
  if (!fs.existsSync(envPath)) return;

  const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);
  lines.forEach((line) => {
    const trimmedLine = line.trim();
    if (!trimmedLine || trimmedLine.startsWith("#")) return;
    const separatorIndex = trimmedLine.indexOf("=");
    if (separatorIndex < 1) return;

    const key = trimmedLine.slice(0, separatorIndex).trim();
    const value = trimmedLine.slice(separatorIndex + 1).trim().replace(/^(['"])(.*)\1$/, "$2");
    if (!process.env[key]) process.env[key] = value;
  });
}

loadLocalEnv();

const PORT = Number(process.env.PORT) || 3000;
const HOST = "0.0.0.0";
const PUBLIC_DIRECTORY = __dirname;
// 실제 키는 저장소에 기록하지 말고 .env 또는 실행 환경변수로만 주입합니다.
const TAVILY_API_KEY = process.env.TAVILY_API_KEY || "";
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";
const TAVILY_ENDPOINT = "https://api.tavily.com/search";
const GEMINI_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent";

function isConfiguredKey(value) {
  return Boolean(value) && !value.startsWith("여기에_") && !value.includes("붙여넣기");
}

const DEMO_SOURCES = [
  { title: "NIST Materials Science", url: "https://www.nist.gov/materials-science" },
  { title: "U.S. Department of Energy", url: "https://www.energy.gov/science" },
];

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8",
};

function sendResponse(response, statusCode, contentType, body) {
  response.writeHead(statusCode, {
    "Content-Type": contentType,
    "Cache-Control": "no-cache",
  });
  response.end(body);
}

function getSafeFilePath(requestUrl) {
  const url = new URL(requestUrl, `http://${HOST}:${PORT}`);
  const requestedPath = decodeURIComponent(url.pathname);
  const normalizedPath = path.normalize(requestedPath).replace(/^(\.\.[/\\])+/, "");
  const relativePath =
    normalizedPath === "/" || normalizedPath === "."
      ? "index.html"
      : normalizedPath.replace(/^[/\\]+/, "");

  const filePath = path.resolve(PUBLIC_DIRECTORY, relativePath);
  const relativeToPublic = path.relative(PUBLIC_DIRECTORY, filePath);

  if (
    relativeToPublic.startsWith("..") ||
    path.isAbsolute(relativeToPublic) ||
    relativePath.startsWith(".")
  ) {
    return null;
  }

  return filePath;
}

function createDemoEvaluation(scenario, selectedIndex) {
  const materials = scenario.materials || [];
  const preferredIndex = scenario.id === "architecture" ? 0 : scenario.id === "mobility" ? 1 : 0;
  const ranking = materials.map((material, index) => ({ name: material.name, points: index === preferredIndex ? 30 : index === (preferredIndex + 1) % materials.length ? 20 : 10 })).sort((a, b) => b.points - a.points);
  const selected = materials[selectedIndex] || materials[0];
  return { score: ranking.find((item) => item.name === selected.name).points, ranking, reason: `${selected.name}을(를) 선택했습니다. AI는 실제 자료에서 확인한 성능과 ${scenario.criteria.join(", ")} 기준을 종합해 순위를 계산합니다. 아래 결과는 데모 평가이며 API 연결 후 Gemini 분석으로 대체됩니다.`, sources: DEMO_SOURCES };
}

async function searchWithTavily(scenario) {
  if (!isConfiguredKey(TAVILY_API_KEY)) return null;
  const response = await fetch(TAVILY_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: TAVILY_API_KEY,
      query: `${scenario.title} ${scenario.materials.map((item) => item.name).join(" ")} scientific material properties`,
      search_depth: "advanced",
      max_results: 5,
      include_answer: false,
    }),
  });
  if (!response.ok) throw new Error(`Tavily HTTP ${response.status}`);
  const data = await response.json();
  return (data.results || []).map((result) => ({
    title: result.title,
    url: result.url,
    content: result.content,
  }));
}

async function evaluateWithGemini(scenario, selectedIndex, sources) {
  if (!isConfiguredKey(GEMINI_API_KEY) || !sources?.length) return null;
  const prompt = `너는 과학기술 소재 평가 전문가다. 아래 자료만 근거로 미래도시 소재 3개를 평가하라.
상황: ${scenario.title}
평가 기준: ${scenario.criteria.join(", ")}
소재: ${scenario.materials.map((item, index) => `${index + 1}. ${item.name} - ${item.fact}`).join(" | ")}
검색 자료: ${sources.map((source) => `${source.title}: ${source.content}`).join("\n")}

반드시 아래 JSON만 출력하라. 마크다운 코드블록을 사용하지 마라.
{"ranking":[{"name":"소재명","points":30},{"name":"소재명","points":20},{"name":"소재명","points":10}],"reason":"선택과 순위의 근거를 한국어로 설명"}`;
  const response = await fetch(`${GEMINI_ENDPOINT}?key=${GEMINI_API_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
  });
  if (!response.ok) throw new Error(`Gemini HTTP ${response.status}`);
  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Gemini response is empty");
  const parsed = JSON.parse(text.replace(/^```json\s*|\s*```$/g, "").trim());
  const ranking = parsed.ranking.filter((item) => scenario.materials.some((material) => material.name === item.name)).slice(0, 3);
  if (ranking.length !== 3) throw new Error("Gemini ranking is incomplete");
  return { score: ranking.find((item) => item.name === scenario.materials[selectedIndex].name)?.points || 10, ranking, reason: parsed.reason, sources: sources.map(({ title, url }) => ({ title, url })) };
}

function handleApi(request, response) {
  if (request.method !== "POST" || new URL(request.url, `http://${HOST}:${PORT}`).pathname !== "/api/evaluate") return false;
  let body = "";
  request.on("data", (chunk) => { body += chunk; });
  request.on("end", async () => {
    try {
      const payload = JSON.parse(body);
      if (!payload.scenario || !Array.isArray(payload.scenario.materials)) throw new Error("Invalid payload");
      const credentialsConfigured = isConfiguredKey(TAVILY_API_KEY) && isConfiguredKey(GEMINI_API_KEY);
      let evaluation = createDemoEvaluation(payload.scenario, payload.selectedIndex);
      let mode = "demo";
      if (credentialsConfigured) {
        try {
          const sources = await searchWithTavily(payload.scenario);
          const aiEvaluation = await evaluateWithGemini(payload.scenario, payload.selectedIndex, sources);
          if (aiEvaluation) {
            evaluation = aiEvaluation;
            mode = "live-api";
          }
        } catch (apiError) {
          console.error("API evaluation failed; using demo mode:", apiError.message);
        }
      }
      sendResponse(response, 200, "application/json; charset=utf-8", JSON.stringify({ ...evaluation, apiReady: mode === "live-api", credentialsConfigured, mode }));
    } catch (error) {
      sendResponse(response, 400, "application/json; charset=utf-8", JSON.stringify({ error: "평가 요청 형식이 올바르지 않습니다." }));
    }
  });
  return true;
}

const server = http.createServer((request, response) => {
  if (handleApi(request, response)) return;
  const filePath = getSafeFilePath(request.url);

  if (!filePath) {
    sendResponse(response, 403, "text/plain; charset=utf-8", "403 Forbidden");
    return;
  }

  fs.stat(filePath, (statError, stats) => {
    if (statError || !stats.isFile()) {
      sendResponse(
        response,
        404,
        "text/plain; charset=utf-8",
        "404 Not Found"
      );
      return;
    }

    const extension = path.extname(filePath).toLowerCase();
    const contentType =
      MIME_TYPES[extension] || "application/octet-stream";

    fs.readFile(filePath, (readError, content) => {
      if (readError) {
        sendResponse(
          response,
          500,
          "text/plain; charset=utf-8",
          "500 Internal Server Error"
        );
        return;
      }

      sendResponse(response, 200, contentType, content);
    });
  });
});

server.listen(PORT, HOST, () => {
  console.log("");
  console.log("==============================================");
  console.log(" AI.SW 부천연합해커톤 프로젝트 서버");
  console.log(` http://localhost:${PORT}`);
  console.log("==============================================");
  console.log("");
});
