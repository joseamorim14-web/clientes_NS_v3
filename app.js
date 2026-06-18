/* ================================================================
   CONTROLE DE DESCONTO 15% — OMNI
   App estático (sem back-end). Roda em file:// e no GitHub Pages.

   Visão geral:
   - A base de clientes vem de data/clientes.js (window.CLIENTES).
   - O status de uso do desconto é guardado no LocalStorage, separado
     da base, chaveado pelo código do cliente.
   - Confirmações usam um modal próprio (o confirm() nativo é bloqueado
     em alguns previews/iframes, o que fazia o botão "não funcionar").
   ================================================================ */

(function () {
  "use strict";

  const CLIENTES = Array.isArray(window.CLIENTES) ? window.CLIENTES : [];

  /* ================================================================
     1) ARMAZENAMENTO À PROVA DE FALHAS
     Em iframes restritos o acesso ao localStorage pode lançar erro.
     Detectamos isso uma vez; se indisponível, caímos para memória
     (a sessão funciona, mas avisamos que não persiste) e exibimos
     o banner de aviso.
     ================================================================ */
  const STORE_KEY = "omni_desconto15_v1";
  let memoria = {};            // fallback em memória
  let persistenciaOk = false;

  (function testarStorage() {
    try {
      const t = "__omni_test__";
      localStorage.setItem(t, "1");
      localStorage.removeItem(t);
      persistenciaOk = true;
    } catch (e) {
      persistenciaOk = false;
    }
  })();

  function lerUsos() {
    if (!persistenciaOk) return memoria;
    try { return JSON.parse(localStorage.getItem(STORE_KEY)) || {}; }
    catch (e) { return {}; }
  }
  function salvarUsos(obj) {
    if (!persistenciaOk) { memoria = obj; return; }
    try { localStorage.setItem(STORE_KEY, JSON.stringify(obj)); }
    catch (e) { persistenciaOk = false; memoria = obj; mostrarAvisoStore(); }
  }

  /* ================================================================
     2) ÍNDICE DE BUSCA
     Map cod -> cliente (busca O(1)) + campo normalizado p/ nome.
     ================================================================ */
  const porCodigo = new Map();
  function normalizar(t) {
    return (t || "").toString().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().trim();
  }
  CLIENTES.forEach(function (c) {
    c._n = normalizar(c.nome);
    porCodigo.set(c.cod, c);
  });

  /* ================================================================
     3) ELEMENTOS E HELPERS
     ================================================================ */
  const $ = function (id) { return document.getElementById(id); };
  const $busca = $("busca");
  const $result = $("resultado");
  const $stats = $("stats");
  const $painel = $("painelUsados");
  const $toast = $("toast");
  let painelAberto = false;

  function toast(msg) {
    $toast.textContent = msg;
    $toast.classList.add("show");
    clearTimeout(toast._t);
    toast._t = setTimeout(function () { $toast.classList.remove("show"); }, 2200);
  }
  function esc(s) {
    return (s || "").replace(/[&<>"]/g, function (ch) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch];
    });
  }
  function carimboBR(d) {
    const p = function (n) { return String(n).padStart(2, "0"); };
    return p(d.getDate()) + "/" + p(d.getMonth() + 1) + "/" + d.getFullYear() +
           " " + p(d.getHours()) + ":" + p(d.getMinutes());
  }

  /* ================================================================
     4) MODAL DE CONFIRMAÇÃO PRÓPRIO
     Retorna uma Promise<boolean>. Funciona em qualquer contexto,
     inclusive onde o confirm() nativo é bloqueado.
     ================================================================ */
  function confirmar(titulo, msg, textoConfirmar) {
    return new Promise(function (resolve) {
      const overlay = $("modal");
      $("modalTitulo").textContent = titulo;
      $("modalMsg").textContent = msg;
      $("modalConfirmar").textContent = textoConfirmar || "Confirmar";
      overlay.hidden = false;

      function fechar(valor) {
        overlay.hidden = true;
        $("modalConfirmar").onclick = null;
        $("modalCancelar").onclick = null;
        overlay.onclick = null;
        document.onkeydown = null;
        resolve(valor);
      }
      $("modalConfirmar").onclick = function () { fechar(true); };
      $("modalCancelar").onclick = function () { fechar(false); };
      overlay.onclick = function (e) { if (e.target === overlay) fechar(false); };
      document.onkeydown = function (e) { if (e.key === "Escape") fechar(false); };
      $("modalConfirmar").focus();
    });
  }

  function mostrarAvisoStore() {
    const b = $("avisoStore");
    b.hidden = false;
    b.innerHTML = "<b>Atenção:</b> este navegador está bloqueando o armazenamento local " +
      "(comum em janelas de pré-visualização ou modo anônimo). Os registros funcionam " +
      "nesta sessão, mas <b>não serão salvos ao fechar</b>. Abra a página publicada no " +
      "GitHub Pages, em uma aba normal, para que os dados persistam.";
  }

  /* ================================================================
     5) CONSULTA
     ================================================================ */
  function consultar() {
    const termo = $busca.value.trim();
    if (!termo) { $result.innerHTML = '<div class="empty">Digite um código ou nome para começar.</div>'; return; }

    if (porCodigo.has(termo)) { mostrarFicha(porCodigo.get(termo)); return; }

    const alvo = normalizar(termo);
    const achados = CLIENTES.filter(function (c) {
      return c._n.includes(alvo) || c.cod.includes(termo);
    }).slice(0, 40);

    if (achados.length === 0) {
      $result.innerHTML = '<div class="empty notfound">Nenhum cliente encontrado para <b>"' +
        esc(termo) + '"</b>.<br>Confira o código ou tente parte do nome.</div>';
    } else if (achados.length === 1) {
      mostrarFicha(achados[0]);
    } else {
      mostrarLista(achados, termo);
    }
  }

  function mostrarLista(itens, termo) {
    const usos = lerUsos();
    const linhas = itens.map(function (c) {
      const usado = !!usos[c.cod];
      return '<div class="match" data-cod="' + esc(c.cod) + '">' +
        '<div><div class="m-nome"><span class="dot ' + (usado ? "used" : "ok") + '"></span>' + esc(c.nome) + "</div>" +
        '<div class="m-sub">' + esc(c.bairro) + " · " + esc(c.cidade) + "/" + esc(c.uf) +
        (usado ? " · desconto já usado" : "") + "</div></div>" +
        '<span class="m-cod">' + esc(c.cod) + "</span></div>";
    }).join("");
    $result.innerHTML = '<div class="matches"><div class="mh">' + itens.length +
      ' cliente(s) para "' + esc(termo) + '" — toque para abrir</div>' + linhas + "</div>";
    Array.prototype.forEach.call($result.querySelectorAll(".match"), function (el) {
      el.addEventListener("click", function () { mostrarFicha(porCodigo.get(el.dataset.cod)); });
    });
  }

  function mostrarFicha(c) {
    const usos = lerUsos();
    const reg = usos[c.cod];
    const usado = !!reg;

    const statusHTML = usado
      ? '<div class="status used"><div class="s-label">Desconto</div><div class="s-value">JÁ UTILIZADO</div>' +
        '<div class="s-date">em ' + esc(reg.dataBR) + "</div></div>"
      : '<div class="status ok"><div class="s-label">Desconto</div><div class="s-value">DISPONÍVEL</div>' +
        '<div class="s-date">não utilizado</div></div>';

    const acoes = usado
      ? '<button class="btn btn-mark" disabled>Desconto já registrado</button>' +
        '<button class="btn btn-revert" id="btnRevert">Estornar</button>'
      : '<button class="btn btn-mark" id="btnMark">Marcar desconto utilizado</button>';

    const compra = c.compra ? "<div>Última compra: <b>" + esc(c.compra) + "</b></div>" : "";

    $result.innerHTML = '<div class="card"><div class="card-top"><div>' +
      '<div class="cod-line">Código ' + esc(c.cod) + "</div>" +
      '<h2 class="nome">' + esc(c.nome) + "</h2>" +
      '<div class="meta"><div>' + esc(c.rua) + "</div>" +
      "<div><b>" + esc(c.bairro) + "</b> · " + esc(c.cidade) + "/" + esc(c.uf) + "</div>" +
      "<div>Contato: <b>" + (esc(c.contato) || "—") + "</b></div>" + compra +
      "</div></div>" + statusHTML + "</div>" +
      '<div class="card-actions">' + acoes + "</div></div>";

    const bMark = $("btnMark");
    if (bMark) bMark.addEventListener("click", function () { marcar(c); });
    const bRev = $("btnRevert");
    if (bRev) bRev.addEventListener("click", function () { estornar(c); });
  }

  /* ================================================================
     6) MARCAR / ESTORNAR  (com modal e trava anti-duplicidade)
     ================================================================ */
  function marcar(c) {
    // Relê o estado antes de gravar: impede duplicidade mesmo se a
    // ficha estiver aberta há tempo ou outra aba já tiver marcado.
    if (lerUsos()[c.cod]) {
      toast("Este desconto já constava como utilizado.");
      mostrarFicha(c); atualizarStats(); return;
    }
    confirmar("Confirmar desconto", "Registrar uso do desconto de 15% para:\n\n" +
      c.nome + "\n(código " + c.cod + ")?", "Marcar como usado").then(function (ok) {
      if (!ok) return;
      const usos = lerUsos();
      if (usos[c.cod]) { toast("Este desconto já constava como utilizado."); mostrarFicha(c); return; }
      const agora = new Date();
      usos[c.cod] = { data: agora.toISOString(), dataBR: carimboBR(agora) };
      salvarUsos(usos);
      toast(persistenciaOk ? "Desconto registrado." : "Registrado nesta sessão (não persistente).");
      mostrarFicha(c);
      atualizarStats();
      if (painelAberto) renderUsados();
    });
  }

  function estornar(c) {
    confirmar("Estornar desconto", "Desfazer o uso do desconto de:\n\n" + c.nome +
      "\n(código " + c.cod + ")?\n\nO cliente voltará a ficar com desconto DISPONÍVEL.",
      "Estornar").then(function (ok) {
      if (!ok) return;
      const usos = lerUsos();
      delete usos[c.cod];
      salvarUsos(usos);
      toast("Uso do desconto estornado.");
      mostrarFicha(c);
      atualizarStats();
      if (painelAberto) renderUsados();
    });
  }

  /* ================================================================
     7) ESTATÍSTICAS, PAINEL E BACKUP
     ================================================================ */
  function atualizarStats() {
    const usados = Object.keys(lerUsos()).length;
    $stats.innerHTML = "Base: <b>" + CLIENTES.length.toLocaleString("pt-BR") +
      "</b> clientes · Descontos usados: <b>" + usados + "</b>";
  }

  function renderUsados() {
    const usos = lerUsos();
    const cods = Object.keys(usos).sort(function (a, b) {
      return new Date(usos[b].data) - new Date(usos[a].data);
    });
    if (cods.length === 0) {
      $painel.innerHTML = '<div class="empty">Nenhum desconto utilizado até o momento.' +
        '<br><br><button class="btn btn-mini btn-line" id="btnImport">Restaurar backup (.json)</button></div>';
      $("btnImport").addEventListener("click", importarBackup);
      return;
    }
    const linhas = cods.map(function (cod) {
      const c = porCodigo.get(cod);
      return '<div class="urow"><div><span class="un">' +
        esc(c ? c.nome : "(código " + cod + ")") + '</span> <span class="m-cod">' + esc(cod) + "</span></div>" +
        '<div class="ud">' + esc(usos[cod].dataBR) + "</div></div>";
    }).join("");
    $painel.innerHTML = '<div class="used-list"><div class="uh">' +
      "<strong>" + cods.length + " desconto(s) utilizado(s)</strong>" +
      '<div class="uh-btns">' +
      '<button class="btn btn-mini btn-dark" id="btnCsv">Exportar CSV</button>' +
      '<button class="btn btn-mini btn-line" id="btnBackup">Backup .json</button>' +
      '<button class="btn btn-mini btn-line" id="btnImport">Restaurar</button>' +
      "</div></div>" + linhas + "</div>";
    $("btnCsv").addEventListener("click", exportarCSV);
    $("btnBackup").addEventListener("click", exportarBackup);
    $("btnImport").addEventListener("click", importarBackup);
  }

  function baixar(nome, conteudo, tipo) {
    const blob = new Blob([conteudo], { type: tipo });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = nome; a.click();
    URL.revokeObjectURL(url);
  }

  function exportarCSV() {
    const usos = lerUsos();
    const cods = Object.keys(usos).sort(function (a, b) { return new Date(usos[b].data) - new Date(usos[a].data); });
    const linhas = [["Codigo", "Cliente", "Bairro", "Cidade", "UF", "Contato", "Desconto usado em"]];
    cods.forEach(function (cod) {
      const c = porCodigo.get(cod) || {};
      linhas.push([cod, c.nome || "", c.bairro || "", c.cidade || "", c.uf || "", c.contato || "", usos[cod].dataBR]);
    });
    const csv = linhas.map(function (l) {
      return l.map(function (v) { return '"' + String(v).replace(/"/g, '""') + '"'; }).join(";");
    }).join("\r\n");
    baixar("descontos_utilizados.csv", "\ufeff" + csv, "text/csv;charset=utf-8;"); // BOM p/ Excel
  }

  // Backup/restauração do estado — permite mover os registros entre
  // máquinas, já que o LocalStorage é por navegador.
  function exportarBackup() {
    baixar("backup_descontos.json", JSON.stringify(lerUsos(), null, 2), "application/json");
    toast("Backup gerado.");
  }
  function importarBackup() {
    const input = document.createElement("input");
    input.type = "file"; input.accept = ".json,application/json";
    input.onchange = function () {
      const f = input.files[0]; if (!f) return;
      const fr = new FileReader();
      fr.onload = function () {
        try {
          const dados = JSON.parse(fr.result);
          confirmar("Restaurar backup", "Isto vai MESCLAR " + Object.keys(dados).length +
            " registro(s) do arquivo com os atuais. Continuar?", "Restaurar").then(function (ok) {
            if (!ok) return;
            const atual = lerUsos();
            Object.keys(dados).forEach(function (k) { atual[k] = dados[k]; });
            salvarUsos(atual);
            toast("Backup restaurado.");
            atualizarStats(); renderUsados();
          });
        } catch (e) { toast("Arquivo inválido."); }
      };
      fr.readAsText(f);
    };
    input.click();
  }

  /* ================================================================
     8) EVENTOS / INÍCIO
     ================================================================ */
  $("btnConsultar").addEventListener("click", consultar);
  $busca.addEventListener("keydown", function (e) { if (e.key === "Enter") consultar(); });
  $("btnVerUsados").addEventListener("click", function () {
    painelAberto = !painelAberto;
    this.textContent = painelAberto ? "Ocultar descontos utilizados" : "Ver descontos utilizados";
    if (painelAberto) renderUsados(); else $painel.innerHTML = "";
  });

  if (!persistenciaOk) mostrarAvisoStore();
  if (CLIENTES.length === 0) {
    $result.innerHTML = '<div class="empty notfound">Base de clientes não carregada. ' +
      "Confirme que <b>data/clientes.js</b> está presente.</div>";
  }
  atualizarStats();
  $busca.focus();
})();
