# Clara — pesquisa e decisões de UX

A Clara explora como uma interface pode tornar visíveis a identificação do paciente, a etapa do atendimento e a próxima ação. O estudo foi documental, com fontes primárias de enfermagem, organização de atendimento e acessibilidade. Não foram realizados entrevistas, observação em hospitais, estudos com pacientes ou validação clínica.

## Referências e aplicação

### Responsabilidade pela classificação

A Resolução Cofen nº 661/2021 descreve a classificação de risco, no âmbito da equipe de enfermagem, como atribuição privativa do enfermeiro e exige capacitação específica no protocolo adotado pela instituição. A decisão de produto decorrente foi manter a classificação como uma escolha explícita do profissional, separada do registro dos sinais vitais. O aplicativo não atribui risco automaticamente nem reproduz um algoritmo clínico. [Fonte: Cofen, Resolução nº 661/2021, art. 1º](https://www.cofen.gov.br/resolucao-cofen-no-661-2021/).

### Continuidade do atendimento

O manual do e-SUS APS apresenta identificação do cidadão, escuta inicial, lista de atendimentos, busca, filtros e ordenação por chegada e classificação. Esses elementos orientaram a separação entre cadastro, triagem, fila e atendimento, com uma ficha acessível durante o fluxo. Os filtros devem indicar o recorte visível para evitar que uma lista filtrada seja confundida com a totalidade da unidade. **É uma referência de organização da atenção primária; não é um protocolo clínico de urgência hospitalar.** [Fonte: Ministério da Saúde, Manual do e-SUS APS, capítulo 6](https://sisaps.saude.gov.br/sistemas/esusaps/docs/manual/PEC/PEC_06_atendimentos/).

### Acessibilidade

As WCAG 2.2 orientaram o uso de controles HTML semânticos, rótulos de formulário, navegação por teclado, foco perceptível e mensagens de estado. Na Clara, botões de ícone recebem nome acessível, há um atalho para o conteúdo principal e as janelas usam o elemento `dialog`. Essas escolhas precisam ser verificadas em conjunto com teclado, zoom e tecnologias assistivas; a referência às diretrizes **não constitui declaração de conformidade integral com WCAG**. [Fonte: W3C, WCAG 2.2](https://www.w3.org/TR/WCAG22/).

As categorias de risco combinam cores com nomes legíveis. Situações como “Em atendimento” e “Finalizado” também recebem texto. A intenção é que prioridade e andamento permaneçam compreensíveis sem distinguir cores. [Fonte: W3C, Understanding Use of Color, critério 1.4.1](https://www.w3.org/WAI/WCAG22/Understanding/use-of-color.html).

## Estrutura da experiência

| Necessidade | Decisão de interface | Resultado esperado |
| --- | --- | --- |
| Identificar a pessoa certa | Nome, código de cadastro, idade calculada e acesso à ficha | Conferir identidade antes de agir. |
| Entender a etapa atual | Estados distintos para triagem, fila, atendimento e finalização | Reconhecer onde o registro está no fluxo. |
| Encontrar um cadastro | Busca por nome ou código, filtros e busca global | Reduzir a navegação repetitiva. |
| Registrar a avaliação | Formulários com rótulos, unidades e campos agrupados | Tornar o preenchimento e a revisão mais claros. |
| Reconhecer prioridade | Classificação textual e cor complementar | Ler a prioridade sem depender apenas da cor. |
| Chamar para atendimento | Seleção de profissional e local, seguida de confirmação | Tornar explícito o encaminhamento registrado. |
| Acompanhar mudanças | Ficha com histórico e atividade recente | Consultar a sequência do atendimento fictício. |
| Localizar as áreas do sistema | Cabeçalho institucional e navegação horizontal com seção atual indicada | Encontrar as sete áreas a partir de qualquer página. |
| Usar em telas menores | Navegação recolhível e componentes responsivos | Preservar acesso às ações fora do desktop. |

Os resultados acima são objetivos de projeto, não ganhos de produtividade medidos.

## Direção visual

As referências visuais de sites hospitalares orientaram o cabeçalho com identificação da unidade, a faixa horizontal de navegação e o uso de fotografias. A composição foi desenvolvida para as tarefas desta demonstração: uma abertura editorial na visão geral, listas e tabelas para consulta, um formulário dividido em etapas na triagem e registros de atendimento com ações próximas aos dados do paciente.

A paleta combina **petróleo `#00646d`**, branco, fundos neutros e detalhes em **âmbar**. Os componentes têm cantos de **0 a 2 px**, divisórias retas e contornos visíveis. A cor institucional aparece na navegação, nos títulos de seção e nas ações; as classificações de risco mantêm nomes, posição e contexto próprios. O âmbar aparece como detalhe de identidade e destaque de navegação, sem representar uma decisão clínica.

A **Source Sans 3** é usada nos textos, formulários, tabelas e controles. A **Source Serif 4** aparece nas chamadas editoriais. Ambas são carregadas de arquivos locais, com as licenças [Source Sans 3 — SIL OFL](../assets/fonts/sourcesans3-OFL.txt) e [Source Serif 4 — SIL OFL](../assets/fonts/sourceserif4-OFL.txt) incluídas no projeto. A hierarquia usa tamanho, peso e espaçamento para distinguir nomes, dados de apoio e ações.

As fotografias de banco mostram pessoas reais em cenas de atendimento e retratos profissionais. São recursos ilustrativos de uma instituição e de uma equipe fictícias; não identificam as pessoas dos registros e não indicam vínculo ou endosso dos modelos. Os arquivos são servidos localmente e seus créditos e licenças estão em [Fotografias do Clara](FOTOGRAFIAS.md).

A intenção de uma apresentação mais humana também orientou os textos: instruções próximas da tarefa, nomes dos pacientes em destaque, informação sobre a próxima etapa e estados vazios que indicam uma ação disponível. Essa direção é uma escolha de projeto, sem alegação de efeito clínico ou ganho de usabilidade medido. Em telas menores, a navegação horizontal se recolhe em um menu; formulários, filtros e registros se reorganizam, e tabelas mantêm rolagem na própria área quando necessário.

## Comportamento dos dados

Cada paciente possui código, identificação, queixa, classificação, situação, horários das etapas, profissional, sala, sinais vitais e histórico. Os exemplos usam pessoas e profissionais fictícios. A idade é calculada pela data de nascimento, considerando se o aniversário já ocorreu no ano.

O fluxo comum segue `triage → waiting → attending → finished`. O encaminhamento direto de `triage` para `attending` está disponível quando o profissional seleciona emergência (`red`). Essa exceção organiza a demonstração; não avalia a adequação clínica da escolha. Os horários de transição são registrados pela aplicação e as alterações inválidas são rejeitadas antes de salvar.

A fila padrão usa a prioridade registrada e, dentro da mesma prioridade, a ordem de chegada. Não há previsão de tempo de atendimento, cálculo de gravidade, prescrição ou aplicação automática de tempos máximos de um protocolo. Os indicadores devem ser lidos com o período e a população selecionados; um total filtrado não representa necessariamente todos os pacientes cadastrados.

O armazenamento fica no navegador. O estado possui versão, pode ser restaurado aos exemplos e é compartilhado entre abas da mesma origem por eventos de armazenamento. Falhas de gravação são sinalizadas; nesse caso, os dados em memória não têm garantia de sobreviver ao fechamento da página. As cópias exportadas em CSV usam aspas e proteção para células que poderiam ser interpretadas como fórmulas por planilhas.

## Como ler os relatórios

O período seleciona pacientes pela **data local de chegada**, incluindo as datas inicial e final. Todas as medidas abaixo partem dessa seleção. “Concluídos” considera a situação atual dos pacientes que chegaram no período; a finalização pode ter acontecido em outra data.

| Indicador | Cálculo |
| --- | --- |
| Entradas | Quantidade de pacientes com chegada no período. |
| Concluídos | Quantidade desses pacientes com situação `finished`. |
| Percentual concluído | Concluídos divididos por entradas, em porcentagem. |
| Espera média | Média dos intervalos válidos e não negativos entre `triagedAt` e `startedAt`, em minutos. |
| Duração média do atendimento | Média dos intervalos válidos entre `startedAt` e `finishedAt`, somente nos atendimentos finalizados. |
| Distribuição de risco | Contagem por classificação registrada, incluindo “Não classificado”. |

As médias mostram o tamanho da amostra usado no cálculo. Elas descrevem registros existentes, sem apresentar uma previsão para o próximo paciente. Não há comparação percentual inventada com períodos anteriores.

O gráfico temporal adapta a agregação: intervalos de três horas para hoje, dias para períodos de até 31 dias, intervalos de sete dias até 62 dias e meses para períodos maiores. A exportação CSV contém a lista filtrada. Esses recortes devem acompanhar a interpretação e o compartilhamento dos resultados.

## Verificação e limites

`npm test` cobre o ciclo de atendimento, persistência, coerência dos dados iniciais, validação atômica, armazenamento indisponível, sincronização entre abas e CSV. `npm run test:e2e` executa a verificação da interface no navegador. Testes automáticos e verificações de acessibilidade ajudam a encontrar defeitos; não substituem testes de usabilidade com profissionais nem uma auditoria completa de acessibilidade.

Para avaliar esta proposta em contexto real, seria necessário observar o fluxo da instituição, testar tarefas com profissionais, revisar nomenclaturas e exceções com responsáveis clínicos e implementar infraestrutura apropriada. A versão atual não tem backend, autenticação, controle de acesso por função, integração com prontuários, auditoria imutável ou proteção de dados adequada a registros clínicos reais. Nenhuma certificação clínica ou conformidade regulatória é declarada.

Referências consultadas em 20 de setembro de 2026.
