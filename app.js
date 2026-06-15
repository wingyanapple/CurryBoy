/* ============================================================
   CurryBoy 營業小助理 — app.js
   ============================================================ */

/* ====== 1. 設定（部署前填呢兩個值）====== */
const SUPABASE_URL = "YOUR_SUPABASE_URL";          // 例：https://abcd1234.supabase.co
const SUPABASE_KEY = "YOUR_SUPABASE_PUBLISHABLE_KEY"; // sb_publishable_xxx 或 anon key

const CONFIGURED =
  !SUPABASE_URL.includes("YOUR_") && !SUPABASE_KEY.includes("YOUR_");
const db = CONFIGURED ? supabase.createClient(SUPABASE_URL, SUPABASE_KEY) : null;

/* ====== 2. 常數 ====== */
const EXPENSE_CATS = ["食材", "包材", "人工", "租金", "水電煤", "平台費用", "維修", "雜項"];
const TODO_CATS = ["重要", "次重要", "有空才處理"];
const TAB_VIEWS = ["home", "todos", "ideas", "shopping", "brain"];

/* ====== 3. 細工具 ====== */
const $ = (id) => document.getElementById(id);
const view = $("view");

const esc = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
  );

const money = (n) => {
  const v = Number(n) || 0;
  const s = v.toLocaleString("en-HK", {
    minimumFractionDigits: v % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  });
  return s;
};

