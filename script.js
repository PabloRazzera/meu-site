// -------- Utilidades --------
function saveData(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}
function loadData(key) {
  return JSON.parse(localStorage.getItem(key)) || [];
}

// -------- Estado --------
let currentUser = null;
let books = loadData("books");
let users = loadData("users");
let selectedBook = null;

// -------- Modal --------
function openModal(id) {
  document.getElementById(id).style.display = "flex";
}
function closeModals() {
  document.querySelectorAll(".modal").forEach(m => m.style.display = "none");
}
document.querySelectorAll(".closeModal").forEach(btn => btn.addEventListener("click", closeModals));

// -------- Registro --------
document.getElementById("registerSubmit").addEventListener("click", () => {
  const username = document.getElementById("regUsername").value;
  const email = document.getElementById("regEmail").value;
  const age = parseInt(document.getElementById("regAge").value);
  const pass = document.getElementById("regPassword").value;
  const confirm = document.getElementById("regConfirmPassword").value;

  if (!username || !email || !pass) return alert("Preencha todos os campos!");
  if (age < 12) return alert("Idade mínima: 12 anos");
  if (pass !== confirm) return alert("Senhas não conferem");

  if (users.find(u => u.username === username || u.email === email)) {
    return alert("Usuário ou email já existem!");
  }

  users.push({ username, email, password: pass });
  saveData("users", users);
  alert("Conta criada!");
  closeModals();
});

// -------- Login --------
document.getElementById("loginSubmit").addEventListener("click", () => {
  const userInput = document.getElementById("loginUsername").value;
  const pass = document.getElementById("loginPassword").value;

  const user = users.find(u => (u.username === userInput || u.email === userInput) && u.password === pass);
  if (!user) return alert("Credenciais inválidas!");

  currentUser = user;
  alert("Bem-vindo, " + user.username);
  document.getElementById("btnLogin").style.display = "none";
  document.getElementById("btnRegister").style.display = "none";
  document.getElementById("btnLogout").style.display = "inline";
  document.getElementById("btnNewBook").style.display = "block";
  closeModals();
});

// -------- Logout --------
document.getElementById("btnLogout").addEventListener("click", () => {
  currentUser = null;
  document.getElementById("btnLogin").style.display = "inline";
  document.getElementById("btnRegister").style.display = "inline";
  document.getElementById("btnLogout").style.display = "none";
  document.getElementById("btnNewBook").style.display = "none";
});

// -------- Criar Livro --------
document.getElementById("createBook").addEventListener("click", () => {
  if (!currentUser) return alert("Faça login primeiro!");
  const title = document.getElementById("bookTitle").value;
  const theme = document.getElementById("bookTheme").value;
  const cover = document.getElementById("bookCover").value || "https://via.placeholder.com/150";
  const content = document.getElementById("bookContent").value;
  const isPrivate = document.getElementById("bookPrivate").checked;

  if (!title || !content) return alert("Preencha o título e conteúdo");

  const book = {
    id: Date.now(),
    title, theme, cover, content,
    private: isPrivate,
    author: currentUser.username,
    likes: 0, dislikes: 0,
    comments: []
  };

  books.push(book);
  saveData("books", books);
  renderBooks();
  closeModals();
});

// -------- Renderizar Livros --------
function renderBooks() {
  const container = document.getElementById("booksList");
  container.innerHTML = "";
  books.filter(b => !b.private).forEach(book => {
    const div = document.createElement("div");
    div.className = "book-card";
    div.innerHTML = `
      <img src="${book.cover}">
      <h3>${book.title}</h3>
      <p><b>${book.theme}</b></p>
      <small>Autor: ${book.author}</small>
    `;
    div.addEventListener("click", () => openBook(book));
    container.appendChild(div);
  });
}
renderBooks();

// -------- Abrir Livro --------
function openBook(book) {
  selectedBook = book;
  document.getElementById("readBookTitle").innerText = book.title;
  document.getElementById("readBookCover").src = book.cover;
  document.getElementById("readBookTheme").innerText = "Tema: " + book.theme;
  document.getElementById("readBookContent").innerText = book.content;
  renderComments();
  openModal("readBookModal");
}

// -------- Likes/Dislikes --------
document.getElementById("likeBtn").addEventListener("click", () => {
  if (!currentUser) return alert("Faça login!");
  selectedBook.likes++;
  saveData("books", books);
  alert("Você curtiu!");
});
document.getElementById("dislikeBtn").addEventListener("click", () => {
  if (!currentUser) return alert("Faça login!");
  selectedBook.dislikes++;
  saveData("books", books);
  alert("Você não curtiu!");
});
document.getElementById("reportBtn").addEventListener("click", () => {
  alert("Livro denunciado!");
});

// -------- Comentários --------
function renderComments() {
  const list = document.getElementById("commentsList");
  list.innerHTML = "";
  selectedBook.comments.forEach(c => {
    const p = document.createElement("p");
    p.innerText = c.author + ": " + c.text;
    list.appendChild(p);
  });
}
document.getElementById("addComment").addEventListener("click", () => {
  if (!currentUser) return alert("Faça login!");
  const text = document.getElementById("newComment").value;
  if (!text) return;
  selectedBook.comments.push({ author: currentUser.username, text });
  saveData("books", books);
  document.getElementById("newComment").value = "";
  renderComments();
});

// -------- Botões Globais --------
document.getElementById("btnLogin").addEventListener("click", () => openModal("loginModal"));
document.getElementById("btnRegister").addEventListener("click", () => openModal("registerModal"));
document.getElementById("btnNewBook").addEventListener("click", () => openModal("newBookModal"));
