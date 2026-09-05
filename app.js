"use strict";

/*
 * AI.SW 부천연합해커톤 오후 프로젝트 스타터
 *
 * 이 파일의 예시 기능은 실행 환경 확인용입니다.
 * 프로젝트 기획이 승인되면 팀의 핵심 기능으로 교체하세요.
 *
 * 작업 원칙:
 * 1. 한 번에 기능 하나만 구현합니다.
 * 2. AI가 수정한 내용을 두 팀원이 함께 확인합니다.
 * 3. 실행하고 테스트한 뒤 커밋합니다.
 * 4. 개인정보나 API 키를 코드에 입력하지 않습니다.
 */

const submitButton = document.querySelector("#submit-button");
const resetButton = document.querySelector("#reset-button");
const scenarioPanel = document.querySelector("#scenario-panel");
const resultBox = document.querySelector("#result");
const scoreElement = document.querySelector("#score");
const missionNumber = document.querySelector("#mission-number");
const progressBar = document.querySelector("#progress-bar");
const apiMode = document.querySelector("#api-mode");

const scenarios = [
  { id: "architecture", number: "01", title: "극한 환경에 견디는 건축", description: "2050년, 폭염·집중호우·강풍이 반복됩니다. 무너지지 않고 오래 사용할 미래 건물의 소재를 선택하세요.", criteria: ["강도", "내구성", "내열성", "내수성", "환경 영향"], materials: [{ name: "초고성능 콘크리트", tag: "UHPC", fact: "높은 압축강도와 낮은 투수성으로 구조체 수명을 늘리는 시멘트계 소재", advantages: "압축강도와 내수성이 높고 혹독한 환경에서 안정적입니다.", limits: "시멘트 생산 과정의 탄소배출과 높은 재료비가 한계입니다." }, { name: "탄소섬유 복합재", tag: "CFRP", fact: "섬유와 수지를 결합해 높은 인장강도와 내식성을 확보한 소재", advantages: "가볍고 인장강도와 내식성이 뛰어나 보강재로 유리합니다.", limits: "가격이 높고 재활용 및 화재 후 성능 관리가 어렵습니다." }, { name: "교차적층 목재", tag: "CLT", fact: "목재를 직교 방향으로 적층해 큰 패널을 만드는 구조용 소재", advantages: "가볍고 시공이 빠르며 탄소를 저장할 수 있습니다.", limits: "습기·화재 관리가 중요하고 초고층·침수 환경에는 추가 설계가 필요합니다." }] },
  { id: "mobility", number: "02", title: "가볍지만 강한 미래 모빌리티", description: "2050년, 전기자동차와 전기항공기의 배터리 무게가 이동거리를 제한합니다. 안전성을 유지하며 차체를 가볍게 할 소재를 선택하세요.", criteria: ["밀도", "강도", "비강도", "내구성", "재활용성"], materials: [{ name: "알루미늄 합금", tag: "ALLOY", fact: "철보다 밀도가 낮고 가공성과 재활용성이 좋은 구조용 금속", advantages: "가볍고 부식에 강하며 대량 생산과 재활용 체계가 잘 갖춰져 있습니다.", limits: "탄소섬유보다 비강도가 낮고 충돌 시 변형 설계가 필요합니다." }, { name: "탄소섬유 복합재", tag: "CFRP", fact: "밀도 대비 강도가 매우 높아 항공기와 고성능 모빌리티에 쓰이는 소재", advantages: "매우 높은 비강도로 차체 무게를 크게 줄일 수 있습니다.", limits: "제조비와 수리비가 높고 복합재 재활용이 어렵습니다." }, { name: "마그네슘 합금", tag: "MG ALLOY", fact: "구조용 금속 중 밀도가 매우 낮아 경량 부품에 쓰이는 소재", advantages: "알루미늄보다 더 가벼워 배터리 효율 개선에 도움이 됩니다.", limits: "부식·충격·열 관리가 까다롭고 적용 부위가 제한적입니다." }] },
  { id: "energy", number: "03", title: "폭증하는 전력 수요를 버티는 에너지", description: "2050년, AI 데이터센터와 전기차로 수요가 공급을 넘어섭니다. 재생에너지를 안정적으로 저장·공급할 소재를 선택하세요.", criteria: ["에너지 밀도", "안정성", "수명", "충·방전", "자원·환경"], materials: [{ name: "리튬인산철", tag: "LFP", fact: "열적 안정성과 긴 수명을 갖춘 리튬이온 배터리 양극재", advantages: "열폭주 위험이 비교적 낮고 수명이 길어 대규모 저장에 적합합니다.", limits: "니켈계 배터리보다 에너지 밀도가 낮고 리튬 자원이 필요합니다." }, { name: "전고체 전해질", tag: "SOLID STATE", fact: "액체 전해질을 고체로 바꿔 안전성과 에너지 밀도를 높이는 기술", advantages: "누액과 가연성 위험을 줄이고 높은 에너지 밀도를 기대할 수 있습니다.", limits: "대량 생산과 계면 저항, 수명 검증이 아직 과제입니다." }, { name: "나트륨 이온", tag: "NA-ION", fact: "지구에 풍부한 나트륨을 이용하는 저비용 배터리 기술", advantages: "원료 확보가 쉽고 저온 성능과 가격 경쟁력이 기대됩니다.", limits: "현재 에너지 밀도가 낮아 부피가 커질 수 있습니다." }] }
];

