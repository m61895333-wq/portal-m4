# MANUAL DO PROJETO - PORTAL M4

Documento operacional do Portal M4, separado da SALEX e dos demais projetos do Grupo M4.

## Regra suprema

- Sempre trabalhar uma etapa por vez.
- Sempre fazer apenas uma pergunta por vez quando for necessario perguntar algo ao usuario.
- Registrar decisoes, pendencias, links e configuracoes relevantes neste manual.
- Nunca versionar chaves, tokens, senhas ou arquivos `.env`.

## Essencia do projeto

O Portal M4 e um portal de blog premium e autonomo com artigos sobre:

- Mercado financeiro, bolsa de valores, juros, inflacao e economia.
- Investimentos e educacao financeira.
- Tecnologia, inteligencia artificial e negocios digitais.
- Mercado de trabalho e carreira na era da IA.
- Empreendedorismo digital.

O objetivo e ter uma esteira editorial com IA: criar pautas e rascunhos, anexar imagem realista, enviar ao painel administrativo e publicar somente apos aprovacao humana.

## Estrutura atual

- Pasta principal: `D:\04 Portal M4`
- App web independente: `D:\04 Portal M4\web`
- Repositorio GitHub: `https://github.com/m61895333-wq/portal-m4.git`
- Projeto Vercel: `portal-m4`
- URL temporaria publica: `https://portal-m4.vercel.app`
- URL de deploy tecnico: `https://portal-m4-g5ccmol6h-m61895333-9865s-projects.vercel.app`
- Dominio comprado para apontar depois: `portalm4.com.br`

## Banco de dados

- Provedor: Supabase
- Projeto: `iueoqdwhrnxkgjrqybwo`
- URL do painel: `https://supabase.com/dashboard/project/iueoqdwhrnxkgjrqybwo`
- Tabelas criadas:
  - `portal_posts`
  - `portal_post_views`
  - `portal_topic_tags`

As chaves reais estao configuradas em `.env.local` no ambiente local e nas variaveis de ambiente da Vercel. Nao registrar valores completos neste manual.

## Variaveis de ambiente obrigatorias

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `PORTAL_M4_ADMIN_USER`
- `PORTAL_M4_ADMIN_PASSWORD`
- `NEXT_PUBLIC_SITE_URL`

## Funcionalidades implementadas

- Home premium do Portal M4.
- Header e rodape padronizados.
- Categorias editoriais.
- Pagina de categoria.
- Pagina de artigo.
- Google Analytics `G-GNFK5W0K7N`.
- SEO automatico por artigo.
- Favicon/logomarca do Portal M4.
- Painel administrativo protegido por usuario e senha.
- Criacao de novo post por link, assunto e abordagem.
- Campo de data de postagem.
- Edicao de titulo, slug, resumo, imagem, categoria, tags e conteudo.
- Botoes de aprovar, nao aprovar, publicar, ativar/desativar, excluir e refazer conteudo.
- Painel de desempenho por semana ou mes.
- Artigos mais lidos.
- Assuntos menos lidos.
- Tags estrategicas editaveis.
- Registro de visualizacao de artigo.

## Decisoes tecnicas

- O Portal M4 foi separado do monorepo antigo da SALEX porque a Vercel estava construindo `salex-ia@0.1.0`.
- O novo `package.json` se chama `portal-m4`.
- O projeto nao usa Tailwind para evitar os erros anteriores de `oxide/lightningcss`.
- O build local passou com `npm run build`.
- A auditoria de dependencias passou com `0 vulnerabilities` apos override seguro de `postcss`.
- A Vercel foi ajustada para framework `nextjs`, build `npm run build` e projeto renomeado para `portal-m4`.

## Pendencias

- Apontar o dominio `portalm4.com.br` no GoDaddy para a Vercel.
- Configurar dominio oficial no projeto Vercel.
- Revisar/rotacionar tokens e chaves que foram compartilhados em chat.
- Trocar senha do painel admin por uma senha definitiva.
- Remover ou arquivar a pasta antiga `D:\04 Portal AutoBlog` quando o Windows liberar os arquivos em uso.
- Evoluir a automacao real de IA para gerar artigos de 3000 a 5000 palavras.
- Criar workflow de IA/n8n para pautas, imagens realistas e envio para revisao.
