# MedFast Web

Versão independente do MedFast em **React + TypeScript + Vite**, com as sete páginas, identidade visual, fotografias, fontes e fluxos da demonstração original. A interface usa componentes React e HTML semântico, navegação pelo React Router e carregamento separado por página.

A [identidade MedFast](../docs/IDENTIDADE-MEDFAST.md) usa Poppins local, azul e verde-água, símbolo com M, coração e estetoscópio e cartões arredondados. As chaves de armazenamento anteriores foram preservadas.

## Executar

Requer Node.js 24 ou superior, incluindo o suporte nativo a TypeScript utilizado nos testes.

```powershell
cd "D:\HTML SPEED\medfast-web"
npm install
npm run dev
```

Abra o endereço exibido no terminal, normalmente **http://localhost:5173**. As dependências já estão instaladas nesta cópia. `npm start` também inicia o ambiente de desenvolvimento.

```sh
npm run build
npm run preview
```

O build fica em `dist/`. O preview normalmente usa **http://localhost:4173**; se a porta estiver ocupada, o Vite informa outra disponível. Para usar no celular na mesma rede, execute `npm run dev -- --host 0.0.0.0` e abra o endereço de rede exibido pelo Vite.

## Páginas e recursos

| Rota            | Conteúdo                                                                                      |
| --------------- | --------------------------------------------------------------------------------------------- |
| `/`             | Visão geral, acolhimento, indicadores, fila, equipe e gráficos                                |
| `/pacientes`    | Cadastro e edição, busca sem distinção de acentos, filtros, paginação, ficha, histórico e CSV |
| `/triagem`      | Identificação, avaliação, sinais vitais, classificação manual, revisão e encaminhamento       |
| `/fila`         | Priorização por classificação e chegada, filtros e chamada com profissional e sala            |
| `/atendimentos` | Cartões ou lista, atribuição, evolução, finalização e consulta de atendimentos concluídos     |
| `/equipe`       | Diretório com fotos, filtros, disponibilidade, perfis e escala                                |
| `/relatorios`   | Períodos predefinidos e personalizados, indicadores, gráficos, tabelas, CSV e impressão       |

Busca global pelo cabeçalho ou **Ctrl/⌘ + K**, atividades recentes, perfil, unidade, ajuda e restauração dos dados completam a navegação. Os diálogos têm foco controlado e fechamento por Escape. Gráficos oferecem tabelas equivalentes; cores de risco são acompanhadas de textos. O layout adapta-se a desktop, tablet e celular.

## Dados e persistência

- São **84 pacientes e 8 profissionais fictícios** no primeiro acesso. As datas de exemplo são relativas ao dia da inicialização.
- Os dados ficam no `localStorage`, chave `clara:web:store:v1`, independente da versão HTML e do aplicativo nativo. Alterações se propagam entre abas da mesma origem.
- Rascunhos de triagem ficam no `sessionStorage`, por paciente, e sobrevivem à navegação e ao recarregamento da mesma aba.
- Caso o navegador bloqueie o armazenamento, o app mantém a sessão em memória e exibe um aviso. Limpar os dados do navegador apaga os registros.
- A classificação é escolhida pelo profissional; o aplicativo não calcula diagnósticos nem decide condutas. Emergência permite encaminhamento direto com responsável e sala.
- O CSV usa UTF-8 com BOM, separador `;`, aspas escapadas e neutralização de fórmulas de planilha.
- Os indicadores de relatório consideram pacientes pela data de chegada. O gráfico conta entradas e conclusões pelas respectivas datas. Médias usam apenas horários registrados.
- A impressão do relatório inclui **todos os registros filtrados**, inclusive os de outras páginas da tabela. A ficha imprime apenas o paciente aberto.

Esta entrega é um frontend demonstrativo: não inclui autenticação, API, banco de dados, controle de acesso, auditoria de servidor ou integrações clínicas. Os registros locais não são compartilhados entre dispositivos. Para uso com dados reais, esses serviços precisam ser implementados e validados.

## Organização

```text
src/
  components/   Shell, formulários, diálogos, tabelas, gráficos e elementos comuns
  data/         Tipos, regras do domínio e conexão com o armazenamento local
  lib/          Formatação, cálculos, rascunhos e constantes dos fluxos
  pages/        As sete páginas React
  styles/       Estilos da identidade MedFast e componentes da versão web
public/assets/  Fotografias e fontes locais com suas licenças
tests/          Testes de domínio, indicadores e fluxos no navegador
docs/           Créditos das fotografias e notas de arquitetura
```

O núcleo de domínio reutiliza as regras da aplicação original, adaptadas para módulos ES, com uma interface TypeScript. A camada React não depende de arquivos fora desta pasta.

## Verificar

```sh
npm run lint          # Oxlint, sem avisos
npm run typecheck     # TypeScript estrito
npm test              # Domínio e indicadores
npm run build         # Bundle de produção
npm run check         # Todos os itens acima
npm run test:e2e      # Playwright: fluxos, acessibilidade e responsividade
```

Os testes de navegador compilam o projeto e verificam o build de produção no servidor de preview. Usam Microsoft Edge no Windows e Chromium nos outros sistemas. Para instalar e usar Chromium explicitamente:

```powershell
npx playwright install chromium
$env:PLAYWRIGHT_CHANNEL = "chromium"
npm run test:e2e
```

No Linux de integração contínua, use `npx playwright install --with-deps chromium` antes dos testes. O servidor de teste usa `127.0.0.1:5178`. Capturas e rastros de falhas ficam em `test-results/`. Os perfis temporários de navegador e o cache do npm ficam em `.tmp/` e `.cache/`, dentro do projeto.

## Hospedagem

Publique o conteúdo de `dist/` em uma hospedagem estática com fallback de rotas para `index.html`. Há uma configuração `vercel.json` pronta; na Vercel, selecione `medfast-web` como diretório raiz. Nenhuma publicação foi realizada automaticamente.

Fontes e imagens são servidas localmente. Veja os [créditos das fotografias](docs/FOTOGRAFIAS.md); as licenças das fontes acompanham os arquivos em `public/assets/fonts/`.

Referências técnicas: [React](https://react.dev/), [Vite](https://vite.dev/guide/), [React Router](https://reactrouter.com/start/declarative/installation) e [Playwright](https://playwright.dev/).
