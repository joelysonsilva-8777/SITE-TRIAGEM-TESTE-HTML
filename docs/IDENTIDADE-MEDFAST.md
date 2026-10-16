# Identidade MedFast

Aplicada às quatro versões: HTML, React web, React Native/Expo e Windows/Electron. O nome utilizado é **MedFast**, conforme solicitado; a referência enviada apresenta MedicalFast. O monograma vetorial reproduz o conceito de M com coração/estetoscópio da referência, adaptado ao nome MedFast.

| Cor | Valor | Uso |
| --- | --- | --- |
| Azul Saúde | `#0648D7` | Marca, navegação e ações principais |
| Verde Vida | `#19C7C4` | Coração, detalhes e ações em destaque |
| Azul Claro | `#E8FAFF` | Superfícies suaves e áreas de apoio |
| Cinza Escuro | `#1F2937` | Texto principal |
| Cinza Claro | `#F3F6F9` | Fundo das telas |

Paleta transcrita da referência fornecida. Variações escuras do azul/verde garantem contraste em textos e estados de interação. As cores clínicas de risco continuam independentes da marca.

**Poppins** é usada em Regular, Medium, SemiBold e Bold, inclusive nos títulos. As fontes são locais e funcionam offline. Arquivos e licença SIL Open Font License vêm do [repositório oficial Google Fonts](https://github.com/google/fonts/tree/main/ofl/poppins).

## Arquivos da identidade

- `assets/brand/mark.svg`: monograma M com coração/estetoscópio.
- `assets/brand/heart.svg`: elemento gráfico do coração.
- `assets/css/brand.css`: paleta, tipografia e acabamento compartilhados.
- `assets/fonts/Poppins-*.ttf`: fontes locais.
- `scripts/sync-brand.cjs`: replica fontes, SVGs e estilos para os projetos independentes.
- `scripts/build-brand.cjs`: gera PNGs para celular e ICO para Windows a partir do SVG.

Na raiz, após instalar suas dependências:

```powershell
npm run brand:sync
node scripts/build-brand.cjs
```

## Continuidade dos dados

Nome visível, ícones, títulos, relatórios e executáveis passaram a MedFast. Identificadores técnicos de instalações existentes foram conservados:

- Chaves `clara:*` de armazenamento e eventos internos.
- Banco Windows `%APPDATA%\Clara\data\clara.sqlite` e identidade do instalador `br.com.clara.desktop`.
- Identificadores Android/iOS `com.clara.cuidados`; esquemas de endereço `medfast` e `clara`.
- Formatos internos de backup; novos arquivos usam `.medfast-backup` e a restauração aceita também `.clara-backup`.
- Projeto Firebase `triagem-base`, unidade `unidade-principal` e login escolhido `admin@clara.local`. A mudança visual não cria, exclui ou renomeia contas.

As pastas são `medfast-web`, `medfast-native` e `medfast-desktop`. Não mova nem apague a pasta de dados do Windows para trocar a marca. Esta atualização tem versão 1.1.0.