const pad = (n) => String(n).padStart(2, "0");
function todayStr(d = new Date()) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function monthStartStr(d = new Date()) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-01`;
}
const WD = ["日", "一", "二", "三", "四", "五", "六"];
function fmtDate(str) {
  const [y, m, dd] = str.split("-").map(Number);
  const dt = new Date(y, m - 1, dd);
  return `${m}月${dd}日 週${WD[dt.getDay()]}`;
}

let toastTimer;
function toast(msg, isErr = false) {
  const t = $("toast");
  t.textContent = msg;
  t.className = "toast show" + (isErr ? " err" : "");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (t.className = "toast"), 2200);
}

function setupNotice() {
  if (CONFIGURED) return "";
  return `<div class="setup">⚙️ <b>未連接 Supabase</b><br>
    請打開 <b>app.js</b>，將最上面嘅 <b>SUPABASE_URL</b> 同 <b>SUPABASE_KEY</b>
    填上你嘅資料，再重新上載。詳情見 README。</div>`;
}

/* ====== 4. Supabase 資料層 ====== */
async function q(promise, label) {
  const { data, error } = await promise;
  if (error) {
    console.error(label, error);
    toast("出錯：" + (error.message || label), true);
    throw error;
  }
  return data;
}

const api = {
  todayRevenue: (date) =>
    q(db.from("daily_revenue").select("*").eq("date", date).maybeSingle(), "today"),
  monthRevenue: (start) =>
    q(db.from("daily_revenue").select("*").gte("date", start).order("date", { ascending: false }), "monthRev"),
  upsertRevenue: (rec) =>
    q(db.from("daily_revenue").upsert(rec, { onConflict: "date" }).select(), "upsertRev"),

  monthExpenses: (start) =>
    q(db.from("expenses").select("*").gte("date", start).order("date", { ascending: false }).order("created_at", { ascending: false }), "monthExp"),
  addExpense: (rec) => q(db.from("expenses").insert(rec).select(), "addExp"),
  delExpense: (id) => q(db.from("expenses").delete().eq("id", id), "delExp"),

  todos: () => q(db.from("todos").select("*").order("created_at", { ascending: false }), "todos"),
  addTodo: (rec) => q(db.from("todos").insert(rec).select(), "addTodo"),
  updTodo: (id, patch) => q(db.from("todos").update(patch).eq("id", id), "updTodo"),
  delTodo: (id) => q(db.from("todos").delete().eq("id", id), "delTodo"),

  ideas: () => q(db.from("ideas").select("*").order("created_at", { ascending: false }), "ideas"),
  addIdea: (rec) => q(db.from("ideas").insert(rec).select(), "addIdea"),
  delIdea: (id) => q(db.from("ideas").delete().eq("id", id), "delIdea"),

  shopping: () => q(db.from("shopping").select("*").order("created_at", { ascending: false }), "shop"),
  addShop: (rec) => q(db.from("shopping").insert(rec).select(), "addShop"),
  updShop: (id, patch) => q(db.from("shopping").update(patch).eq("id", id), "updShop"),
  delShop: (id) => q(db.from("shopping").delete().eq("id", id), "delShop"),
};

/* ====== 5. 狀態 ====== */
let current = "home";
const loadingHTML = `<div class="loading">載入緊…</div>`;

/* ====== 6. 各畫面 ====== */

// ---- 首頁 ----
async function renderHome() {
  view.innerHTML = setupNotice() + loadingHTML;
  if (!db) {
    view.innerHTML = setupNotice() + homeShell(0, 0, 0, []);
    return;
  }
  const start = monthStartStr();
  const today = todayStr();
  const [todayRec, monthRev, monthExp, todos] = await Promise.all([
    api.todayRevenue(today),
    api.monthRevenue(start),
    api.monthExpenses(start),
    api.todos(),
  ]);
  const todayTotal = todayRec ? Number(todayRec.total) : 0;
  const revSum = monthRev.reduce((a, r) => a + Number(r.total), 0);
  const expSum = monthExp.reduce((a, r) => a + Number(r.amount), 0);
  const important = todos
    .filter((t) => t.category === "重要" && t.status !== "已完成")
    .slice(0, 5);

  view.innerHTML =
    setupNotice() + homeShell(todayTotal, revSum, expSum, important);
}

function homeShell(todayTotal, revSum, expSum, important) {
  const bal = revSum - expSum;
  const balClass = bal >= 0 ? "profit" : "loss";
  const balLabel = bal >= 0 ? "盈利" : "虧損";

  const cards = `
    <div class="stat-grid">
      <button class="stat" data-go="today">
        <span class="label"><span class="tick"></span>本日營業額</span>
        <span class="num"><span class="cur">$</span>${money(todayTotal)}</span>
        <span class="sub">${fmtDate(todayStr())} · 按一下輸入</span>
      </button>
      <button class="stat" data-go="monthRev">
        <span class="label">本月營業額</span>
        <span class="num"><span class="cur">$</span>${money(revSum)}</span>
        <span class="sub">查看每日明細</span>
      </button>
      <button class="stat" data-go="expense">
        <span class="label">本月支出</span>
        <span class="num"><span class="cur">$</span>${money(expSum)}</span>
        <span class="sub">記錄 / 查看支出</span>
      </button>
      <button class="stat ${balClass}" data-go="balance">
        <span class="label">本月 Balance</span>
        <span class="num"><span class="cur">$</span>${money(bal)}</span>
        <span class="sub">${balLabel}</span>
      </button>
    </div>`;

  const importantHTML = important.length
    ? important
        .map(
          (t) => `<div class="todo-mini-item">
            <button class="check" data-done-todo="${t.id}"></button>
            <div class="txt">${esc(t.content)}${t.note ? `<small>${esc(t.note)}</small>` : ""}</div>
          </div>`
        )
        .join("")
    : `<div class="empty"><div class="big">未有重要待辦</div>喺「待辦事項」加入分類為「重要」嘅事項就會喺度顯示</div>`;

  const entries = `
    <div class="entry-grid">
      <button class="entry" data-tab-go="todos">
        <span class="ico"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6h11M9 12h11M9 18h11"/><path d="m4 6 1 1 2-2M4 12l1 1 2-2M4 18l1 1 2-2"/></svg></span>
        <span class="name">待辦事項</span></button>
      <button class="entry" data-tab-go="ideas">
        <span class="ico"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-4 10.5c.7.7 1 1.3 1 2.5h6c0-1.2.3-1.8 1-2.5A6 6 0 0 0 12 3Z"/></svg></span>
        <span class="name">Idea</span></button>
      <button class="entry" data-tab-go="shopping">
        <span class="ico"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M5 7h15l-1.4 9.3a2 2 0 0 1-2 1.7H8.4a2 2 0 0 1-2-1.7L5 7Z"/><path d="M9 7a3 3 0 0 1 6 0"/></svg></span>
        <span class="name">購物清單</span></button>
      <button class="entry" data-tab-go="brain">
        <span class="ico"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5a3 3 0 0 0-3 3 3 3 0 0 0-1 5.8V17a2 2 0 0 0 4 0M12 5a3 3 0 0 1 3 3 3 3 0 0 1 1 5.8V17a2 2 0 0 1-4 0"/></svg></span>
        <span class="name">清空腦袋</span></button>
    </div>`;

  return `${cards}
    <div class="section-head"><h2>重要待辦事項</h2><span class="more" data-tab-go="todos">全部 ›</span></div>
    <div class="todo-mini">${importantHTML}</div>
    <div class="section-head"><h2>功能</h2></div>
    ${entries}`;
}

// ---- 本日營業額 ----
async function renderToday() {
  view.innerHTML = setupNotice() + loadingHTML;
  if (!db) return (view.innerHTML = setupNotice() + todayForm(0, 0, 0, false));
  const rec = await api.todayRevenue(todayStr());
  view.innerHTML = todayForm(
    rec ? rec.curryboy : "",
    rec ? rec.keeta : "",
    rec ? rec.foodpanda : "",
    !!rec
  );
  ["inCurry", "inKeeta", "inPanda"].forEach((id) =>
    $(id).addEventListener("input", recalcToday)
  );
  recalcToday();
}

function todayForm(c, k, p, exists) {
  return `
    <p class="view-title">本日營業額 · ${fmtDate(todayStr())}</p>
    ${exists ? `<div class="setup" style="background:var(--surface-2);border-color:var(--line);color:var(--text-soft)">今日已有紀錄，修改後按「儲存」會自動更新。</div>` : ""}
    <div class="card">
      <div class="field"><label>CurryBoy 收入</label>
        <input id="inCurry" type="number" inputmode="decimal" min="0" step="any" placeholder="0" value="${c}" /></div>
      <div class="field"><label>Keeta 收入</label>
        <input id="inKeeta" type="number" inputmode="decimal" min="0" step="any" placeholder="0" value="${k}" /></div>
      <div class="field"><label>Foodpanda 收入</label>
        <input id="inPanda" type="number" inputmode="decimal" min="0" step="any" placeholder="0" value="${p}" /></div>
      <div class="sum-box"><span class="lbl">本日營業額</span><span class="val" id="todaySum">$0</span></div>
    </div>
    <button class="btn primary" data-save-today>儲存本日營業額</button>`;
}

function recalcToday() {
  const c = parseFloat($("inCurry").value) || 0;
  const k = parseFloat($("inKeeta").value) || 0;
  const p = parseFloat($("inPanda").value) || 0;
  $("todaySum").textContent = "$" + money(c + k + p);
}

async function saveToday(btn) {
  if (!db) return toast("未連接 Supabase", true);
  const rec = {
    date: todayStr(),
    curryboy: parseFloat($("inCurry").value) || 0,
    keeta: parseFloat($("inKeeta").value) || 0,
    foodpanda: parseFloat($("inPanda").value) || 0,
  };
  btn.disabled = true;
  try {
    await api.upsertRevenue(rec);
    toast("已儲存本日營業額");
    navigate("home");
  } finally {
    btn.disabled = false;
  }
}

// ---- 本月營業額（每日明細）----
async function renderMonthRev() {
  view.innerHTML = loadingHTML;
  if (!db) return (view.innerHTML = `<p class="view-title">本月營業額</p>${setupNotice()}`);
  const rows = await api.monthRevenue(monthStartStr());
  const sum = rows.reduce((a, r) => a + Number(r.total), 0);
  const list = rows.length
    ? rows
        .map(
          (r) => `<div class="row"><div class="body">
            <div class="title">${fmtDate(r.date)}</div>
            <div class="meta"><span>CurryBoy $${money(r.curryboy)}</span><span>Keeta $${money(r.keeta)}</span><span>Panda $${money(r.foodpanda)}</span></div>
          </div><div class="amt">$${money(r.total)}</div></div>`
        )
        .join("")
    : `<div class="empty"><div class="big">本月未有營業額紀錄</div>喺首頁「本日營業額」入面輸入</div>`;
  view.innerHTML = `
    <p class="view-title">本月營業額</p>
    <div class="stat" style="cursor:default;margin-bottom:18px">
      <span class="label">本月總營業額</span>
      <span class="num"><span class="cur">$</span>${money(sum)}</span>
      <span class="sub">${rows.length} 日有紀錄</span>
    </div>
    <div class="list">${list}</div>`;
}

// ---- 本月支出 ----
let expCat = EXPENSE_CATS[0];
async function renderExpense() {
  view.innerHTML = loadingHTML;
  if (!db) return (view.innerHTML = `<p class="view-title">本月支出</p>${setupNotice()}`);
  const rows = await api.monthExpenses(monthStartStr());
  const sum = rows.reduce((a, r) => a + Number(r.amount), 0);

  // 按日子分組
  const groups = {};
  rows.forEach((r) => ((groups[r.date] ||= []).push(r)));
  const groupHTML = Object.keys(groups).length
    ? Object.keys(groups)
        .map((date) => {
          const items = groups[date];
          const dayTotal = items.reduce((a, r) => a + Number(r.amount), 0);
          return `<div class="day-group">
            <div class="day-head"><span class="d">${fmtDate(date)}</span><span class="t">$${money(dayTotal)}</span></div>
            <div class="list">${items
              .map(
                (r) => `<div class="row"><div class="body">
                  <div class="title">${esc(r.category)}${r.note ? ` · <span style="color:var(--text-dim)">${esc(r.note)}</span>` : ""}</div>
                </div><div class="amt">$${money(r.amount)}</div>
                <button class="del" data-del-exp="${r.id}">✕</button></div>`
              )
              .join("")}</div></div>`;
        })
        .join("")
    : `<div class="empty"><div class="big">本月未有支出</div>喺下面新增第一筆</div>`;

  view.innerHTML = `
    <p class="view-title">本月支出</p>
    <div class="stat loss" style="cursor:default;margin-bottom:18px">
      <span class="label">本月支出總額</span>
      <span class="num"><span class="cur">$</span>${money(sum)}</span>
    </div>
    <div class="card">
      <div class="field"><label>類別（先揀）</label>
        <div class="seg" id="expSeg">${EXPENSE_CATS.map(
          (c) => `<button data-cat="${c}" class="${c === expCat ? "on" : ""}">${c}</button>`
        ).join("")}</div></div>
      <div class="row-2">
        <div class="field"><label>金額</label>
          <input id="expAmt" type="number" inputmode="decimal" min="0" step="any" placeholder="0" /></div>
        <div class="field"><label>日期</label>
          <input id="expDate" type="date" value="${todayStr()}" /></div>
      </div>
      <div class="field"><label>備註（可選）</label>
        <input id="expNote" type="text" placeholder="例：街市買菜" /></div>
      <button class="btn primary" data-add-exp>新增支出</button>
    </div>
    ${groupHTML}`;
}

// ---- 本月 Balance ----
async function renderBalance() {
  view.innerHTML = loadingHTML;
  if (!db) return (view.innerHTML = `<p class="view-title">本月 Balance</p>${setupNotice()}`);
  const start = monthStartStr();
  const [rev, exp] = await Promise.all([api.monthRevenue(start), api.monthExpenses(start)]);
  const revSum = rev.reduce((a, r) => a + Number(r.total), 0);
  const expSum = exp.reduce((a, r) => a + Number(r.amount), 0);
  const bal = revSum - expSum;
  const cls = bal >= 0 ? "profit" : "loss";
  const label = bal >= 0 ? "盈利" : "虧損";
  view.innerHTML = `
    <p class="view-title">本月 Balance</p>
    <div class="stat ${cls}" style="cursor:default;margin-bottom:18px;align-items:center;text-align:center">
      <span class="label" style="justify-content:center;width:100%">本月 ${label}</span>
      <span class="num" style="font-size:38px"><span class="cur">$</span>${money(bal)}</span>
    </div>
    <div class="card">
      <div class="sum-box" style="border:none;margin:0;padding:0 0 12px">
        <span class="lbl">本月營業額</span><span class="val" style="color:var(--text);font-size:18px">$${money(revSum)}</span></div>
      <div class="sum-box" style="margin:0;padding:12px 0">
        <span class="lbl">本月支出</span><span class="val" style="color:var(--loss);font-size:18px">− $${money(expSum)}</span></div>
      <div class="sum-box" style="padding-top:14px">
        <span class="lbl">Balance</span><span class="val ${cls === "profit" ? "" : ""}" style="color:${bal >= 0 ? "var(--profit)" : "var(--loss)"}">$${money(bal)}</span></div>
    </div>`;
}

// ---- 待辦事項 ----
let todoCat = "次重要";
async function renderTodos() {
  view.innerHTML = loadingHTML;
  if (!db) return (view.innerHTML = `<p class="view-title">待辦事項</p>${setupNotice()}`);
  const rows = await api.todos();
  const open = rows.filter((t) => t.status !== "已完成");
  const done = rows.filter((t) => t.status === "已完成");

  const li = (t) => `<div class="row">
      <button class="check ${t.status === "已完成" ? "done" : ""}" data-toggle-todo="${t.id}" data-st="${t.status}">${t.status === "已完成" ? "✓" : ""}</button>
      <div class="body">
        <div class="title ${t.status === "已完成" ? "done" : ""}">${esc(t.content)}</div>
        <div class="meta"><span class="tag ${t.category === "重要" ? "hi" : ""}">${esc(t.category)}</span>${t.note ? `<span>${esc(t.note)}</span>` : ""}</div>
      </div>
      <button class="del" data-del-todo="${t.id}">✕</button></div>`;

  view.innerHTML = `
    <p class="view-title">待辦事項</p>
    <div class="card">
      <div class="field"><label>類別</label>
        <div class="seg" id="todoSeg">${TODO_CATS.map(
          (c) => `<button data-cat="${c}" class="${c === todoCat ? "on" : ""}">${c}</button>`
        ).join("")}</div></div>
      <div class="field"><label>事項內容</label>
        <input id="todoContent" type="text" placeholder="要做啲咩？" /></div>
      <div class="field"><label>備註（可選）</label>
        <input id="todoNote" type="text" placeholder="補充說明" /></div>
      <button class="btn primary" data-add-todo>新增待辦</button>
    </div>
    ${open.length ? `<div class="list">${open.map(li).join("")}</div>` : `<div class="empty">未有待辦事項</div>`}
    ${done.length ? `<div class="section-head" style="margin-top:20px"><h2 style="font-size:14px;color:var(--text-soft)">已完成（${done.length}）</h2></div><div class="list">${done.map(li).join("")}</div>` : ""}`;
}

// ---- Idea ----
async function renderIdeas() {
  view.innerHTML = loadingHTML;
  if (!db) return (view.innerHTML = `<p class="view-title">Idea</p>${setupNotice()}`);
  const rows = await api.ideas();
  const list = rows.length
    ? rows
        .map(
          (i) => `<div class="row"><div class="body">
            <div class="title">${esc(i.content)}</div>
            <div class="meta">${i.category ? `<span class="tag">${esc(i.category)}</span>` : ""}${i.note ? `<span>${esc(i.note)}</span>` : ""}<span>${(i.created_at || "").slice(0, 10)}</span></div>
          </div><button class="del" data-del-idea="${i.id}">✕</button></div>`
        )
        .join("")
    : `<div class="empty">未有 idea，諗到就記低</div>`;
  view.innerHTML = `
    <p class="view-title">Idea</p>
    <div class="card">
      <div class="field"><label>類別（可自由輸入）</label>
        <input id="ideaCat" type="text" list="ideaCats" placeholder="例：菜單 / 推廣 / 裝修" />
        <datalist id="ideaCats"><option>菜單</option><option>推廣</option><option>裝修</option><option>服務</option><option>其他</option></datalist></div>
      <div class="field"><label>Idea 內容</label>
        <textarea id="ideaContent" placeholder="諗到啲咩？"></textarea></div>
      <div class="field"><label>備註（可選）</label>
        <input id="ideaNote" type="text" placeholder="補充" /></div>
      <button class="btn primary" data-add-idea>新增 Idea</button>
    </div>
    <div class="list">${list}</div>`;
}

// ---- 購物清單 ----
async function renderShopping() {
  view.innerHTML = loadingHTML;
  if (!db) return (view.innerHTML = `<p class="view-title">購物清單</p>${setupNotice()}`);
  const rows = await api.shopping();
  const todo = rows.filter((s) => s.status !== "已買");
  const bought = rows.filter((s) => s.status === "已買");

  const li = (s) => `<div class="row">
      <button class="check ${s.status === "已買" ? "done" : ""}" data-toggle-shop="${s.id}" data-st="${s.status}">${s.status === "已買" ? "✓" : ""}</button>
      <div class="body">
        <div class="title ${s.status === "已買" ? "done" : ""}">${esc(s.name)}${s.quantity ? ` <span style="color:var(--text-dim)">×${esc(s.quantity)}</span>` : ""}</div>
        <div class="meta">${s.category ? `<span class="tag">${esc(s.category)}</span>` : ""}${s.note ? `<span>${esc(s.note)}</span>` : ""}</div>
      </div>
      <button class="del" data-del-shop="${s.id}">✕</button></div>`;

  view.innerHTML = `
    <p class="view-title">購物清單</p>
    <div class="card">
      <div class="row-2">
        <div class="field"><label>物品名稱</label><input id="shopName" type="text" placeholder="例：咖喱粉" /></div>
        <div class="field"><label>數量</label><input id="shopQty" type="text" inputmode="text" placeholder="例：2 包" /></div>
      </div>
      <div class="row-2">
        <div class="field"><label>類別（可選）</label><input id="shopCat" type="text" placeholder="例：食材" /></div>
        <div class="field"><label>備註（可選）</label><input id="shopNote" type="text" placeholder="補充" /></div>
      </div>
      <button class="btn primary" data-add-shop>加入清單</button>
    </div>
    ${todo.length ? `<div class="list">${todo.map(li).join("")}</div>` : `<div class="empty">清單空空如也</div>`}
    ${bought.length ? `<div class="section-head" style="margin-top:20px"><h2 style="font-size:14px;color:var(--text-soft)">已買（${bought.length}）</h2></div><div class="list">${bought.map(li).join("")}</div>` : ""}`;
}

// ---- 清空腦袋 ----
let brainResult = null; // [{text, type}]
function renderBrain() {
  view.innerHTML = `
    <p class="view-title">清空腦袋</p>
    <div class="card">
      <div class="field"><label>將腦入面嘅嘢一次過打晒落嚟（一句一行最好）</label>
        <textarea id="brainText" style="min-height:160px" placeholder="例：
