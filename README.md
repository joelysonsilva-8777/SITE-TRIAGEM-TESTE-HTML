# Clara.

Uma interface de acolhimento e gestão do cuidado, com **7 páginas em HTML, CSS e JavaScript**, navegação integrada e um fluxo completo de demonstração: cadastro → triagem → fila → atendimento → finalização.

A identidade visual reúne cabeçalho institucional, navegação horizontal, superfícies brancas, petróleo **`#00646d`**, detalhes em âmbar e cantos de **0 a 2 px**. A interface usa Source Sans 3 nos controles e textos, Source Serif 4 nas chamadas editoriais e fotografias de banco com pessoas reais. No celular, a navegação se recolhe em um menu e os componentes se reorganizam para a largura disponível.

## Abrir o projeto

Com Node.js 24 instalado, execute na pasta do projeto:

```sh
npm install
npm start
```

Acesse **[http://localhost:4173](http://localhost:4173)**. Não há etapa de compilação.

## Deploy na Vercel

O projeto está configurado como um site estático. O arquivo `vercel.json` define a instalação, o build e a pasta publicada, conforme a [documentação da Vercel](https://vercel.com/docs/project-configuration/vercel-json).

1. Envie o projeto, incluindo `package-lock.json`, `vercel.json` e `scripts/build.cjs`, para seu repositório Git.
2. Na Vercel, escolha **Add New → Project** e importe esse repositório.
3. Use como **Root Directory** a pasta que contém `package.json` e `vercel.json` (a raiz, se o repositório contém somente este projeto).
4. Confira as configurações abaixo e clique em **Deploy**.

| Configuração | Valor |
| --- | --- |
| Framework Preset | Other |
| Install Command | `npm ci --omit=dev` |
| Build Command | `npm run build` |
| Output Directory | `dist` |
| Node.js Version | `24.x` |
| Environment Variables | Nenhuma necessária |

O build usa apenas recursos nativos do Node.js e copia as sete páginas e `assets/` para `dist/`. As dependências de testes não são instaladas no deploy. O servidor `server.cjs` é usado localmente; a Vercel serve os arquivos publicados diretamente. Os links `.html` e parâmetros como `triagem.html?patient=...` são preservados. Não configure um redirecionamento geral para `index.html`, pois cada página tem seu próprio conteúdo.

Para conferir os mesmos arquivos que serão publicados:

```sh
npm ci
npm run build
npm run preview
```

Abra **[http://localhost:4173](http://localhost:4173)**. Pare qualquer `npm start` que já esteja usando essa porta antes de executar o preview. Não é necessário versionar `dist/`; a Vercel gera essa pasta em cada deploy.

Os dados continuam no `localStorage` de cada navegador. O domínio da Vercel terá uma cópia independente dos dados de localhost; domínios de preview e produção também mantêm cópias separadas.

Também é possível abrir `index.html` diretamente. O servidor local é recomendado para manter as sete páginas na mesma origem e tornar a persistência entre páginas mais previsível. Os dados de `file://` e `http://localhost:4173` são independentes.

## As sete páginas

| Página | O que você pode fazer |
| --- | --- |
| [Visão geral](index.html) | Acompanhar o movimento da unidade, a fila e os indicadores do conjunto de dados. |
| [Pacientes](pacientes.html) | Buscar, filtrar, cadastrar e editar pacientes; consultar ficha e histórico. |
| [Triagem](triagem.html) | Registrar queixa, sinais vitais, observações e a classificação escolhida pelo profissional. |
| [Fila de atendimento](fila.html) | Visualizar a prioridade registrada e chamar um paciente para um profissional e uma sala. |
| [Atendimentos](atendimentos.html) | Acompanhar os atendimentos em curso, registrar observações e finalizar. |
| [Equipe](equipe.html) | Consultar profissionais e atualizar a disponibilidade demonstrativa. |
| [Relatórios](relatorios.html) | Explorar os indicadores calculados a partir dos registros e exportar dados. |

**Experimente:** cadastre uma pessoa fictícia em Pacientes, abra sua Triagem, registre uma classificação, chame pela Fila e conclua em Atendimentos. A classificação de emergência permite o encaminhamento direto ao atendimento. Use **Ctrl/Cmd + K** para buscar um paciente e **Esc** para fechar as janelas.

## Dados e funcionamento

O primeiro acesso cria **84 pacientes fictícios** — 24 ativos e 60 finalizados — e 8 profissionais, com registros distribuídos pelos últimos sete dias. Datas e horários são gerados em relação à abertura inicial da demonstração. Indicadores, distribuições e gráficos são derivados desses registros; não são dados de um hospital real.

As alterações ficam no `localStorage` do navegador, na chave `clara:store:v1`. Recarregar a página preserva o trabalho; limpar os dados do site apaga essa cópia. Abas da mesma origem recebem atualizações de armazenamento. No perfil **Camila Martins**, escolha **Restaurar dados de demonstração** para voltar aos exemplos iniciais. Essa ação substitui as alterações locais após confirmação.

A classificação é **manual**. A aplicação não interpreta sinais vitais para calcular risco, emitir diagnóstico ou recomendar tratamento. A organização visual por prioridade não representa implementação ou certificação de um protocolo clínico. A pesquisa e as decisões de interface estão em [Pesquisa e decisões de UX](docs/PESQUISA-UX.md).

## Testes

```sh
npm test
npm run test:e2e
```

Os testes de dados verificam persistência, transições do atendimento, validação e exportação CSV. A suíte de navegador verifica os fluxos da interface. Se o Playwright solicitar a instalação do navegador, execute `npx playwright install chromium` e tente novamente.

A verificação realizada passou por **8 testes de dados**, **9 grupos de verificações de ponta a ponta** e **4 verificações adicionais**: telas de 320 a 1440 px, menu em notebook, encaminhamento de emergência, impressão e abertura direta. As sete páginas e as etapas de avaliação/revisão não apresentaram violações nas regras automáticas de acessibilidade aplicadas pelo axe. Isso não equivale a uma auditoria completa de WCAG. As capturas e os resultados são gravados em `test-results/`.

Com o servidor em execução, `node tests/edge-flows.cjs` verifica os cenários adicionais. Os testes usam um contexto de navegador isolado e não alteram os dados da sua sessão pessoal.

## Arquivos e dependências

Os estilos ficam em `assets/css/`; a persistência, os componentes compartilhados e as páginas estão separados em `assets/js/`. A aplicação não depende de frameworks ou serviços externos para funcionar. As dependências npm são utilizadas apenas para testes.

As fontes **Source Sans 3** e **Source Serif 4** são servidas localmente, em `assets/fonts/`, com suas respectivas licenças SIL Open Font License: [Source Sans 3](assets/fonts/sourcesans3-OFL.txt) e [Source Serif 4](assets/fonts/sourceserif4-OFL.txt).

As fotografias licenciadas do Pexels ficam em `assets/images/` e também são carregadas localmente. São imagens ilustrativas; as pessoas retratadas não correspondem às identidades fictícias do cadastro. Os créditos, os links originais e os detalhes da licença estão em [Fotografias do Clara](docs/FOTOGRAFIAS.md).

## Escopo da demonstração

O projeto funciona no navegador e **não possui backend, autenticação, permissões de acesso, proteção de prontuários para produção ou integração hospitalar**. O perfil e a unidade são demonstrativos. Utilize somente dados fictícios: o armazenamento local e o histórico editável não constituem um prontuário nem uma trilha de auditoria clínica. O projeto não foi validado para uso assistencial.
