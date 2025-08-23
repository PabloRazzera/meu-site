/************ UTIL ************/
const $ = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));
const nowISO = () => new Date().toISOString();
const uid = (p="id") => `${p}_${Math.random().toString(36).slice(2,8)}_${Date.now().toString(36)}`;
const load = (k,f)=>{ try{ return JSON.parse(localStorage.getItem(k)) ?? f }catch{ return f } };
const save = (k,v)=> localStorage.setItem(k, JSON.stringify(v));
const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/************ STATE ************/
let users = load("users", []); // {id,username,email,pass,age,createdAt,reports:[],banned:false}
let session = load("session", null); // {userId}
let books = load("books", []); // see model below

/*
book: {
  id, authorId, title, theme, visibility:"public"|"private",
  cover: dataURL|null,
  pages: [{text, font, drawing}], // drawing = dataURL|null
  likes: [userId], dislikes: [userId],
  comments: [{id,userId,text,createdAt}],
  reports: [{userId,createdAt,reason}]
}
*/

/************ WATERMARK & ANTI-PRINT ************/
function updateWatermark(){
  const u = currentUser();
  const text = u ? `${u.username} • ${u.email} • ${new Date().toLocaleString()}` : `Visitante • ${new Date().toLocaleString()}`;
  const wm = $("#watermark");
  const svg = encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='600' height='200'>
  <text x='20' y='100' font-size='24' fill='white' opacity='0.4' transform='rotate(-20,20,100)'>${text}</text>
</svg>`);
  wm.style.backgroundImage = `url("data:image/svg+xml,${svg}")`;
}
updateWatermark();

document.addEventListener("contextmenu", e => e.preventDefault());
document.addEventListener("keydown", (e)=>{
  const blocked = (e.ctrlKey||e.metaKey) && ['p','s','c','x','u'].includes(e.key.toLowerCase());
  if (blocked || e.key === 'PrintScreen') { e.preventDefault(); e.stopPropagation(); alert("Ação bloqueada neste demo."); }
});
window.onbeforeprint = ()=> alert("Impressão desabilitada neste site.");

/************ AUTH ************/
function currentUser(){ return session ? users.find(u=>u.id===session.userId) || null : null; }

function openModal(id){ const d = document.getElementById(id); if(d?.showModal) d.showModal(); else d?.setAttribute("open",""); }
function closeModal(id){ const d = document.getElementById(id); if(d?.close) d.close(); else d?.removeAttribute("open"); }

function setAuthUI(){
  const u = currentUser();
  $("#logoutBtn").hidden = !u;
  $("#openAuthBtn").hidden = !!u;
  $("#userInfo").textContent = u ? `${u.username} (${u.email})` : "Não logado";
  updateWatermark();
}
$("#openAuthBtn").addEventListener("click",()=>openModal("authModal"));
$("[data-close-modal='authModal']").addEventListener("click",()=>closeModal("authModal"));
$("[data-close-modal='editorModal']").addEventListener("click",()=>closeModal("editorModal"));
$("[data-close-modal='readerModal']").addEventListener("click",()=>closeModal("readerModal"));
$("#logoutBtn").addEventListener("click", ()=>{ session=null; save("session",session); setAuthUI(); renderFeed(); });

/* tabs auth */
$$(".tab-btn").forEach(b=> b.addEventListener("click",()=>{
  $$(".tab-btn").forEach(x=>x.classList.remove("active"));
  b.classList.add("active");
  const id=b.dataset.tab;
  $$(".tab").forEach(t=>t.classList.remove("active"));
  document.getElementById(id).classList.add("active");
}));

/* register */
$("#registerBtn").addEventListener("click", ()=>{
  const username = $("#regUser").value.trim();
  const email = $("#regEmail").value.trim().toLowerCase();
  const age = parseInt($("#regAge").value,10);
  const pass = $("#regPass").value;
  const pass2 = $("#regPass2").value;
  const out = $("#registerMsg");

  if(username.length<3){ out.textContent="Usuário deve ter pelo menos 3 caracteres."; out.style.color="var(--danger)"; return; }
  if(!emailRe.test(email)){ out.textContent="E-mail inválido."; out.style.color="var(--danger)"; return; }
  if(users.some(u=>u.email===email)){ out.textContent="E-mail já cadastrado."; out.style.color="var(--danger)"; return; }
  if(users.some(u=>u.username.toLowerCase()===username.toLowerCase())){ out.textContent="Usuário já existe."; out.style.color="var(--danger)"; return; }
  if(!(age>=12)){ out.textContent="Você precisa ter 12 anos ou mais."; out.style.color="var(--danger)"; return; }
  if(pass.length<6){ out.textContent="Senha deve ter pelo menos 6 caracteres."; out.style.color="var(--danger)"; return; }
  if(pass!==pass2){ out.textContent="As senhas não conferem."; out.style.color="var(--danger)"; return; }

  const u = { id:uid("usr"), username, email, pass, age, createdAt:nowISO(), reports:[], banned:false };
  users.push(u); save("users", users);
  out.textContent="Conta criada! Você já pode entrar."; out.style.color="var(--ok)";
  $("#regUser").value=$("#regEmail").value=$("#regAge").value=$("#regPass").value=$("#regPass2").value="";
});

/* login */
$("#loginBtn").addEventListener("click", ()=>{
  const id = $("#loginUser").value.trim().toLowerCase();
  const pass = $("#loginPass").value;
  const out = $("#loginMsg");
  const u = users.find(u=> (u.email.toLowerCase()===id || u.username.toLowerCase()===id) && u.pass===pass );
  if(!u){ out.textContent="Credenciais inválidas."; out.style.color="var(--danger)"; return; }
  if(u.banned){ out.textContent="Conta banida."; out.style.color="var(--danger)"; return; }
  session = { userId: u.id }; save("session",session);
  out.textContent="Entrou!"; out.style.color="var(--ok)";
  setAuthUI(); closeModal("authModal");
});

/* google demo */
$("#googleBtn").addEventListener("click", ()=>{
  const name = `google_${Math.random().toString(36).slice(2,7)}`;
  const email = `${name}@gmail.com`;
  let u = users.find(x=>x.email===email);
  if(!u){
    u = { id:uid("usr"), username:name, email, pass:"", age:18, createdAt:nowISO(), reports:[], banned:false };
    users.push(u); save("users",users);
  }
  session={userId:u.id}; save("session",session);
  setAuthUI(); closeModal("authModal");
  alert("Login Google simulado. (Para ser real precisa de backend/OAuth.)");
});

/************ BOOK EDITOR ************/
let editor = {
  cover:null,
  theme:"default",
  visibility:"public",
  pages:[{text:"", font:"serif", drawing:null}],
  pageIndex:0
};

function resetEditor(){
  editor = { cover:null, theme:"default", visibility:"public", pages:[{text:"",font:"serif",drawing:null}], pageIndex:0 };
  $("#bookTitle").value="";
  $("#bookTheme").value="default";
  $("#bookVisibility").value="public";
  $("#coverPreview").innerHTML="";
  $("#pageFont").value="serif";
  $("#pageText").value="";
  clearCanvas();
  updatePageLabel();
}

$("#newBookBtn").addEventListener("click", ()=>{
  if(!currentUser()){ openModal("authModal"); return; }
  resetEditor(); openModal("editorModal");
});

$("#bookTheme").addEventListener("change", e=> editor.theme = e.target.value);
$("#bookVisibility").addEventListener("change", e=> editor.visibility = e.target.value);

/* cover upload */
$("#coverInput").addEventListener("change", async (e)=>{
  const file = e.target.files?.[0]; if(!file) return;
  const url = await fileToDataURL(file);
  editor.cover = url; renderCoverPreview();
});
$("#genCoverBtn").addEventListener("click", ()=>{
  const title = ($("#bookTitle").value || "Sem título").slice(0,40);
  const url = genCoverFromTitle(title);
  editor.cover = url; renderCoverPreview();
});
$("#clearCoverBtn").addEventListener("click", ()=>{ editor.cover=null; renderCoverPreview(); });
function renderCoverPreview(){
  $("#coverPreview").innerHTML = editor.cover ? `<img src="${editor.cover}" alt="Capa"/>` : `<span class="muted small">Sem capa</span>`;
}

/* pages */
function updatePageLabel(){ $("#pageIndexLabel").textContent = `Página ${editor.pageIndex+1}/${editor.pages.length}`; }

$("#addPageBtn").addEventListener("click", ()=>{
  savePageState();
  editor.pages.push({text:"", font:"serif", drawing:null});
  editor.pageIndex = editor.pages.length-1;
  loadPageState();
});
$("#removePageBtn").addEventListener("click", ()=>{
  if(editor.pages.length===1){ alert("Precisa ter pelo menos 1 página."); return; }
  editor.pages.splice(editor.pageIndex,1);
  editor.pageIndex = Math.max(0, editor.pageIndex-1);
  loadPageState();
});

$("#pageFont").addEventListener("change", e=>{
  editor.pages[editor.pageIndex].font = e.target.value;
  applyEditorFont();
});
$("#pageText").addEventListener("input", e=>{
  editor.pages[editor.pageIndex].text = e.target.value;
});

function loadPageState(){
  const p = editor.pages[editor.pageIndex];
  $("#pageFont").value = p.font;
  $("#pageText").value = p.text;
  clearCanvas();
  if(p.drawing) drawImageOnCanvas(p.drawing);
  applyEditorFont();
  updatePageLabel();
}
function savePageState(){
  // text already tracked; canvas saved explicitly when publishing
}

/************ DRAWING CANVAS ************/
const canvas = $("#drawCanvas");
const ctx = canvas.getContext("2d");
let drawing=false, last=null;
function getPos(e){ const r=canvas.getBoundingClientRect(); const x=(e.clientX-r.left)*canvas.width/r.width; const y=(e.clientY-r.top)*canvas.height/r.height; return {x,y}; }
function clearCanvas(){ ctx.clearRect(0,0,canvas.width,canvas.height); ctx.fillStyle="#0c1323"; ctx.fillRect(0,0,canvas.width,canvas.height); }
clearCanvas();
canvas.addEventListener("mousedown", e=>{ drawing=true; last=getPos(e); });
canvas.addEventListener("mouseup", ()=> drawing=false );
canvas.addEventListener("mouseleave", ()=> drawing=false );
canvas.addEventListener("mousemove", e=>{
  if(!drawing) return;
  const p=getPos(e);
  ctx.lineCap="round"; ctx.lineJoin="round";
  ctx.lineWidth = parseInt($("#penSize").value,10) || 3;
  ctx.strokeStyle="#fff";
  ctx.beginPath(); ctx.moveTo(last.x,last.y); ctx.lineTo(p.x,p.y); ctx.stroke();
  last=p;
});
$("#drawClearBtn").addEventListener("click", clearCanvas);
function drawImageOnCanvas(dataURL){
  const img=new Image(); img.onload=()=>{ clearCanvas(); ctx.drawImage(img,0,0,canvas.width,canvas.height); }; img.src=dataURL;
}

/************ SAVE BOOK ************/
$("#saveBookBtn").addEventListener("click", async ()=>{
  const u = currentUser();
  if(!u){ openModal("authModal"); return; }
  const title = $("#bookTitle").value.trim();
  if(title.length<3){ alert("Título muito curto (min. 3)."); return; }

  // salva desenho atual na página atual
  const dataURL = canvas.toDataURL("image/png");
  editor.pages[editor.pageIndex].drawing = dataURL;

  const book = {
    id: uid("book"),
    authorId: u.id,
    title,
    theme: editor.theme,
    visibility: editor.visibility,
    cover: editor.cover,
    pages: editor.pages.map(p=>({ text:p.text, font:p.font, drawing:p.drawing })),
    likes: [], dislikes: [],
    comments: [],
    reports: [],
    createdAt: nowISO()
  };
  books.push(book); save("books", books);
  closeModal("editorModal");
  renderFeed();
  alert("Livro salvo!");
});

/************ FEED / SEARCH ************/
$("#searchInput").addEventListener("input", renderFeed);

function renderFeed(){
  const grid = $("#feed");
  const q = $("#searchInput").value.trim().toLowerCase();
  const u = currentUser();
  const list = books
    .filter(b => b.visibility==="public" || (u && b.authorId===u.id))
    .filter(b =>{
      if(!q) return true;
      const author = users.find(x=>x.id===b.authorId);
      const theme=b.theme||"";
      return b.title.toLowerCase().includes(q)
        || (author?.username||"").toLowerCase().includes(q)
        || theme.toLowerCase().includes(q);
    })
    .sort((a,b)=> new Date(b.createdAt)-new Date(a.createdAt));

  grid.innerHTML = "";
  $("#emptyMsg").hidden = list.length>0;

  list.forEach(b=>{
    const author = users.find(u=>u.id===b.authorId);
    const card = document.createElement("div");
    card.className = "card book-card";
    card.innerHTML = `
      <div class="row gap">
        <img src="${b.cover || genCoverFromTitle(b.title, true)}" alt="Capa" style="width:64px;height:86px;object-fit:cover;border-radius:6px;border:1px solid var(--border)"/>
        <div>
          <h3>${escapeHTML(b.title)}</h3>
          <div class="meta">Por ${escapeHTML(author?.username||"desconhecido")} • Tema: ${b.theme} • ${b.visibility==="private"?"🔒 Privado":"🌐 Público"}</div>
          <div class="row gap">
            <button class="btn small" data-open="${b.id}">Ler</button>
            ${u && u.id===b.authorId ? `<button class="btn small outline" data-delete="${b.id}">Excluir</button>`:""}
          </div>
        </div>
      </div>
    `;
    grid.appendChild(card);
  });

  grid.addEventListener("click", e=>{
    const open = e.target.closest("button[data-open]"); if(open){ openReader(open.dataset.open); return; }
    const del = e.target.closest("button[data-delete]"); if(del){ deleteBook(del.dataset.delete); return; }
  }, { once:true });
}
function deleteBook(id){
  if(!confirm("Excluir este livro?")) return;
  const u=currentUser(); const b=books.find(x=>x.id===id);
  if(!u || !b || b.authorId!==u.id) return alert("Sem permissão.");
  books = books.filter(x=>x.id!==id); save("books", books); renderFeed();
}

/************ READER ************/
let currentBookId=null;
function openReader(bookId){
  currentBookId = bookId;
  const b = books.find(x=>x.id===bookId); if(!b) return;
  const a = users.find(u=>u.id===b.authorId);
  $("#readerTitle").textContent = b.title;
  $("#readerMeta").textContent = `Por ${a?.username||"desconhecido"} • ${new Date(b.createdAt).toLocaleString()} • Tema ${b.theme}`;
  $("#readerCover").src = b.cover || genCoverFromTitle(b.title,true);
  $("#likeCount").textContent = b.likes.length;
  $("#dislikeCount").textContent = b.dislikes.length;

  const pages = $("#readerPages");
  pages.className = `reader-pages theme-${b.theme}`;
  pages.innerHTML = "";

  b.pages.forEach((p,idx)=>{
    const div = document.createElement("div");
    div.className = "reader-page";
    div.style.fontFamily = p.font;
    div.innerHTML = `<div>${escapeHTML(p.text).replace(/\n/g,"<br>")}</div>`;
    if(p.drawing){
      const img = document.createElement("img");
      img.src = p.drawing; img.className="draw";
      img.alt = `Desenho da página ${idx+1}`;
      div.appendChild(img);
    }
    pages.appendChild(div);
  });

  // comments
  renderComments(b);
  openModal("readerModal");
}

function renderComments(book){
  const list = $("#commentsList"); list.innerHTML="";
  book.comments.forEach(c=>{
    const u = users.find(x=>x.id===c.userId);
    const el = document.createElement("div");
    el.className="comment";
    el.innerHTML = `<strong>${escapeHTML(u?.username||"anon")}</strong> <span class="muted small">• ${new Date(c.createdAt).toLocaleString()}</span><br>${escapeHTML(c.text)}`;
    list.appendChild(el);
  });
  // comment form
  const me = currentUser();
  $("#commentForm").style.display = me ? "flex" : "none";
}

$("#sendCommentBtn").addEventListener("click", ()=>{
  const me=currentUser(); if(!me) return;
  const b = books.find(x=>x.id===currentBookId); if(!b) return;
  const txt = $("#commentInput").value.trim(); if(!txt) return;
  b.comments.push({ id:uid("cmt"), userId:me.id, text:txt, createdAt:nowISO() });
  save("books", books);
  $("#commentInput").value="";
  renderComments(b);
});

/* likes / dislikes */
$("#likeBtn").addEventListener("click", ()=> reactBook("like"));
$("#dislikeBtn").addEventListener("click", ()=> reactBook("dislike"));

function reactBook(kind){
  const me=currentUser(); if(!me){ openModal("authModal"); return; }
  const b = books.find(x=>x.id===currentBookId); if(!b) return;

  // garantir unicidade
  b.likes = b.likes.filter(id=>id!==me.id);
  b.dislikes = b.dislikes.filter(id=>id!==me.id);
  if(kind==="like") b.likes.push(me.id); else b.dislikes.push(me.id);
  save("books", books);
  $("#likeCount").textContent = b.likes.length;
  $("#dislikeCount").textContent = b.dislikes.length;
}

/* report book & author */
$("#reportBookBtn").addEventListener("click", ()=>{
  const me=currentUser(); if(!me){ openModal("authModal"); return; }
  const b = books.find(x=>x.id===currentBookId); if(!b) return;
  b.reports.push({ userId:me.id, createdAt:nowISO(), reason:"inadequado" });
  save("books", books);
  alert("Livro denunciado (salvo localmente).");
});
$("#reportAuthorBtn").addEventListener("click", ()=>{
  const me=currentUser(); if(!me){ openModal("authModal"); return; }
  const b = books.find(x=>x.id===currentBookId); if(!b) return;
  const a = users.find(u=>u.id===b.authorId); if(!a) return;
  a.reports.push({ userId:me.id, createdAt:nowISO(), reason:"conduta" });
  save("users", users);
  alert("Autor denunciado (salvo localmente).");
});

/************ HELPERS (FILES, COVER, ESCAPE) ************/
function fileToDataURL(file){ return new Promise((res,rej)=>{ const r=new FileReader(); r.onload=()=>res(r.result); r.onerror=rej; r.readAsDataURL(file); }); }

function genCoverFromTitle(title, small=false){
  const w=small?160:360, h=small?220:540;
  const c=document.createElement("canvas"); c.width=w; c.height=h;
  const x=c.getContext("2d");
  // gradient bg
  const g=x.createLinearGradient(0,0,w,h);
  g.addColorStop(0,"#171c2f"); g.addColorStop(1,"#4a90e2");
  x.fillStyle=g; x.fillRect(0,0,w,h);
  // title
  x.fillStyle="#fff"; x.font = `${small?14:24}px serif`;
  wrapText(x, title, 12, small?40:60, w-24, small?18:28);
  return c.toDataURL("image/png");
}
function wrapText(ctx, text, x, y, maxWidth, lineHeight){
  const words=text.split(" "); let line="";
  for(let n=0;n<words.length;n++){
    const testLine=line+words[n]+" ";
    if(ctx.measureText(testLine).width>maxWidth){ ctx.fillText(line,x,y); line=words[n]+" "; y+=lineHeight; }
    else line=testLine;
  }
  ctx.fillText(line,x,y);
}
function escapeHTML(s){ return (s||"").replace(/[&<>"']/g, m=>({ "&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;" }[m])); }

/************ INIT ************/
function init(){
  setAuthUI();
  renderFeed();
  // close when clicking "Fechar"
  document.querySelectorAll("[data-close-modal]").forEach(btn=>{
    btn.addEventListener("click", ()=> closeModal(btn.dataset.closeModal));
  });
}
init();

