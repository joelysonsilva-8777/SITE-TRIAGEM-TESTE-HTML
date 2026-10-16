# Validação da entrega MedFast 1.1.0

O EXE portátil também foi aberto diretamente: iniciou e criou sua base local em um diretório isolado de teste.

Verificado em 16/10/2026 no Windows x64, com Node.js 24.15.0 e Electron 44.8.0 (Node embarcado 24.22.0).

| Verificação                                                     | Resultado                     |
| --------------------------------------------------------------- | ----------------------------- |
| Compilação TypeScript + Vite                                    | Aprovada                      |
| Lint sem avisos                                                 | Aprovado                      |
| Persistência, falhas, backup e conflitos                        | 10 testes aprovados           |
| Regras e integração Firebase em emuladores                      | 7 testes aprovados            |
| Interface no Electron de desenvolvimento                        | Aprovada                      |
| Mesmo fluxo no `release/win-unpacked/MedFast.exe`                 | Aprovado                      |
| Conteúdo do pacote comparado ao código e recursos               | 47 arquivos iguais            |
| Auditoria das dependências de produção (`npm audit --omit=dev`) | 0 vulnerabilidades reportadas |

O teste da interface percorreu as sete páginas, cadastrou enfermagem e médico, recebeu um paciente fictício, salvou rascunho de triagem, encerrou e reabriu o processo, concluiu triagem, chamou para atendimento, registrou evolução e finalizou. Verificou a persistência após recarregar, o isolamento da ponte e a ausência do nome/anotações em texto simples no arquivo SQLite.

Os testes do Firebase usam o projeto fictício `demo-medfast-desktop`. Cobrem acesso anônimo, membro revogado, outra unidade, tentativa de autoaprovação, papéis de consulta/edição, formato/versão, imutabilidade, cliente REST real, sincronização entre duas bases e conflito de edições. Mensagens `PERMISSION_DENIED` são esperadas nos casos de negação.

Os executáveis são gerados pelo electron-builder para Windows x64, com ícone e identificação do MedFast, sem assinatura digital. Os hashes SHA-256 da entrega estão em `release/SHA256SUMS.txt`. `npm run verify:package` confere novamente os recursos e gera esse arquivo.

A nova identidade inclui Poppins local, o símbolo MedFast, a paleta azul/verde-água e os nomes públicos atualizados. O ID `br.com.clara.desktop`, o banco `Clara/data/clara.sqlite`, o login técnico e os formatos internos de backup foram preservados. Novos backups usam `.medfast-backup`; a restauração também aceita `.clara-backup`.

Não foi realizado login no projeto Firebase de produção, não foram publicadas regras nele e não foi instalada uma conta administrativa. A ativação está descrita no README. O instalador foi gerado; não foi feita uma instalação permanente no Windows do usuário durante os testes.

As dependências de desenvolvimento, incluindo ferramentas Firebase, podem ter alertas separados na auditoria completa. O resultado de zero acima refere-se às dependências de produção, e não a toda a cadeia de ferramentas.
