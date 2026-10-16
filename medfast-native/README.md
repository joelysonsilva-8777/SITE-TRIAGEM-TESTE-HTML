# MedFast · React Native

Versão nativa do MedFast, recriada com **React Native, Expo SDK 57, Expo Router e TypeScript**. O projeto é independente e fica na pasta `medfast-native`; o site HTML original continua na pasta acima.

## Executar

Requisito: Node.js 24 e npm.

```powershell
cd "D:\HTML SPEED\medfast-native"
npm install
npm start
```

Abra o QR code com uma versão do Expo Go compatível com SDK 57, usando computador e celular na mesma rede. Os comandos também estão disponíveis separadamente:

```sh
npm run android
npm run ios
npm run web
```

`android` abre um emulador Android configurado; `ios` abre o simulador no macOS. No Windows, use um iPhone físico com Expo Go para conferir iOS. A interface web permite conferir o mesmo código React Native no navegador.

## Telas e recursos

| Tela         | Recursos                                                                                                                                                               |
| ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Visão geral  | Chamada editorial, fotografia original, indicadores, próximos pacientes, equipe, gráficos e atalhos.                                                                   |
| Pacientes    | Busca sem distinção de acentos, filtros, paginação, cadastro, edição, ficha, histórico, impressão e CSV.                                                               |
| Triagem      | Identificação, sinais vitais, classificação manual, profissional de enfermagem, justificativa e revisão confirmada. Emergência permite registrar atendimento imediato. |
| Fila         | Prioridade e chegada, busca, filtro por risco, chamada com profissional e local.                                                                                       |
| Atendimentos | Lista/cartões, filtros, alteração do responsável/local, evolução e conclusão com desfecho.                                                                             |
| Equipe       | Fotografias, busca, setores, disponibilidade, perfis, pacientes vinculados e escala.                                                                                   |
| Relatórios   | Períodos hoje/7/30 dias/personalizado, indicadores calculados, gráficos, registros, CSV e impressão.                                                                   |

Inclui busca global, atividade recente, perfil, unidade, ajuda e restauração confirmada dos dados de demonstração. No navegador, Ctrl/Cmd + K abre a busca e Esc fecha janelas. O botão Voltar do Android percorre a navegação. Em celulares, quatro destinos ficam na barra inferior; as sete telas também aparecem em **Mais**.

A interface segue a [identidade MedFast](../docs/IDENTIDADE-MEDFAST.md): azul `#0648D7`, verde-água `#19C7C4`, fundo `#F3F6F9`, cartões arredondados e símbolo com M, coração e estetoscópio. Poppins Regular, Medium, SemiBold e Bold são empacotadas em TTF e funcionam offline. Os componentes são `View`, `Text`, `Pressable`, `TextInput` e outros componentes React Native, sem WebView. As cores de risco clínico foram preservadas.

O nome público, ícone e esquema `medfast` foram atualizados. O identificador `com.clara.cuidados`, o esquema anterior `clara` e as chaves de armazenamento continuam compatíveis com instalações existentes.

## Dados

O primeiro acesso cria os mesmos **84 pacientes fictícios e oito profissionais** do site. `src/data/store-core.js` adapta a lógica original: validação, transições, histórico, dados iniciais e proteção contra fórmulas em CSV. O React recebe as alterações pelo `StoreProvider` e o AsyncStorage grava os snapshots em sequência.

Os dados são locais a cada instalação/origem. A instalação móvel e o site HTML não sincronizam cadastros entre si. Rascunhos de triagem ficam em memória durante a sessão, inclusive ao trocar de tela; só o registro confirmado entra no histórico persistido. A disponibilidade da equipe é manual, como no site.

CSV usa download no navegador e a folha de compartilhamento do sistema no Android/iOS. A impressão usa uma janela no navegador e `expo-print` no dispositivo. Nenhum arquivo é enviado automaticamente.

Esta é a mesma demonstração do site: sem backend, autenticação ou integração hospitalar. Use somente dados fictícios. A classificação é manual e o aplicativo não calcula risco clínico, diagnóstico ou tratamento.

## Verificar e compilar

```sh
npm run typecheck
npm run lint
npm test
npm run build
npm run test:e2e
```

`build` gera os bundles Android, iOS e web em `dist/`. Isso não gera APK/IPA: para binários instaláveis use um development build/Expo Application Services com as contas e credenciais correspondentes. `test:e2e` inicia um servidor isolado em `127.0.0.1:8093`, testa o fluxo pela versão web e grava capturas em `test-results/`. Os testes não substituem uma verificação em aparelho físico. Instale Chromium com `npx playwright install chromium`; no Windows os scripts também podem usar o Edge instalado.

```sh
npm run build:web
npm run preview
```

O preview abre em `http://localhost:8082`. O `server.cjs` da pasta original não é necessário para executar o aplicativo.

Os scripts Expo usam `.tmp/` para os temporários do Metro/Hermes e o npm usa `.cache/npm/` para downloads. Ambos ficam no disco do projeto e são ignorados pelo Git. Isso evita que a compilação ocupe a pasta temporária do disco do Windows.

Verificação de dependências: `node scripts/expo.cjs install --check`. A auditoria npm em 03/10/2026 apontou alertas altos e moderados em dependências transitivas do SDK e das ferramentas, incluindo `braces`, `node-forge` e `uuid`. Não foi aplicado `npm audit fix --force`, que propunha versões incompatíveis/anteriores de Expo e React Native. Revise `npm audit` ao atualizar o SDK antes de uma distribuição de produção.

## Organização

```text
index.ts                 Entrada do Expo Router
src/MedFastApp.tsx          Navegação, cabeçalho, menu e contexto de interface
src/app/                 Rotas e layout do Expo Router
src/screens/             Sete telas
src/components/          Componentes, gráficos, formulários e janelas
src/data/                Domínio, tipos e persistência local
src/lib/                 Formatação, CSV e impressão
src/theme.ts             Cores, tipografia e estilos compartilhados
assets/                  Fotografias e ícones locais
tests/                   Testes de domínio, persistência e fluxo da interface
```

Créditos das fotografias: [FOTOGRAFIAS.md](docs/FOTOGRAFIAS.md). A licença das fontes Poppins está em [assets/fonts/poppins-OFL.txt](assets/fonts/poppins-OFL.txt).

Referências: [inicialização com Expo](https://docs.expo.dev/more/create-expo/), [sistema de arquivos](https://docs.expo.dev/versions/latest/sdk/filesystem/), [compartilhamento](https://docs.expo.dev/versions/latest/sdk/sharing/) e [impressão](https://docs.expo.dev/versions/latest/sdk/print/).
