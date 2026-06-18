# Controle de Desconto 15% — OMNI

Sistema web de **arquivo único** (sem back-end) para atendentes consultarem o
código de um cliente e registrarem o uso do desconto de 15%. Todo o CSS, o
JavaScript e a base de clientes estão dentro do próprio `index.html`, então
funciona em qualquer um destes modos, sem configuração:

- duplo clique no `index.html` (local, `file://`);
- publicado no **GitHub Pages**.

## Funcionalidades
- Busca por **código exato** ou por **parte do nome** (ignora acentos).
- Veredito visual do desconto: `DISPONÍVEL` ou `JÁ UTILIZADO` (com data/hora).
- Botão para **marcar** o uso, com confirmação e trava contra duplicidade.
- **Estorno** para corrigir marcações por engano.
- Painel de utilizados com **exportar CSV** e **backup/restaurar (.json)**.

## Publicar no GitHub Pages
```bash
git init
git add .
git commit -m "Controle de desconto 15%"
git branch -M main
git remote add origin https://github.com/SEU_USUARIO/SEU_REPO.git
git push -u origin main
```
Depois: **Settings → Pages → Source: `main` / `/ (root)`**. Em ~1 min o site
fica em `https://SEU_USUARIO.github.io/SEU_REPO/`.

## Como os dados são guardados
O status fica no **LocalStorage do navegador**: persiste no mesmo
dispositivo/navegador, mas **não sincroniza** entre máquinas. Para mover/guardar
registros use **Backup .json** e **Restaurar** no painel de utilizados. Para um
controle compartilhado em tempo real entre vários atendentes seria necessário um
back-end leve (ex.: Supabase/Firebase) — o GitHub Pages, sozinho, é estático.

## ⚠️ Privacidade (LGPD)
O `index.html` contém nomes, endereços e telefones de clientes reais. **Use
repositório privado** — um repositório/Pages público expõe esses dados.
