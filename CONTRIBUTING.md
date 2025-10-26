# Como Contribuir para o @innv/ts-typeforge

Ficamos muito felizes pelo seu interesse em contribuir!

## Reportando Bugs (Issues)

* Verifique se o bug já não foi reportado abrindo uma busca nas [Issues](https://github.com/innovare-tech/ts-typeforge/issues).
* Seja o mais descritivo possível. Inclua os DTOs de exemplo, a chamada da `forge` que você usou, o resultado esperado e o resultado obtido. Se possível, crie um pequeno repositório de exemplo que reproduza o erro.

## Propondo Mudanças (Pull Requests)

1.  **Fork** o repositório `innovare-tech/ts-typeforge`.
2.  **Clone** o seu fork: `git clone https://github.com/SEU_USUARIO/ts-typeforge.git`
3.  **Crie sua branch:** `git checkout -b feat/minha-nova-feature` ou `fix/meu-bug-fix`. Use um nome descritivo.
4.  **Instale as dependências:** `npm install` (ou `npm ci` se já tiver um `package-lock.json`).
5.  **Faça suas mudanças.** Garanta que o código siga os padrões de linting e formatação.
6.  **Adicione testes:** Adicione testes unitários para sua nova feature ou para o bug que você corrigiu em `test/`. Use os DTOs em `test/fixtures/` ou crie novos se necessário.
7.  **Rode os testes:** Verifique se tudo passa (incluindo cobertura): `npm test`
8.  **Rode o lint e o format:** `npm run lint` e `npm run format`. Corrija quaisquer problemas.
9.  **Faça o Commit** seguindo nossas regras (veja abaixo).

### Regras de Commit

Usamos [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/). Isso nos ajuda a automatizar o versionamento e gerar changelogs. Um hook (husky + commitlint) irá verificar sua mensagem antes do commit ser aceito.

**Formato:** `<tipo>(<escopo opcional>): <descrição>`

**Tipos Comuns:**
* `feat`: Uma nova feature para o usuário.
* `fix`: Uma correção de bug para o usuário.
* `docs`: Apenas mudanças na documentação.
* `style`: Mudanças que não afetam o significado do código (espaços, formatação, ponto e vírgula, etc).
* `refactor`: Uma mudança de código que não corrige um bug nem adiciona uma feature.
* `perf`: Uma mudança de código que melhora a performance.
* `test`: Adicionando testes faltantes ou corrigindo testes existentes.
* `build`: Mudanças que afetam o sistema de build ou dependências externas (ex: `package.json`, `tsconfig.json`).
* `ci`: Mudanças nos arquivos e scripts de configuração de CI (ex: workflows do GitHub Actions).
* `chore`: Outras mudanças que não modificam o código `src` ou `test` (ex: atualizar dependências de dev).
* `revert`: Reverte um commit anterior.

**Exemplos:**
* `feat: adiciona suporte a tipos Date nativos`
* `fix: corrige parsing de enums numéricos`
* `docs: atualiza README com exemplo de generics`
* `test(type-forge): adiciona testes para overrides aninhados`
* `refactor(type-inspector): move lógica de cache para método separado`
* `chore: atualiza dependência do jest para v29.7.0`
* `build: ajusta tsconfig para output ESM`

### Processo de Pull Request

1.  Faça **Push** da sua branch para o seu fork: `git push origin feat/minha-nova-feature`
2.  Abra um **Pull Request (PR)** para o branch `main` do repositório `innovare-tech/ts-typeforge`.
3.  No PR, descreva claramente o que você mudou e por quê. Se corrigir uma Issue, mencione `Fixes #123`.
4.  Certifique-se de que a pipeline de CI (GitHub Actions) passe (lint, testes, build).
5.  Um mantenedor do projeto irá revisar seu código e aprovar, solicitar mudanças ou discutir a implementação.
6.  Após a aprovação e merge, sua contribuição fará parte da próxima release!

Obrigado por contribuir!