// ======== Configurações de regras ========
const MIN_ACCOUNT_AGE_DAYS = 3; // idade mínima da conta para publicar
const BLOCKED_WORDS = ["palavrão1", "palavrão2"]; // adicione palavras proibidas

// ======== Helpers ========
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));
const nowISO = () => new Date().toISOString();
const daysBetween = (fromIso, toIso = nowISO()) =>
  Math.floor((new Date(toIso) - new Date(fromIso)) / (1000 * 60 * 60 * 24));

function load(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
  catch { return fallback; }
}
function save(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function uid(prefix = "id") {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}_${Date.now().toString(36)}`;
}

function escapeAndSetText(node, text) {
  node.textContent = text ?? "";
}

// ======== Estado ========
let users = load("users", []);          // [{id, username, password, createdAt}]
let session = load("session", null);    // {userId}
let books = load("books", []);          // [{id, authorId, authorName, title, content, createdAt, status}]

function currentUser() {
  if (!session) return null;
  return users.find(u => u.id === session.userId) || null;
}

// ======== UI: Tabs ========
function switchTab(tabId) {
  $$(".tab").forEach(t => t.classList.remove("active"));
  $$(".tab-btn").forEach(b => b.classList.remove("active"));
  $(`#${tabId}`)?.classList.add("active");
  $(`.tab-btn[data-tab="${tabId}"]`)?.classList.add("active");
}

$$(".tab-btn").forEach(btn => {
  btn.addEventListener("click", () => switchTab(btn.dataset.tab));
});

document.addEventListener("click", (e) => {
  const t = e.target.closest("[data-open-tab]");
  if (t) switchTab(t.dataset.openTab);
});

// ======== Autenticação ========
function updateUserArea() {
  const user = currentUser();
  const welcome = $("#welcomeText");
  const logoutBtn = $("#logoutBtn");
  const writeGuard = $("#writeGuard");
  const editorArea = $("#editorArea");

  if (user) {
    const age = daysBetween(user.createdAt);
    welcome.textContent = `Olá, ${user.username} • Conta: ${age} dia(s)`;
    logoutBtn.hidden = false;
    writeGuard.hidden = true;
    editorArea.hidden = false;
  } else {
    welcome.textContent = "Não logado";
    logoutBtn.hidden = true;
    writeGuard.hidden = false;
    editorArea.hidden = true;
  }
}
$("#logoutBtn").addEventListener("click", () => {
  session = null; save("session", session);
  updateUserArea();
  renderDrafts();
});

$("#registerBtn").addEventListener("click", () => {
  const username = $("#regUser").value.trim();
  const password = $("#regPass").value;
  const msg = $("#registerMsg");

  if (username.length < 3) {
    msg.textContent = "Usuário deve ter pelo menos 3 caracteres.";
    msg.style.color = "var(--danger)"; return;
  }
  if (users.some(u => u.username.toLowerCase() === username.toLowerCase())) {
    msg.textContent = "Esse usuário já existe."; msg.style.color = "var(--danger)"; return;
  }
  if (password.length < 4) {
    msg.textContent = "Senha deve ter pelo menos 4 caracteres.";
    msg.style.color = "var(--danger)"; return;
  }

  const user = { id: uid("usr"), username, password, createdAt: nowISO() };
  users.push(user); save("users", users);
  msg.textContent = "Conta criada! Faça login.";
  msg.style.color = "var(--ok)";
  $("#regUser").value = ""; $("#regPass").value = "";
});

$("#loginBtn").addEventListener("click", () => {
  const username = $("#loginUser").value.trim();
  const password = $("#loginPass").value;
  const msg = $("#loginMsg");

  const user = users.find(u => u.username === username && u.password === password);
  if (!user) {
    msg.textContent = "Usuário ou senha incorretos."; msg.style.color = "var(--danger)"; return;
  }
  session = { userId: user.id }; save("session", session);
  msg.textContent = "Login efetuado!"; msg.style.color = "var(--ok)";
  updateUserArea();
  switchTab("tab-write");
});

// ======== Regras / Publicação ========
function canPublish(user, title, content) {
  const errors = [];

  if (!user) errors.push("Você precisa estar logado.");
  if (!title || title.trim().length < 3) errors.push("Título muito curto.");
  if (!content || content.trim().length < 20) errors.push("Conteúdo muito curto (mín. 20 caracteres).");

  // Idade da conta
  if (user) {
    const age = daysBetween(user.createdAt);
    if (age < MIN_ACCOUNT_AGE_DAYS) {
      errors.push(`Sua conta tem apenas ${age} dia(s). É preciso ter ${MIN_ACCOUNT_AGE_DAYS} ou mais.`);
    }
  }

  // Bloqueio simples por palavras (case-insensitive)
  const lowered = `${title} ${content}`.toLowerCase();
  const bad = BLOCKED_WORDS.find(w => w && lowered.includes(w.toLowerCase()));
  if (bad) errors.push("Seu texto contém termos proibidos pelas regras.");

  return { ok: errors.length === 0, errors };
}

// ======== Editor ========
$("#minAgeDaysText").textContent = MIN_ACCOUNT_AGE_DAYS.toString();

