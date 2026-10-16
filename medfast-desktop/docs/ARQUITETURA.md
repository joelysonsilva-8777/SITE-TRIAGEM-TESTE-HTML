# Arquitetura do MedFast Desktop

## Interface

`App.tsx` define as rotas e carrega as páginas sob demanda. `Shell.tsx` concentra cabeçalho, navegação, contexto da página e rodapé. Componentes compartilhados mantêm campos, botões, indicadores, tabelas e diálogos consistentes. A interface é React DOM, sem iframe ou dependência da implementação HTML original.

`FeedbackProvider` coordena os diálogos e as mensagens de confirmação. Os diálogos usam o elemento HTML `dialog`, foco inicial nativo, foco restaurado ao fechar, suporte a Escape e bloqueio de rolagem do documento. As tabelas permanecem utilizáveis em telas pequenas por rolagem horizontal local.

## Domínio

`data/store-core.js` contém validações, transições e exportação CSV. O gerador de exemplos foi removido desta versão. A primeira instalação recebe uma base vazia explícita. Se os dados locais não puderem ser validados, o núcleo lança um erro e preserva a base existente, sem substituí-la. `types.ts` descreve pacientes, profissionais, sinais vitais e eventos.

O percurso permitido é `triage → waiting → attending → finished`. A classificação vermelha também permite `triage → attending`. Alterações inválidas não modificam o estado, e leitores recebem cópias. Os formulários validam informações obrigatórias, faixa dos sinais vitais, responsáveis e confirmações antes de chamar o domínio.

## Armazenamento

O processo principal do Electron é o único proprietário do SQLite, com WAL e `synchronous=FULL`. Cada comando passa pelo domínio e grava snapshot, registros e operações de envio em uma transação. A interface confirma apenas após a resposta dessa gravação. `updateWithEvent` grava a alteração do paciente e seu evento juntos. `data/store.ts` integra o estado recebido por IPC ao React com `useSyncExternalStore`.

`safeStorage` usa Windows DPAPI para proteger os conteúdos clínicos, preferências, rascunhos, conflitos e tokens. Tipos, identificadores, versões e metadados operacionais das tabelas não são criptografados. A base bruta depende do perfil de origem. O aplicativo não cria um banco desprotegido se DPAPI estiver indisponível.

Rascunhos de triagem ficam no SQLite, separados por paciente, e são removidos ao concluir a triagem. Não são sincronizados; entram nos backups. Não há restauração de demonstração nem limpeza automática da base.

## Isolamento do Electron

O protocolo `clara://app` serve os arquivos locais. O renderer usa sandbox, `contextIsolation`, `nodeIntegration: false`, CSP e bloqueio de navegação externa. A ponte expõe somente comandos específicos; cada chamada verifica remetente, frame, protocolo e host. O estado enviado à interface não contém tokens. Impressão e seleção de arquivos usam APIs nativas.

## Protocolo de sincronização

1. Cada registro alterado recebe operação UUID e `baseVersion`. Edições locais sucessivas são agrupadas por registro.
2. O login Firebase REST fornece ID token e refresh token, protegidos no banco. A senha não é persistida. Antes de sincronizar, verifica a associação ativa da conta à unidade.
3. A primeira associação autorizada vincula o banco ao projeto/unidade. Outro vínculo é recusado.
4. Antes de gravar, consulta `units/{unit}/operations/{opId}`. Um recibo existente confirma uma gravação anterior cujo retorno pode ter sido perdido.
5. Compara a versão do registro remoto com a base local. Divergências são preservadas como conflito.
6. O commit Firestore grava registro e recibo juntos, com horário de servidor e precondição `updateTime` ou `exists: false`. Uma gravação concorrente entre leitura e commit é detectada.
7. A confirmação remove somente a operação correspondente. Se houve uma edição local durante a requisição, ela é preservada e sua versão base é atualizada.
8. Depois de enviar, consulta os registros por páginas. Dados locais alterados não são substituídos silenciosamente.

Há uma sincronização por vez, até 150 envios por rodada. O ciclo automático ocorre a cada 30 segundos, com espera progressiva após falhas, até 5 minutos. O envio continua em rodadas seguintes. Fechar o aplicativo interrompe a execução e preserva a fila.

Conflitos exigem escolha de uma versão completa; ambas são arquivadas localmente e no backup. Não há fusão de campos. Uma nova concorrência pode gerar outro conflito. As regras impedem regredir etapas: uma versão local de etapa anterior pode ser recusada; nesse caso, use a remota e complemente os dados como evolução. O arquivo de decisões não tem tela de consulta própria nesta versão.

A consulta remota ainda percorre a coleção inteira. O custo cresce com registros e computadores conectados; uma consulta incremental é uma evolução futura.

## Regras Firebase

Dados ficam em `units/{unit}/records/{kind}_{id}`; membros em `members/{uid}`; recibos em `operations/{opId}`. Exige associação ativa e papel `admin`, `editor` ou `viewer`, valida campos, versões, limites, autoria e timestamps de servidor. Somente admin altera metadados da unidade e membros. Eventos e recibos não permitem alteração/exclusão; registros não permitem exclusão.

O primeiro administrador é criado pelo proprietário no Console; não existe autoaprovação. O membro pode consultar seu próprio documento de autorização para diagnóstico. Regras aceitam várias etapas válidas concluídas offline em um envio, com os horários exigidos. Storage permanece negado, pois não há anexos. `payload` fica excluído dos índices. A chave pública não concede acesso por si só.

Firebase controla sincronização remota; o uso local sem login confia no perfil do Windows. Revogação exige reconexão e não apaga cópias locais previamente recebidas.

## Backup

Exporta registros, fila, rascunhos, conflitos, decisões e vínculo, sem tokens. Usa scrypt, salt aleatório e AES-256-GCM com nonce aleatório. Restaura em transação numa instalação vazia, para o mesmo vínculo, gera nova identidade de computador e preserva IDs de operação para evitar reenvios duplicados.

## Indicadores

`lib/analytics.ts` calcula períodos, agrupamentos e médias. O limite de 24 grupos mantém intervalos longos legíveis e evita criar milhares de elementos no gráfico. Intervalos de um dia usam faixas de três horas. Contagens respeitam o calendário local e médias excluem pares de horários incompletos.

## Validação

Os testes locais verificam reinício, falha simulada de disco, confirmação perdida, edição durante envio, concorrência, resolução, backup, permissões e identificação única. Os emuladores oficiais verificam regras, papéis, negação de autoaprovação, formato/versão, imutabilidade e o cliente REST com duas bases concorrentes. Playwright percorre a interface Electron, cadastra equipe/paciente, reabre o processo com rascunho, conclui a triagem e verifica persistência e isolamento. Pode executar também sobre `release/win-unpacked/MedFast.exe`.

Os testes usam diretórios isolados e o projeto fictício `demo-medfast-desktop`, sem alterar dados do usuário ou o projeto Firebase real.

## Referências oficiais

- [Isolamento no Electron](https://www.electronjs.org/docs/latest/tutorial/context-isolation)
- [safeStorage](https://www.electronjs.org/docs/latest/api/safe-storage)
- [Firebase Authentication REST](https://firebase.google.com/docs/reference/rest/auth)
- [Commit Firestore REST](https://firebase.google.com/docs/firestore/reference/rest/v1/projects.databases.documents/commit)
- [Transações](https://firebase.google.com/docs/firestore/manage-data/transactions)
- [Testes de regras](https://firebase.google.com/docs/rules/unit-tests)
