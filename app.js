// 루틴보드 — Supabase 연동 공통 로직
// index.html, board.html에서 함께 사용합니다.

const supabaseClient = window.supabase.createClient(
  window.SUPABASE_URL,
  window.SUPABASE_ANON_KEY
);

function genShareCode(len = 6) {
  const chars = "abcdefghijkmnpqrstuvwxyz23456789"; // 헷갈리는 글자(0,o,1,l) 제외
  let out = "";
  const arr = new Uint32Array(len);
  crypto.getRandomValues(arr);
  for (let i = 0; i < len; i++) out += chars[arr[i] % chars.length];
  return out;
}

async function createRoutine(title) {
  const share_code = genShareCode();
  const { data, error } = await supabaseClient
    .from("rb_routines")
    .insert({ title, share_code })
    .select()
    .single();
  if (error) throw error;
  return data;
}

async function loadRoutineByCode(code) {
  const { data, error } = await supabaseClient
    .from("rb_routines")
    .select("*")
    .eq("share_code", code)
    .single();
  if (error) throw error;
  return data;
}

/* ---------------- 상태보고서 ---------------- */

async function loadReports(routineId) {
  const { data, error } = await supabaseClient
    .from("rb_reports")
    .select("*")
    .eq("routine_id", routineId)
    .order("report_date", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

async function addReport(routineId, { report_date, health, progress_summary, risks_issues, next_week_plan }) {
  const { data, error } = await supabaseClient
    .from("rb_reports")
    .insert({
      routine_id: routineId,
      report_date: report_date || new Date().toISOString().slice(0, 10),
      health: health || "good",
      progress_summary: progress_summary || null,
      risks_issues: risks_issues || null,
      next_week_plan: next_week_plan || null,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

async function deleteReport(id) {
  const { error } = await supabaseClient.from("rb_reports").delete().eq("id", id);
  if (error) throw error;
}

function healthLabel(health) {
  return { good: "정상", warning: "주의", risk: "위험" }[health] || health;
}

/* ---------------- 워크로드 ---------------- */

async function loadTasks(routineId) {
  const { data, error } = await supabaseClient
    .from("rb_tasks")
    .select("*")
    .eq("routine_id", routineId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data;
}

async function addTask(routineId, { title, owner_name, due_date, memo }) {
  const { data, error } = await supabaseClient
    .from("rb_tasks")
    .insert({
      routine_id: routineId,
      title,
      owner_name,
      due_date: due_date || null,
      memo: memo || null,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

async function updateTaskStatus(id, status) {
  const { error } = await supabaseClient.from("rb_tasks").update({ status }).eq("id", id);
  if (error) throw error;
}

async function deleteTask(id) {
  const { error } = await supabaseClient.from("rb_tasks").delete().eq("id", id);
  if (error) throw error;
}

function taskStatusLabel(status) {
  return { todo: "할일", doing: "진행중", done: "완료" }[status] || status;
}
function nextTaskStatus(status) {
  return { todo: "doing", doing: "done", done: "todo" }[status] || "todo";
}

function groupByOwner(tasks) {
  const map = new Map();
  tasks.forEach((t) => {
    if (!map.has(t.owner_name)) {
      map.set(t.owner_name, { owner_name: t.owner_name, tasks: [], activeCount: 0 });
    }
    const group = map.get(t.owner_name);
    group.tasks.push(t);
    if (t.status !== "done") group.activeCount += 1;
  });
  return Array.from(map.values()).sort((a, b) => b.activeCount - a.activeCount);
}

/* ---------------- 리스크매트릭스 ---------------- */

async function loadRisks(routineId) {
  const { data, error } = await supabaseClient
    .from("rb_risks")
    .select("*")
    .eq("routine_id", routineId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  const rows = data || [];
  rows.sort((a, b) => riskScore(b.probability, b.impact) - riskScore(a.probability, a.impact));
  return rows;
}

async function addRisk(routineId, { title, probability, impact, owner, mitigation_plan }) {
  const { data, error } = await supabaseClient
    .from("rb_risks")
    .insert({
      routine_id: routineId,
      title,
      probability: probability || "medium",
      impact: impact || "medium",
      owner: owner || null,
      mitigation_plan: mitigation_plan || null,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

async function updateRiskStatus(id, status) {
  const { error } = await supabaseClient.from("rb_risks").update({ status }).eq("id", id);
  if (error) throw error;
}

async function deleteRisk(id) {
  const { error } = await supabaseClient.from("rb_risks").delete().eq("id", id);
  if (error) throw error;
}

function riskStatusLabel(status) {
  return { open: "미대응", mitigating: "대응중", closed: "종결" }[status] || status;
}
function nextRiskStatus(status) {
  return { open: "mitigating", mitigating: "closed", closed: "open" }[status] || "open";
}
function probabilityLabel(p) {
  return { low: "낮음", medium: "보통", high: "높음" }[p] || p;
}
function impactLabel(i) {
  return { low: "낮음", medium: "보통", high: "높음" }[i] || i;
}

function riskScore(probability, impact) {
  const w = { low: 1, medium: 2, high: 3 };
  return (w[probability] || 1) * (w[impact] || 1);
}

function riskLevel(probability, impact) {
  const score = riskScore(probability, impact);
  if (score <= 2) return "낮음";
  if (score <= 4) return "보통";
  if (score <= 6) return "높음";
  return "매우높음";
}

function riskLevelClass(probability, impact) {
  const level = riskLevel(probability, impact);
  return { "낮음": "risklevel-low", "보통": "risklevel-medium", "높음": "risklevel-high", "매우높음": "risklevel-veryhigh" }[level];
}

/* ---------------- 회고 ---------------- */

async function loadRetroItems(routineId) {
  const { data, error } = await supabaseClient
    .from("rb_retro_items")
    .select("*")
    .eq("routine_id", routineId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data;
}

async function addRetroItem(routineId, { category, content, author_name }) {
  const { data, error } = await supabaseClient
    .from("rb_retro_items")
    .insert({
      routine_id: routineId,
      category,
      content,
      author_name: author_name && author_name.trim() ? author_name.trim() : "익명",
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

async function deleteRetroItem(id) {
  const { error } = await supabaseClient.from("rb_retro_items").delete().eq("id", id);
  if (error) throw error;
}

function itemsByCategory(items, category) {
  return items.filter((i) => i.category === category);
}

function categoryLabel(category) {
  return { good: "잘한 점", improve: "아쉬운 점", action: "다음 액션" }[category] || category;
}

/* ---------------- 내보내기 / 유틸 ---------------- */

function exportMarkdown(routine, reports, tasks, risks, retroItems) {
  const lines = [`# ${routine.title} — 루틴 현황`, ""];

  lines.push("## 상태보고서");
  if (reports.length === 0) lines.push("- (없음)");
  reports.forEach((r) => {
    lines.push(`### ${r.report_date} (${healthLabel(r.health)})`);
    lines.push("");
    lines.push("**이번 주 진행 요약**");
    lines.push(r.progress_summary ? r.progress_summary : "-");
    lines.push("");
    lines.push("**이슈·리스크**");
    lines.push(r.risks_issues ? r.risks_issues : "-");
    lines.push("");
    lines.push("**다음 주 계획**");
    lines.push(r.next_week_plan ? r.next_week_plan : "-");
    lines.push("");
  });

  lines.push("## 워크로드");
  const groups = groupByOwner(tasks);
  if (groups.length === 0) lines.push("- (없음)");
  groups.forEach((g) => {
    lines.push(`### ${g.owner_name} (진행중 ${g.activeCount}건)`);
    g.tasks.forEach((t) => {
      const checked = t.status === "done" ? "x" : " ";
      const due = t.due_date ? ` (마감: ${t.due_date})` : "";
      const memo = t.memo ? ` — ${t.memo}` : "";
      lines.push(`- [${checked}] ${t.title} [${taskStatusLabel(t.status)}]${due}${memo}`);
    });
    lines.push("");
  });

  lines.push("## 리스크매트릭스");
  const sortedRisks = [...risks].sort((a, b) => riskScore(b.probability, b.impact) - riskScore(a.probability, a.impact));
  if (sortedRisks.length === 0) lines.push("- (없음)");
  sortedRisks.forEach((r) => {
    const owner = r.owner ? ` — 담당: ${r.owner}` : "";
    const plan = r.mitigation_plan ? ` / 대응 계획: ${r.mitigation_plan}` : "";
    lines.push(`- [${riskLevel(r.probability, r.impact)}] ${r.title} (확률: ${probabilityLabel(r.probability)} · 영향: ${impactLabel(r.impact)})${owner} (${riskStatusLabel(r.status)})${plan}`);
  });
  lines.push("");

  lines.push("## 회고");
  const sections = [
    { category: "good", heading: "### 👍 잘한 점" },
    { category: "improve", heading: "### 🤔 아쉬운 점" },
    { category: "action", heading: "### ➡ 다음 액션" },
  ];
  sections.forEach(({ category, heading }) => {
    lines.push(heading);
    const list = itemsByCategory(retroItems, category);
    if (list.length === 0) {
      lines.push("- (없음)");
    } else {
      list.forEach((i) => {
        lines.push(`- (${i.author_name}) ${i.content}`);
      });
    }
    lines.push("");
  });

  return lines.join("\n");
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (e) {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    try {
      document.execCommand("copy");
      document.body.removeChild(ta);
      return true;
    } catch (e2) {
      document.body.removeChild(ta);
      return false;
    }
  }
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

// 최근 만든 루틴보드 (이 브라우저에서만 기억됨 — 로그인/서버 없이 localStorage만 사용)
const RECENT_BOARDS_KEY = "rb_recent_boards";
const RECENT_BOARDS_MAX = 10;

function getRecentBoards() {
  try {
    const raw = localStorage.getItem(RECENT_BOARDS_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch (e) {
    return [];
  }
}

function saveRecentBoard(title, share_code) {
  try {
    let list = getRecentBoards().filter((b) => b.share_code !== share_code);
    list.unshift({ title, share_code, created_at: Date.now() });
    list = list.slice(0, RECENT_BOARDS_MAX);
    localStorage.setItem(RECENT_BOARDS_KEY, JSON.stringify(list));
  } catch (e) {
    // localStorage를 못 쓰는 환경(시크릿 모드 등)이면 조용히 무시
  }
}

function removeRecentBoard(share_code) {
  try {
    const list = getRecentBoards().filter((b) => b.share_code !== share_code);
    localStorage.setItem(RECENT_BOARDS_KEY, JSON.stringify(list));
  } catch (e) {
    // localStorage를 못 쓰는 환경이면 조용히 무시
  }
}

function clearRecentBoards() {
  try {
    localStorage.removeItem(RECENT_BOARDS_KEY);
  } catch (e) {
    // localStorage를 못 쓰는 환경이면 조용히 무시
  }
}

function handleRemoveRecentBoard(share_code, containerId, cardId) {
  removeRecentBoard(share_code);
  renderRecentBoards(containerId, cardId);
}

function handleClearRecentBoards(containerId, cardId) {
  clearRecentBoards();
  renderRecentBoards(containerId, cardId);
}

function renderRecentBoards(containerId, cardId) {
  const list = getRecentBoards();
  const card = document.getElementById(cardId);
  const container = document.getElementById(containerId);
  if (!card || !container) return;
  if (list.length === 0) {
    card.style.display = "none";
    container.innerHTML = "";
    return;
  }
  const rows = list
    .map((b) => {
      const d = new Date(b.created_at);
      const dateStr = `${d.getMonth() + 1}/${d.getDate()}`;
      const code = encodeURIComponent(b.share_code);
      return `<div style="display:flex; justify-content:space-between; align-items:center; gap:10px; padding:10px 0; border-bottom:1px solid var(--line);">
        <a href="board.html?r=${code}" style="font-size:0.92rem;">${escapeHtml(b.title)}</a>
        <span style="display:flex; align-items:center; gap:8px;">
          <span class="item-meta">${dateStr}</span>
          <button type="button" class="btn danger-text" style="padding:2px 6px;" onclick="handleRemoveRecentBoard('${b.share_code}', '${containerId}', '${cardId}')">목록에서 지우기</button>
        </span>
      </div>`;
    })
    .join("");
  const clearRow = `<div style="text-align:right; padding-top:8px;">
    <button type="button" class="btn ghost" onclick="handleClearRecentBoards('${containerId}', '${cardId}')">목록 모두 지우기</button>
  </div>`;
  container.innerHTML = rows + clearRow;
  card.style.display = "block";
}