$("#saveDraftBtn").addEventListener("click", () => {
  const user = currentUser();
  if (!user) { alert("Faça login para salvar rascunhos."); return; }

  const title = $("#titleInput").value.trim();
  const content = $("#contentInput").value;

  if (title.length < 1 && content.trim().length < 1) {
    alert("Escreva algo antes de salvar."); return;
  }

  const draft = {
    id: uid("draft"),
    authorId: user.id,
    authorName: user.username,
    title,
    content,
    createdAt: nowISO(),
    status: "draft"
  };
  books.push(draft); save("books", books);
  renderDrafts();
  alert("Rascunho salvo!");
});

$("#publishBtn").addEventListener("click", () => {
  const user = currentUser();
  const title = $("#titleInput").value.trim();
  const content = $("#contentInput").value;

  const check = canPublish(user, title, content);
  if (!check.ok) {
    alert("Não foi possível publicar:\n• " + check.errors.join("\n• "));
    return;
  }

  const book = {
    id: uid("book"),
    authorId: user.id,
    authorName: user.username,
    title,
    content,
    createdAt: nowISO(),
    status: "published"
  };
  books.push(book); save("books", books);

  // Limpa editor
  $("#titleInput").value = "";
  $("#contentInput").value = "";

  renderLibrary();
  alert("Publicado com sucesso!");
  switchTab("tab-library");
});

function renderDrafts() {
  const user = currentUser();
  const box = $("#draftsList");
  box.innerHTML = "";

  if (!user) { box.innerHTML = `<div class="empty">Sem rascunhos.</div>`; return; }

  const drafts = books.filter(b => b.authorId === user.id && b.status === "draft")
                      .sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));

  if (drafts.length === 0) { box.innerHTML = `<div class="empty">Sem rascunhos.</div>`; return; }

  drafts.forEach(d => {
    const card = document.createElement("div");
    card.className = "draft";
    card.innerHTML = `
      <strong></strong>
      <div class="meta"></div>
      <div class="row gap">
        <button class="btn small outline" data-action="load" data-id="${d.id}">Carregar no editor</button>
        <button class="btn small" data-action="publish-draft" data-id="${d.id}">Publicar</button>
        <button class="btn small outline" data-action="delete" data-id="${d.id}">Excluir</button>
      `;
    escapeAndSetText(card.querySelector("strong"), d.title || "(Sem título)");
    card.querySelector(".meta").textContent = `Salvo em ${new Date(d.createdAt).toLocaleString()}`;
    box.appendChild(card);
  });

  box.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-action]");
    if (!btn) return;
    const id = btn.dataset.id;
    const draft = books.find(b => b.id === id && b.status === "draft");
    if (!draft) return;

    if (btn.dataset.action === "load") {
      $("#titleInput").value = draft.title || "";
      $("#contentInput").value = draft.content || "";
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
    if (btn.dataset.action === "publish-draft") {
      const user = currentUser();
      const check = canPublish(user, draft.title || "", draft.content || "");
      if (!check.ok) { alert("Não foi possível publicar:\n• " + check.errors.join("\n• ")); return; }
      draft.status = "published";
      draft.createdAt = nowISO();
      save("books", books);
      renderDrafts(); renderLibrary();
      alert("Rascunho publicado!");
    }
    if (btn.dataset.action === "delete") {
      if (confirm("Excluir este rascunho?")) {
        books = books.filter(b => b.id !== id);
        save("books", books);
        renderDrafts();
      }
    }
  }, { once: true }); // evita múltiplos listeners duplicados
}

// ======== Biblioteca (listar/ler) ========
function renderLibrary() {
  const grid = $("#booksGrid");
  const empty = $("#emptyLibraryMsg");
  const q = $("#searchInput").value.trim().toLowerCase();

  const list = books
    .filter(b => b.status === "published")
    .filter(b => {
      if (!q) return true;
      return (b.title || "").toLowerCase().includes(q) ||
             (b.authorName || "").toLowerCase().includes(q);
    })
    .sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));

  grid.innerHTML = "";
  if (list.length === 0) {
    empty.hidden = false;
    return;
  }
  empty.hidden = true;

  list.forEach(b => {
    const card = document.createElement("div");
    card.className = "card book";
    const h3 = document.createElement("h3");
    escapeAndSetText(h3, b.title || "(Sem título)");

    const meta = document.createElement("div");
    meta.className = "meta";
    meta.textContent = `Por ${b.authorName} • ${new Date(b.createdAt).toLocaleString()}`;

    const readBtn = document.createElement("button");
    readBtn.className = "btn small";
    readBtn.textContent = "Ler";
    readBtn.addEventListener("click", () => openReader(b));

    card.appendChild(h3);
    card.appendChild(meta);
    card.appendChild(readBtn);
    grid.appendChild(card);
  });
}

function openReader(book) {
  const modal = $("#readerModal");
  escapeAndSetText($("#readerTitle"), book.title || "(Sem título)");
  $("#readerMeta").textContent = `Por ${book.authorName} • Publicado em ${new Date(book.createdAt).toLocaleString()}`;
  $("#readerContent").textContent = book.content || "";
  if (typeof modal.showModal === "function") modal.showModal();
  else modal.setAttribute("open", "");
}
$("#closeReaderBtn").addEventListener("click", () => {
  const modal = $("#readerModal");
  if (typeof modal.close === "function") modal.close();
  else modal.removeAttribute("open");
});

$("#searchInput").addEventListener("input", renderLibrary);

// ======== Inicialização ========
function init() {
  // texto do cabeçalho de regra
  $("#minAgeDaysText").textContent = MIN_ACCOUNT_AGE_DAYS.toString();
  updateUserArea();
  renderLibrary();
  renderDrafts();
}
init();