記得跟進租約
買多兩箱咖喱磚
諗到可以出新嘅辣度
要打俾水電師傅"></textarea></div>
      <button class="btn primary" data-analyze>分析並分類</button>
    </div>
    <div id="brainOut">${setupNotice()}</div>`;
}

// 關鍵字規則分類
function classify(raw) {
  const SHOP = ["買", "補貨", "訂", "入貨"];
  const TODO = ["要做", "記得", "跟進", "處理", "打俾", "打比", "問"];
  const IDEA = ["諗到", "可以試", "不如", "想做"];
  const segs = raw
    .split(/[\n。！？!?；;]+/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 2);
  return segs.map((text) => {
    const low = text.toLowerCase();
    let type = "todo"; // 預設：搵唔到關鍵字 → 待辦
    if (SHOP.some((k) => text.includes(k))) type = "shopping";
    else if (TODO.some((k) => text.includes(k))) type = "todo";
    else if (IDEA.some((k) => text.includes(k)) || low.includes("idea")) type = "idea";
    return { text, type };
  });
}

function analyzeBrain() {
  const raw = $("brainText").value.trim();
  if (!raw) return toast("請先輸入內容", true);
  brainResult = classify(raw);
  if (!brainResult.length) return toast("分析唔到內容", true);
  renderBrainResult();
}

const TYPE_LABEL = { todo: "待辦", shopping: "購物", idea: "Idea", skip: "略過" };
function renderBrainResult() {
  const items = brainResult
    .map(
      (it, i) => `<div class="brain-item">
        <span class="t">${esc(it.text)}</span>
        <select data-bi="${i}">
          ${["todo", "shopping", "idea", "skip"]
            .map((tp) => `<option value="${tp}" ${tp === it.type ? "selected" : ""}>${TYPE_LABEL[tp]}</option>`)
            .join("")}
        </select></div>`
    )
    .join("");
  $("brainOut").innerHTML = `
    <div class="section-head"><h2>分析結果（請確認）</h2></div>
    <p style="color:var(--text-dim);font-size:13px;margin:-4px 2px 12px">每項可以改分類，確認後會自動加入對應清單。</p>
    ${items}
    <button class="btn primary" data-confirm-brain style="margin-top:8px">確認加入</button>
    <button class="btn ghost" data-analyze style="margin-top:10px">重新分析</button>`;
}

async function confirmBrain() {
  if (!db) return toast("未連接 Supabase", true);
  const todos = [], shops = [], ideas = [];
  brainResult.forEach((it) => {
    if (it.type === "todo") todos.push({ category: "次重要", content: it.text, status: "未完成" });
    else if (it.type === "shopping") shops.push({ name: it.text, status: "待買" });
    else if (it.type === "idea") ideas.push({ category: "清空腦袋", content: it.text });
  });
  try {
    if (todos.length) await api.addTodo(todos);
    if (shops.length) await api.addShop(shops);
    if (ideas.length) await api.addIdea(ideas);
    const n = todos.length + shops.length + ideas.length;
    toast(`已加入 ${n} 項`);
    brainResult = null;
    navigate("home");
  } catch (e) {}
}

/* ====== 7. 導航 ====== */
const RENDER = {
  home: renderHome,
  today: renderToday,
  monthRev: renderMonthRev,
  expense: renderExpense,
  balance: renderBalance,
  todos: renderTodos,
  ideas: renderIdeas,
  shopping: renderShopping,
  brain: renderBrain,
};

function navigate(v) {
  current = v;
  window.scrollTo(0, 0);
  // 標題列 / 返回掣
  const isTab = TAB_VIEWS.includes(v);
  $("backBtn").style.display = isTab ? "none" : "inline-flex";
  $("brand").style.display = isTab ? "flex" : "none";
  // 分頁高亮
  document.querySelectorAll(".tab").forEach((b) =>
    b.classList.toggle("on", b.dataset.tab === v)
  );
  RENDER[v]();
}

/* ====== 8. 事件 ====== */
// 底部分頁
document.querySelectorAll(".tab").forEach((b) =>
  b.addEventListener("click", () => navigate(b.dataset.tab))
);
$("backBtn").addEventListener("click", () => navigate("home"));
$("refreshBtn").addEventListener("click", () => {
  RENDER[current]();
  toast("已重新載入");
});

// 主內容：事件委派
view.addEventListener("click", async (e) => {
  const t = e.target.closest("[data-go],[data-tab-go],[data-save-today],[data-add-exp],[data-del-exp],[data-add-todo],[data-toggle-todo],[data-done-todo],[data-del-todo],[data-add-idea],[data-del-idea],[data-add-shop],[data-toggle-shop],[data-del-shop],[data-cat],[data-analyze],[data-confirm-brain]");
  if (!t) return;
  const d = t.dataset;

  if (d.go) return navigate(d.go);
  if (d.tabGo) return navigate(d.tabGo);

  // 本日營業額
  if ("saveToday" in d) return saveToday(t);

  // 類別分段揀選
  if (d.cat) {
    const seg = t.parentElement;
    seg.querySelectorAll("button").forEach((b) => b.classList.remove("on"));
    t.classList.add("on");
    if (seg.id === "expSeg") expCat = d.cat;
    if (seg.id === "todoSeg") todoCat = d.cat;
    return;
  }

  // 支出
  if ("addExp" in d) {
    const amt = parseFloat($("expAmt").value);
    if (!amt || amt <= 0) return toast("請輸入金額", true);
    await api.addExpense({
      date: $("expDate").value || todayStr(),
      category: expCat,
      amount: amt,
      note: $("expNote").value.trim() || null,
    });
    toast("已新增支出");
    renderExpense();
    return;
  }
  if (d.delExp) { await api.delExpense(d.delExp); renderExpense(); return; }

  // 待辦
  if ("addTodo" in d) {
    const c = $("todoContent").value.trim();
    if (!c) return toast("請輸入事項內容", true);
    await api.addTodo({ category: todoCat, content: c, note: $("todoNote").value.trim() || null, status: "未完成" });
    toast("已新增待辦");
    renderTodos();
    return;
  }
  if (d.toggleTodo) {
    const now = d.st === "已完成" ? "未完成" : "已完成";
    await api.updTodo(d.toggleTodo, { status: now });
    renderTodos();
    return;
  }
  if (d.doneTodo) {
    await api.updTodo(d.doneTodo, { status: "已完成" });
    toast("做咗，讚！");
    renderHome();
    return;
  }
  if (d.delTodo) { await api.delTodo(d.delTodo); renderTodos(); return; }

  // Idea
  if ("addIdea" in d) {
    const c = $("ideaContent").value.trim();
    if (!c) return toast("請輸入 idea", true);
    await api.addIdea({ category: $("ideaCat").value.trim() || null, content: c, note: $("ideaNote").value.trim() || null });
    toast("已新增 idea");
    renderIdeas();
    return;
  }
  if (d.delIdea) { await api.delIdea(d.delIdea); renderIdeas(); return; }

  // 購物
  if ("addShop" in d) {
    const n = $("shopName").value.trim();
    if (!n) return toast("請輸入物品名稱", true);
    await api.addShop({ name: n, quantity: $("shopQty").value.trim() || null, category: $("shopCat").value.trim() || null, note: $("shopNote").value.trim() || null, status: "待買" });
    toast("已加入清單");
    renderShopping();
    return;
  }
  if (d.toggleShop) {
    const now = d.st === "已買" ? "待買" : "已買";
    await api.updShop(d.toggleShop, { status: now });
    renderShopping();
    return;
  }
  if (d.delShop) { await api.delShop(d.delShop); renderShopping(); return; }

  // 清空腦袋
  if ("analyze" in d) return analyzeBrain();
  if ("confirmBrain" in d) return confirmBrain();
});

// 清空腦袋：下拉改分類
view.addEventListener("change", (e) => {
  const sel = e.target.closest("select[data-bi]");
  if (sel && brainResult) brainResult[+sel.dataset.bi].type = sel.value;
});

/* ====== 9. 即時同步（兩人共用，做到就用，做唔到唔影響）====== */
function subscribeRealtime() {
  if (!db) return;
  try {
    db.channel("curryboy-sync")
      .on("postgres_changes", { event: "*", schema: "public" }, () => {
        // 如果而家睇緊嘅畫面係資料畫面，靜靜地重新載入
        if (current !== "brain") RENDER[current]();
      })
      .subscribe();
  } catch (_) {}
}

/* ====== 10. 啟動 ====== */
navigate("home");
subscribeRealtime();
