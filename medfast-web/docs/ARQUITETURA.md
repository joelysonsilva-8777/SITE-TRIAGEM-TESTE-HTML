# Arquitetura da versão web

## Interface

`App.tsx` define as rotas e carrega as páginas sob demanda. `Shell.tsx` concentra cabeçalho, navegação, contexto da página e rodapé. Componentes compartilhados mantêm campos, botões, indicadores, tabelas e diálogos consistentes. A interface é React DOM, sem iframe ou dependência da implementação HTML original.

`FeedbackProvider` coordena os diálogos e as mensagens de confirmação. Os diálogos usam o elemento HTML `dialog`, foco inicial nativo, foco restaurado ao fechar, suporte a Escape e bloqueio de rolagem do documento. As tabelas permanecem utilizáveis em telas pequenas por rolagem horizontal local.

## Domínio

`data/store-core.js` contém o estado, os dados de exemplo, validações, transições e exportação CSV. É um módulo independente do React, coberto por testes de domínio. `store-core.d.ts` define o contrato utilizado pela interface TypeScript; `types.ts` descreve pacientes, profissionais, sinais vitais e eventos.

O percurso permitido é `triage → waiting → attending → finished`. A classificação vermelha também permite `triage → attending`. Alterações inválidas não modificam o estado, e leitores recebem cópias. Os formulários validam informações obrigatórias, faixa dos sinais vitais, responsáveis e confirmações antes de chamar o domínio.

## Armazenamento

`data/store.ts` integra o núcleo ao navegador por `useSyncExternalStore`, mantendo um snapshot estável entre alterações. O evento `storage` importa snapshots válidos de outras abas sem gravá-los novamente. O armazenamento usa uma chave própria da versão React web.

Essa sincronização é local, com a última gravação prevalecendo. Ela não implementa transações concorrentes entre usuários. Um backend futuro deve fornecer identificação, autorização, validação de domínio, persistência transacional e histórico confiável; basta um serviço HTTP no lugar desta integração, preservando os componentes e tipos quando aplicável.

Rascunhos de triagem são separados por paciente no `sessionStorage`. O encerramento da triagem remove o rascunho correspondente. A restauração da demonstração requer confirmação explícita no formulário e remove os rascunhos da aba atual.

## Indicadores

`lib/analytics.ts` calcula períodos, agrupamentos e médias. O limite de 24 grupos mantém intervalos longos legíveis e evita criar milhares de elementos no gráfico. Intervalos de um dia usam faixas de três horas. Contagens respeitam o calendário local e médias excluem pares de horários incompletos.

## Validação

Os testes unitários verificam domínio, persistência, validação atômica, sincronização, falha de armazenamento, CSV e limites de datas. Os testes Playwright percorrem os fluxos pelo navegador, verificam restauração de rascunhos, atualização entre abas, saída para impressão, acessibilidade com axe e ausência de transbordamento horizontal em diferentes larguras.

Testes automatizados de acessibilidade não substituem avaliação manual com usuários e tecnologias assistivas. Os controles, rótulos, ordem de foco, navegação por teclado e alternativas textuais estão implementados para permitir essa avaliação.