let currentScenario = 0;
let selectedMaterial = null;
let totalScore = 0;
let awaitingNextScenario = false;
let awaitingFinalResults = false;
let missionResults = [];

function renderScenario() {
  const scenario = scenarios[currentScenario];
  selectedMaterial = null;
  awaitingNextScenario = false;
  awaitingFinalResults = false;
  missionNumber.textContent = scenario.number;
  progressBar.style.width = `${((currentScenario + 1) / scenarios.length) * 100}%`;
  submitButton.disabled = true;
  resultBox.className = "result-box";
  resultBox.innerHTML = `<span class="result-kicker">SELECT ONE MATERIAL</span><p>객관적인 특징만 보고 가장 적합하다고 생각하는 소재를 고르세요.</p>`;
  scenarioPanel.innerHTML = `<div class="scenario-copy"><span class="scenario-index">${scenario.number}</span><div><h3>${scenario.title}</h3><p>${scenario.description}</p><div class="criteria">${scenario.criteria.map((item) => `<span>${item}</span>`).join("")}</div></div></div><div class="material-grid">${scenario.materials.map((material, index) => `<button class="material-card" data-index="${index}" type="button"><span class="material-number">0${index + 1}</span><span class="material-tag">${material.tag}</span><strong>${material.name}</strong><span class="material-fact">${material.fact}</span><span class="pick-mark">○</span></button>`).join("")}</div>`;
  scenarioPanel.querySelectorAll(".material-card").forEach((card) => card.addEventListener("click", selectMaterial));
}

function selectMaterial(event) {
  scenarioPanel.querySelectorAll(".material-card").forEach((card) => card.classList.remove("is-selected"));
  const card = event.currentTarget;
  card.classList.add("is-selected");
  card.querySelector(".pick-mark").textContent = "●";
  selectedMaterial = Number(card.dataset.index);
  submitButton.disabled = false;
}

