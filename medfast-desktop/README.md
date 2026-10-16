# MedFast para Windows

Aplicativo React + Electron com o visual e as funcionalidades do MedFast web: visão geral, pacientes, triagem, fila, atendimentos, equipe, relatórios, impressão e CSV. Inclui armazenamento offline, sincronização Firebase e backup com senha. Fontes, imagens e interface estão no pacote e funcionam sem internet.

A versão 1.1.0 aplica a [identidade MedFast](../docs/IDENTIDADE-MEDFAST.md), com Poppins local, azul e verde-água, novo logotipo e ícones. O diretório de dados e o ID do instalador permanecem compatíveis com a versão Clara. O login técnico já definido também foi preservado.

## Abrir

Na pasta `release`:

- **`MedFast-Instalador-1.1.0-x64.exe`**: instala com escolha de pasta e atalhos.
- **`MedFast-Portatil-1.1.0-x64.exe`**: abre sem instalar; a extração inicial pode demorar alguns segundos.

São executáveis para Windows de 64 bits, com tudo necessário incluído. Não é preciso instalar Node.js no computador de uso. Esta compilação não tem certificado de assinatura digital; o Windows pode mostrar um aviso de editor desconhecido.

**Ambas as versões salvam em `%APPDATA%\Clara\data\clara.sqlite`.** O executável portátil não leva os dados no pendrive: eles pertencem ao perfil do Windows. As duas versões compartilham a base quando abertas pelo mesmo usuário. A desinstalação preserva os registros.

A primeira abertura começa sem pacientes ou profissionais fictícios. Cadastre a equipe em **Equipe**, configure a unidade pelo cabeçalho e use **Receber paciente**. O trabalho local funciona antes da ativação do Firebase.

## Configuração escolhida

| Item                           | Valor                                    |
| ------------------------------ | ---------------------------------------- |
| Projeto                        | `triagem-base`                           |
| ID da unidade                  | `unidade-principal`                      |
| Login inicial do administrador | `admin@clara.local`                      |
| Senha                          | Você define ao criar a conta no Firebase |
| Configuração pública integrada | `firebase.config.json`                   |

**A conta ainda precisa ser criada. Não existe senha padrão.** Escolhi `admin@clara.local` como login técnico, conforme solicitado. Esse endereço não recebe e-mails de recuperação. Para uso definitivo, prefira um e-mail real sob seu controle; o aplicativo permite qualquer conta autorizada. As permissões são associadas ao UID, não ao nome do e-mail. Não envie chave privada nem arquivo de conta de serviço. Analytics não é utilizado.

## Ativar o Firebase

