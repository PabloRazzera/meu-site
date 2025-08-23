document.getElementById("publicarForm").addEventListener("submit", function(event) {
  event.preventDefault();

  const idade = parseInt(document.getElementById("idade").value);
  const naoSouRobo = document.getElementById("naoSouRobo").checked;
  const titulo = document.getElementById("titulo").value.trim();
  const conteudo = document.getElementById("conteudo").value.trim();

  if (isNaN(idade) || idade < 12) {
    alert("⚠️ Você precisa ter pelo menos 12 anos para publicar.");
    return;
  }

  if (!naoSouRobo) {
    alert("⚠️ Confirme que você não é um robô.");
    return;
  }

  if (titulo === "" || conteudo === "") {
    alert("⚠️ Preencha todos os campos.");
    return;
  }

  // Criar item da lista
  const li = document.createElement("li");
  li.innerHTML = `<h3>${titulo}</h3><p>${conteudo}</p><small>📅 Publicado por usuário com ${idade} anos</small>`;

  document.getElementById("listaLivros").appendChild(li);

  // Limpar formulário
  document.getElementById("publicarForm").reset();
});
