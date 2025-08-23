// ===============================
// Sistema de Biblioteca Online
// ===============================

// Base de dados (LocalStorage)
let users = JSON.parse(localStorage.getItem("users")) || [];
let currentUser = JSON.parse(localStorage.getItem("currentUser")) || null;
let books = JSON.parse(localStorage.getItem("books")) || [];

// ===============================
// Funções de autenticação
// ===============================

function saveData() {
    localStorage.setItem("users", JSON.stringify(users));
    localStorage.setItem("books", JSON.stringify(books));
    localStorage.setItem("currentUser", JSON.stringify(currentUser));
}

function registerUser(username, email, password, confirmPassword, age) {
    if (age < 12) {
        alert("Você precisa ter pelo menos 12 anos para se cadastrar.");
        return false;
    }
    if (password !== confirmPassword) {
        alert("As senhas não conferem!");
        return false;
    }
    if (users.find(u => u.email === email || u.username === username)) {
        alert("Usuário ou email já cadastrado!");
        return false;
    }

    let newUser = {
        username,
        email,
        password,
        age,
        reports: 0
    };

    users.push(newUser);
    saveData();
    alert("Conta criada com sucesso!");
    return true;
}

function loginUser(identifier, password) {
    let user = users.find(u =>
        (u.username === identifier || u.email === identifier) && u.password === password
    );
    if (user) {
        currentUser = user;
        saveData();
        alert("Login realizado com sucesso!");
        loadBooks();
        return true;
    } else {
        alert("Usuário ou senha inválidos!");
        return false;
    }
}

function logoutUser() {
    currentUser = null;
    saveData();
    alert("Você saiu da conta.");
    location.reload();
}

// ===============================
// Funções de Livros
// ===============================

function createBook(title, cover, theme, isPrivate, content, font) {
    if (!currentUser) {
        alert("Você precisa estar logado para criar um livro!");
        return;
    }

    let book = {
        id: Date.now(),
        author: currentUser.username,
        title,
        cover,
        theme,
        isPrivate,
        content,
        font,
        likes: 0,
        dislikes: 0,
        reports: 0,
        comments: []
    };

    books.push(book);
    saveData();
    alert("Livro criado com sucesso!");
    loadBooks();
}

function toggleLike(bookId, type) {
    let book = books.find(b => b.id === bookId);
    if (!book) return;

    if (type === "like") book.likes++;
    else if (type === "dislike") book.dislikes++;

    saveData();
    loadBooks();
}

function reportBook(bookId) {
    let book = books.find(b => b.id === bookId);
    if (book) {
        book.reports++;
        saveData();
        alert("Livro denunciado!");
    }
}

function reportUser(username) {
    let user = users.find(u => u.username === username);
    if (user) {
        user.reports++;
        saveData();
        alert("Conta denunciada!");
    }
}

function addComment(bookId, comment) {
    let book = books.find(b => b.id === bookId);
    if (book && currentUser) {
        book.comments.push({
            user: currentUser.username,
            text: comment
        });
        saveData();
        loadBooks();
    }
}

// ===============================
// Exibir Livros
// ===============================

function loadBooks(search = "") {
    let feed = document.getElementById("feed");
    if (!feed) return;

    feed.innerHTML = "";

    books
        .filter(b => !b.isPrivate || b.author === currentUser?.username)
        .filter(b => b.title.toLowerCase().includes(search.toLowerCase()))
        .forEach(book => {
            let div = document.createElement("div");
            div.className = "book-card";
            div.innerHTML = `
                <img src="${book.cover}" alt="Capa" class="book-cover">
                <h3>${book.title}</h3>
                <p>Autor: ${book.author}</p>
                <p>Tema: ${book.theme}</p>
                <p style="font-family:${book.font}">${book.content.substring(0,100)}...</p>
                <button onclick="toggleLike(${book.id}, 'like')">👍 ${book.likes}</button>
                <button onclick="toggleLike(${book.id}, 'dislike')">👎 ${book.dislikes}</button>
                <button onclick="reportBook(${book.id})">🚨 Denunciar Livro</button>
                <button onclick="reportUser('${book.author}')">🚨 Denunciar Autor</button>
                <div>
                    <input type="text" id="comment-${book.id}" placeholder="Escreva um comentário...">
                    <button onclick="addComment(${book.id}, document.getElementById('comment-${book.id}').value)">Comentar</button>
                </div>
                <div>
                    <h4>Comentários:</h4>
                    <ul>
                        ${book.comments.map(c => `<li><b>${c.user}:</b> ${c.text}</li>`).join("")}
                    </ul>
                </div>
            `;
            feed.appendChild(div);
        });
}

// ===============================
// Pesquisa
// ===============================

function searchBooks() {
    let query = document.getElementById("search").value;
    loadBooks(query);
}

// ===============================
// Proteção contra prints (simulada)
// ===============================
document.addEventListener("keydown", (e) => {
    if (e.key === "PrintScreen") {
        alert("Prints não são permitidos!");
        e.preventDefault();
    }
});

// ===============================
// Exemplo de integração com botões
// ===============================

// Registro
document.getElementById("registerBtn")?.addEventListener("click", () => {
    let username = document.getElementById("reg-username").value;
    let email = document.getElementById("reg-email").value;
    let password = document.getElementById("reg-password").value;
    let confirmPassword = document.getElementById("reg-confirm").value;
    let age = parseInt(document.getElementById("reg-age").value);

    registerUser(username, email, password, confirmPassword, age);
});

// Login
document.getElementById("loginBtn")?.addEventListener("click", () => {
    let identifier = document.getElementById("login-identifier").value;
    let password = document.getElementById("login-password").value;

    loginUser(identifier, password);
});

// Criar Livro
document.getElementById("createBookBtn")?.addEventListener("click", () => {
    let title = document.getElementById("book-title").value;
    let cover = document.getElementById("book-cover").value;
    let theme = document.getElementById("book-theme").value;
    let isPrivate = document.getElementById("book-private").checked;
    let content = document.getElementById("book-content").value;
    let font = document.getElementById("book-font").value;

    createBook(title, cover, theme, isPrivate, content, font);
});

// Pesquisa
document.getElementById("searchBtn")?.addEventListener("click", searchBooks);

// Carregar livros ao abrir
loadBooks();