async function submitChoice() {
  if (selectedMaterial === null) return;
  submitButton.disabled = true;
  submitButton.innerHTML = "AI가 자료를 분석 중...";
  resultBox.innerHTML = `<span class="result-kicker">SEARCHING SCIENCE SOURCES</span><p>Tavily 검색과 Gemini 분석을 준비하고 있습니다.</p>`;
  try {
    const response = await fetch("/api/evaluate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ scenario: scenarios[currentScenario], selectedIndex: selectedMaterial }) });
    const evaluation = await response.json();
    if (evaluation.apiReady) apiMode.textContent = "Tavily 검색 + Gemini 평가 API 연결됨";
    if (evaluation.credentialsConfigured) apiMode.textContent = "API 키 확인됨 · 실제 호출 함수 연결 대기 중 · 현재 데모 모드";
    totalScore += evaluation.score;
    scoreElement.textContent = String(totalScore).padStart(2, "0");
    missionResults.push({
      number: scenarios[currentScenario].number,
      title: scenarios[currentScenario].title,
      selected: scenarios[currentScenario].materials[selectedMaterial].name,
      score: evaluation.score,
      winner: evaluation.ranking[0].name,
      reason: evaluation.reason,
    });
    showEvaluation(evaluation);
  } catch (error) {
    apiMode.textContent = "API 서버 연결 실패 · 데모 결과를 확인할 수 없습니다";
    resultBox.innerHTML = `<span class="result-kicker">CONNECTION ERROR</span><p>분석 서버에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.</p>`;
    submitButton.disabled = false;
  }
}

function showEvaluation(evaluation) {
  resultBox.className = "result-box evaluation-result";
  const scenario = scenarios[currentScenario];
  resultBox.innerHTML = `<div class="evaluation-head"><span class="result-kicker">AI EVALUATION COMPLETE</span><strong>+${evaluation.score} PT</strong></div><p>${evaluation.reason}</p><div class="ranking">${evaluation.ranking.map((item, index) => { const material = scenario.materials.find((candidate) => candidate.name === item.name); return `<div class="rank-row"><b>${index + 1}위</b><span><strong>${item.name}</strong><small>장점: ${material.advantages}<br />한계: ${material.limits}</small></span><strong>${item.points}점</strong></div>`; }).join("")}</div><div class="sources"><span>SCIENCE SOURCES</span>${evaluation.sources.map((source) => `<a href="${source.url}" target="_blank" rel="noreferrer">${source.title} ↗</a>`).join("")}</div><p class="ai-warning">⚠️ AI 판단 주의: 검색된 자료의 범위와 분석 기준에 따라 결과가 달라질 수 있습니다. 실제 소재 선정에는 추가 실험과 전문가 검토가 필요합니다.</p>`;
  if (currentScenario < scenarios.length - 1) {
    currentScenario += 1;
    submitButton.innerHTML = "다음 상황으로 →";
    submitButton.disabled = false;
    awaitingNextScenario = true;
  } else {
    submitButton.innerHTML = "결과 보기 →";
    submitButton.disabled = false;
    awaitingFinalResults = true;
  }
}

function renderCompletion() {
  const completed = totalScore >= 70;
  scenarioPanel.innerHTML = `<div class="completion-panel ${completed ? "is-complete" : "is-incomplete"}"><span class="result-kicker">FINAL CITY STATUS</span><div class="completion-score">${String(totalScore).padStart(2, "0")} <small>/ 90 PT</small></div><h3>${completed ? "미래도시 복구 완료" : "도시 복구 보류"}</h3><p>${completed ? "세 가지 위기를 소재 선택으로 해결했습니다. 당신의 판단이 AI 분석 기준을 통과했습니다." : "복구 기준 70점에 도달하지 못했습니다. 소재의 특징을 다시 비교하고 재도전하세요."}</p><div class="completion-rule"><span>복구 기준</span><strong>70점 이상</strong><span>획득 점수</span><strong>${totalScore}점</strong></div></div>`;
  resultBox.className = "result-box completion-results";
  resultBox.innerHTML = `<span class="result-kicker">THREE MISSION REPORT</span><div class="mission-report">${missionResults.map((mission) => `<article><b>${mission.number}</b><div><strong>${mission.title}</strong><p>내 선택: ${mission.selected} · AI 1위: ${mission.winner} · ${mission.score}점</p><small>${mission.reason}</small></div></article>`).join("")}</div><p class="ai-warning">⚠️ AI 판단 주의: 검색된 자료의 범위와 분석 기준에 따라 결과가 달라질 수 있습니다. 실제 소재 선정에는 추가 실험과 전문가 검토가 필요합니다.</p>`;
}

function resetGame() {
  currentScenario = 0;
  totalScore = 0;
  awaitingNextScenario = false;
  awaitingFinalResults = false;
  missionResults = [];
  scoreElement.textContent = "00";
  submitButton.innerHTML = "소재 선택하기 <span>→</span>";
  renderScenario();
}

submitButton.addEventListener("click", () => {
  if (awaitingFinalResults) {
    awaitingFinalResults = false;
    submitButton.disabled = true;
    renderCompletion();
    return;
  }
  if (awaitingNextScenario) {
    renderScenario();
    return;
  }
  submitChoice();
});
resetButton.addEventListener("click", resetGame);
renderScenario();