1. Abra o [projeto triagem-base no Console](https://console.firebase.google.com/project/triagem-base/overview).
2. Em **Authentication → Método de login**, habilite **E-mail/senha**. Em **Usuários → Adicionar usuário**, crie `admin@clara.local`, defina a senha e copie o **UID**.
3. Em **Firestore Database**, crie o banco **`(default)`**, edição Standard, modo nativo. Escolha a região e comece com regras restritas.
4. Em **Firestore → Regras**, cole [`firebase/firestore.rules`](firebase/firestore.rules) e clique em **Publicar**.
5. Em **Firestore → Dados**, crie a coleção `units`, documento `unidade-principal` (pode conter `name`, string, com o nome da unidade). Dentro dele, crie a coleção `members`, documento com ID **exatamente igual ao UID** copiado. Adicione:

   | Campo    | Tipo    | Valor               |
   | -------- | ------- | ------------------- |
   | `role`   | string  | `admin`             |
   | `active` | boolean | `true`              |
   | `email`  | string  | `admin@clara.local` |

   Caminho: `units/unidade-principal/members/SEU_UID`. O primeiro administrador é autorizado pelo proprietário no Console; o aplicativo não permite autoaprovação.

6. No MedFast, abra **Sincronização e backup**, confira projeto/unidade e entre com a conta criada. Os dados locais pendentes serão enviados a essa unidade. Aguarde **Tudo sincronizado** e **0 envios pendentes**.
7. Em outro computador, abra o MedFast e entre com uma conta autorizada na mesma unidade para receber os dados. Registros feitos antes do login também serão enviados, se a conta puder editar.

**As regras estão preparadas e testadas em emuladores, mas não foram publicadas no seu projeto. O acesso ao Firebase real depende dos passos acima.** Não foi criada uma conta administrativa automaticamente.

### Publicar regras e índices pelo terminal

Dentro desta pasta:

```powershell
npm ci
npx firebase login
npm run firebase:deploy
```

Esse comando publica Firestore no projeto `triagem-base`, incluindo a exclusão de índices do campo `payload` da coleção `records`. Se publicar apenas as regras pelo Console, configure essa mesma exclusão de índices para não indexar os textos e históricos. A publicação substitui as regras do projeto; revise o arquivo caso já existam outros aplicativos usando esse banco.

[`firebase/storage.rules`](firebase/storage.rules) nega acesso ao Storage. Esta versão não tem anexos e não precisa habilitar o Storage. Se habilitá-lo, publique a proteção com `npm run firebase:deploy:storage`.

### Outros usuários

Crie a conta em Authentication e cadastre seu UID em `members` da mesma unidade:

| Perfil   | Permissão                                                                                      |
| -------- | ---------------------------------------------------------------------------------------------- |
| `admin`  | Ler e editar; alterar a unidade; administrar membros pelas ferramentas autorizadas do Firebase |
| `editor` | Ler e registrar pacientes, equipe e atendimentos                                               |
| `viewer` | Consultar; não enviar alterações                                                               |

Use `active: false` para revogar acesso remoto. A revogação é verificada ao reconectar; um computador offline mantém a cópia que já recebeu. A gestão de contas é feita pelo Console. O modo local sem login confia no acesso ao perfil do Windows; Firebase controla o acesso remoto, não bloqueia a abertura da cópia local.

## Offline e sincronização

- Cada gravação confirmada salva os dados e a fila de envio juntos, em transação SQLite. A confirmação na tela acontece depois da gravação local.
- Registros, equipe, histórico, preferências e rascunhos sobrevivem ao fechamento e à reabertura.
- Com o aplicativo aberto, há tentativas após alterações, ao recuperar a conexão e a cada 30 segundos. Falhas recebem espera crescente, até 5 minutos. **Sincronizar agora** antecipa uma tentativa.
- Fechar o aplicativo preserva a fila; os envios continuam na próxima abertura. Não há serviço rodando com o aplicativo fechado.
- Um envio só sai da fila após confirmação do servidor. Recibos evitam duplicação quando a conexão cai depois da gravação remota.
- Alterações concorrentes no mesmo registro geram conflito visível, com comparação das duas versões. A escolha é manual; ambas ficam preservadas no histórico local de resolução e nos backups. Não há fusão automática de campos.
- Rascunhos de triagem são locais e entram no backup. A triagem concluída é sincronizada.

Após o primeiro login autorizado, o banco fica vinculado ao projeto e à unidade. Alterar o arquivo de configuração não permite enviar esse banco a outra unidade.

## Backup e recuperação

Em **Sincronização e backup**, informe e confirme uma senha com pelo menos 12 caracteres e clique em **Criar backup**. Salve o `.medfast-backup` fora do computador. Ele inclui registros, fila pendente, conflitos e rascunhos, protegido com AES-256-GCM. Não inclui a sessão Firebase. Guarde a senha: não há recuperação dela.

Backups antigos com a extensão `.clara-backup` também continuam aceitos.

Em outro computador, abra uma instalação vazia, informe a senha e use **Selecionar e restaurar**. Faça login para retomar os envios. A restauração recusa instalações com pacientes, equipe ou envios locais, preservando o trabalho existente, e recusa backups de outra unidade/projeto.

Os conteúdos clínicos e tokens locais são protegidos pelo Windows DPAPI. A cópia bruta do SQLite depende do usuário/computador de origem; **use o backup com senha para transportar dados**. CSV é um relatório sem criptografia e não substitui o backup completo.

## Desenvolvimento

Requisitos: Windows x64, Node.js 24 ou superior; Java 21 para os testes dos emuladores. Essas ferramentas não são necessárias para usar os executáveis prontos.

```powershell
cd "D:\HTML SPEED\medfast-desktop"
npm ci
npm run dev
```

```powershell
npm run lint
npm run typecheck
npm test
npm run test:firebase
npm run test:desktop
npm run dist:win
```

`npm start` compila e abre o aplicativo. `npm run dev` usa a porta 5183. `dist:win` gera os executáveis em `release`. O teste desktop usa base isolada em `.tmp`; não altera seus registros. Para testar o executável empacotado:

```powershell
$env:MEDFAST_PACKAGED_TEST = '1'
npx playwright test
Remove-Item Env:MEDFAST_PACKAGED_TEST
```

O empacotamento confere os arquivos nativos e os recursos visuais contra os originais e gera `release/SHA256SUMS.txt`. Para repetir apenas essa conferência, use `npm run verify:package`. Mantenha os arquivos de código sem edição durante a geração dos executáveis.

Os emuladores usam exclusivamente `demo-medfast-desktop`, Auth na porta 9193 e Firestore na 8183, sem envio ao projeto real. Caches e temporários ficam em `.cache` e `.tmp`. Regenere o ícone com `powershell -File scripts/icon.ps1`.

## Estrutura e limites

- `src/`: interface, domínio, componentes e estilos.
- `electron/`: banco, proteção local, IPC, autenticação e sincronização REST.
- `firebase/`: regras e índices.
- `tests/`: persistência, falhas, regras e interface nativa.
- [`docs/ARQUITETURA.md`](docs/ARQUITETURA.md): protocolo e decisões técnicas.
- [`docs/FOTOGRAFIAS.md`](docs/FOTOGRAFIAS.md): créditos visuais.

A consulta de sincronização percorre os registros da unidade por páginas; ainda não é incremental. O custo de leituras cresce com os registros e computadores conectados. O domínio herdado limita a memória a 10 mil pacientes e 50 mil eventos; planeje arquivamento antes desse volume. Recibos remotos não expiram automaticamente. Não há anexos, atualização automática nem importação automática das versões web/native.

A classificação é escolhida pelo profissional; o aplicativo não calcula diagnósticos ou decisões clínicas. Ativação de produção, assinatura digital e validação operacional dependem do responsável pela unidade.
