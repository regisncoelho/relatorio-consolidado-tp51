# Relatório Financeiro Agregado — TP 51/2021

Página estática de transparência com os **gastos agregados** do Termo de Parceria nº 51/2021.
Publicada via **GitHub Pages**.

## O que é

Um painel de página única, em português, com seis abas:

| Aba | Conteúdo |
|---|---|
| **Visão geral** | Indicadores do período, evolução mensal com média móvel de 3 meses, composição por grupo e principais subcategorias |
| **Atividades** | Para onde o dinheiro foi: despesas por frente de trabalho do projeto e apenas as atividades-fim |
| **Custo Operacional** | O que foi adquirido (serviços, compras e pessoal) e o custo de manutenção/operação do PERD |
| **Fornecedores** | Despesas por **segmento de atuação** do fornecedor (nunca pelo nome) |
| **Tendências** | Acumulado ano a ano, mapa de calor ano × mês e variação mês a mês |
| **Detalhamento** | Abertura das categorias genéricas e metodologia de tratamento |

A aba **Custo Operacional** cruza cada atividade com **o que foi adquirido** (pessoal, serviços, compras e tributos) e mostra o **custo de operação do PERD** — gastos recorrentes de manter o parque funcionando — com a definição do que entra e do que fica de fora (investimentos e estruturação).

Interativo: clique em um mês (barra, célula do mapa de calor ou linha da tabela) para ver o detalhe,
tema claro/escuro, tooltips e layout responsivo. **Funciona offline** (sem CDN) depois de carregado.

**Filtros de período** no topo da página:

- a barra principal mostra **Todos** e os **5 anos** de execução (2022–2026);
- o botão **Busca avançada** abre o painel com **período avaliatório** (1º a 19º P.A) e **mês** (53 meses, de mai/2022 a set/2026);
- períodos sem lançamentos (ex.: 1º P.A) mostram um aviso amigável de “sem lançamentos”;
- os filtros valem para todas as abas; o mapa de calor e o acumulado por ano continuam mostrando os 5 anos,
  destacando o período selecionado.

## Estrutura

```
index.html          ← a página
css/app.css         ← estilos (tema claro/escuro responsivo)
js/app.js           ← gráficos em SVG, abas, filtros, interações
dados/dados.json    ← SOMENTE agregados (78 recortes: todos, 5 anos, 19 P.A e 53 meses)
.nojekyll           ← evita processamento do Jekyll no Pages
README.md
```

> **Importante:** este repositório contém **apenas os arquivos da interface**. A base de dados
> individual, os scripts de extração/classificação e a validação LGPD ficam na pasta local do
> responsável técnico e **não** são publicados.

## Privacidade (LGPD)

A página apresenta **exclusivamente totais agregados**:

- nenhum nome de pessoa ou fornecedor, CPF, CNPJ, número de documento, justificativa ou lançamento individual;
- fornecedores identificados apenas pelo **segmento de atuação**;
- salários e encargos sempre somados em **“Folha e encargos”**, sem abrir por pessoa;
- subcategorias/atividades muito pequenas agrupadas em **“Demais”**;
- validação automática da geração (falha se encontrar nome, CPF ou CNPJ no JSON).

## Publicar no GitHub Pages

1. Crie o repositório público **`relatorio-consolidado-tp51`** (sem README, para não conflitar).
2. Envie o conteúdo desta pasta:

   ```bash
   git remote add origin https://github.com/<seu-usuario>/relatorio-consolidado-tp51.git
   git branch -M main
   git push -u origin main
   ```

3. No repositório: **Settings → Pages → Build and deployment**
   - **Source:** *Deploy from a branch*
   - **Branch:** `main` · **pasta:** `/ (root)`
   - **Save**

A página ficará em `https://<seu-usuario>.github.io/relatorio-consolidado-tp51/`.
Cada `git push` na `main` republica automaticamente.

> Optamos por *Deploy from a branch* (em vez de workflow de Actions) justamente para manter o
> repositório com **somente** os arquivos da interface.

## Atualizar os dados

Na pasta local (fora do repositório), com a base tratada disponível:

```bash
python scripts/gera_publico.py --fonte <caminho>/gastos_lancamentos.csv
```

Isso regenera `dados/dados.json` e roda a validação LGPD. Depois:

```bash
git add dados/dados.json
git commit -m "Atualiza dados de <mês/ano>"
git push
```

A publicação é automática no push.

## Pré-visualizar localmente

O `fetch` do JSON exige HTTP (abrir por `file://` é bloqueado pelo navegador):

```bash
python -m http.server 8765
# abra http://localhost:8765
```

## Fonte dos dados

Relatórios financeiros oficiais do Termo de Parceria (Diário de Entradas e Saídas), consolidados
por período avaliatório. **6.190 lançamentos**, de **30/05/2022 a 30/09/2026**.

> Totais conferidos: despesas **R$ 21.001.226,35** · repasses do OEP **R$ 23.932.512,74**.
