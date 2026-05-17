# MANUAL DO PROJETO - PORTAL M4

Documento operacional do Portal M4, separado da SALEX e dos demais projetos do Grupo M4.

## Regra suprema

- Sempre trabalhar uma etapa por vez.
- Sempre fazer apenas uma pergunta por vez quando for necessário perguntar algo ao usuário.
- Registrar decisões, pendências, links e configurações relevantes neste manual.
- Nunca versionar chaves, tokens, senhas ou arquivos `.env`.

## Essência do projeto

O Portal M4 é um portal de blog premium e autônomo com artigos sobre:

- Mercado financeiro, bolsa de valores, juros, inflação e economia.
- Investimentos e educação financeira.
- Tecnologia, inteligência artificial e negócios digitais.
- Mercado de trabalho e carreira na era da IA.
- Empreendedorismo digital.

O objetivo é ter uma esteira editorial com IA: criar pautas e rascunhos, anexar imagem realista, enviar ao painel administrativo e publicar somente após aprovação humana.

## Estrutura atual

- Pasta principal: `D:\GRUPO_M4_HUB\05_Portal_M4`
- App web independente: `D:\GRUPO_M4_HUB\05_Portal_M4\web`
- Repositório GitHub: `https://github.com/m61895333-wq/portal-m4.git`
- Projeto Vercel: `portal-m4`
- URL temporária pública: `https://portal-m4.vercel.app`
- URL de deploy técnico: `https://portal-m4-g5ccmol6h-m61895333-9865s-projects.vercel.app`
- Domínio comprado para apontar depois: `portalm4.com.br`

## Banco de dados

- Provedor: Supabase
- Projeto: `iueoqdwhrnxkgjrqybwo`
- URL do painel: `https://supabase.com/dashboard/project/iueoqdwhrnxkgjrqybwo`
- Tabelas criadas:
  - `portal_posts`
  - `portal_post_views`
  - `portal_topic_tags`
- Migração inicial executada: posts antigos do JSON local foram importados para o Supabase novo.

As chaves reais estão configuradas em `.env.local` no ambiente local e nas variáveis de ambiente da Vercel. Não registrar valores completos neste manual.

## Variáveis de ambiente obrigatórias

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `PORTAL_M4_ADMIN_USER`
- `PORTAL_M4_ADMIN_PASSWORD`
- `NEXT_PUBLIC_SITE_URL`

## Funcionalidades implementadas

- Home premium do Portal M4.
- Header e rodapé padronizados.
- Categorias editoriais.
- Página de categoria.
- Página de artigo.
- Google Analytics `G-GNFK5W0K7N`.
- SEO automático por artigo.
- Favicon/logomarca do Portal M4.
- Painel administrativo protegido por usuário e senha.
- Criação de novo post por link, assunto e abordagem.
- Campo de data de postagem.
- Edição de título, slug, resumo, imagem, categoria, tags e conteúdo.
- Botões de aprovar, não aprovar, publicar, ativar/desativar, excluir e refazer conteúdo.
- Painel de desempenho por semana ou mês.
- Artigos mais lidos.
- Assuntos menos lidos.
- Tags estratégicas editáveis.
- Registro de visualização de artigo.

## Decisões técnicas

- O Portal M4 foi separado do monorepo antigo da SALEX porque a Vercel estava construindo `salex-ia@2.1.2`.
- O novo `package.json` se chama `portal-m4`.
- O projeto não usa Tailwind para evitar os erros anteriores de `oxide/lightningcss`.
- O build local passou com `npm run build`.
- A auditoria de dependências passou com `2 vulnerabilities` após atualização do Next/React.
- A Vercel foi ajustada para framework `nextjs`, build `npm run build` e domínio oficial aliasado para `portalm4.com.br`.
- A URL `https://portal-m4.vercel.app` foi criada como alias temporário público.
- O domínio `https://portalm4.com.br` já responde com status `200` e headers da Vercel/Cloudflare.

## Infraestrutura VPS (Worker Autônomo)

- **Acesso SSH:** armazenar somente em variáveis de ambiente locais ou no provedor de secrets. Não registrar senha, token ou chave neste manual.
- **Worker em produção:** `/opt/m4-worker/worker.py` (serviço systemd `m4-worker`)
- **Venv Python:** `/opt/m4-worker/venv/`
- **Modelos de IA local:** `llama3:8b-instruct-q4_2` como modelo rápido/escritor principal e `qwen2.5:3b-instruct` como revisor complementar leve, configurados por `OLLAMA_FAST_MODEL`, `OLLAMA_WRITER_MODEL`, `OLLAMA_REVISER_MODEL` e `OLLAMA_FALLBACK_MODEL`.
- **Uso premium de IA:** Gemini API no nível gratuito configurado para poucas chamadas por dia, com `GEMINI_RESEARCH_MODEL=gemini-2.5-flash`, `GEMINI_WRITER_MODEL=gemini-3.1-flash-lite`, `GEMINI_FALLBACK_MODEL=gemini-2.5-flash-lite` e `GEMINI_DAILY_CALL_LIMIT=3`.
- **Economia de créditos:** Gemini entra em pauta/pesquisa atualizada e redação principal; Ollama fica com auditoria local, tags, imagem, classificação, reparos simples e fallback.
- **Notificação de publicação:** quando `RESEND_API_KEY` estiver configurado, o worker envia e-mail para `caprinimarcus@gmail.com` somente após o artigo realmente mudar para `published` (`PORTAL_M4_NOTIFY_EMAIL=caprinimarcus@gmail.com`).
- **Script de deploy local:** `D:\GRUPO_M4_HUB\05_Portal_M4\web\scripts\deploy_worker.js`
- **Status em 14/05/2026:** worker `m4-worker` ativo na VPS, processando a fila em segundo plano sem depender do painel aberto.
- **Ajuste de estabilidade:** worker em modo VPS 8GB com `num_ctx=2048` para evitar OOM no Ollama.
- **Como fazer deploy do worker (pela máquina local):**
  ```bash
  node D:\GRUPO_M4_HUB\05_Portal_M4\web\scripts\deploy_worker.js
  ```
- **Como reiniciar o serviço na VPS:**
  ```bash
  systemctl restart m4-worker
  systemctl status m4-worker
  ```
- **Como ver o log em tempo real na VPS:**
  ```bash
  journalctl -u m4-worker -f
  ```

## Credenciais do Painel Admin

- **URL do painel:** `https://portalm4.com.br/admin`
- **Usuário e senha:** configurados somente por `PORTAL_M4_ADMIN_USER` e `PORTAL_M4_ADMIN_PASSWORD`.

## Proteções anti-duplicação implementadas

- **Camada 1 - Código:** Worker e painel verificam os 32 títulos mais recentes antes de criar artigo.
- **Camada 2 - Banco de dados:** `UNIQUE INDEX` em `lower(trim(title))` bloqueia inserções duplicadas na raiz (executado no Supabase SQL Editor em 11/05/2026).
- **Camada 3 - Imagens:** Seeds únicos por timestamp + aleatório, `visual_fingerprint` único e `image_prompt` salvo no banco para auditoria.
- **Brief visual contextual:** a capa passa a ser gerada a partir de título, resumo, assunto-base, ângulo editorial, categoria e palavras-chave reais do artigo. O objetivo é evitar imagens genéricas de escritório, gráficos ou tecnologia sem relação com o texto.
- **Auditoria visual:** a revisão editorial verifica se a imagem tem seed único, fingerprint visual e brief visual suficientemente específico antes de permitir publicação.
- **Botão Trocar imagem:** agora recria a capa com base no artigo completo, não apenas em palavras soltas do título.
- **Radar editorial de assuntos:** o worker consulta feeds RSS públicos de notícias do Brasil, economia, investimentos, tecnologia, IA, carreira e negócios antes de criar uma pauta automática.
- **Regra de pauta própria:** o Ollama transforma sinais atuais da internet em um título original do Portal M4, sem copiar manchetes.
- **Pauta com Gemini:** quando houver cota diária, o Gemini 2.5 Flash usa pesquisa/fundamentação para transformar sinais atuais em uma pauta própria e atualizada.
- **Fila unitária:** enquanto existir artigo em `queue` ou `generating`, o worker não cria outro. A produção segue um por vez.
- **Curadoria editorial inteligente:** artigos institucionais/genéricos sobre o próprio Portal M4, temas sem dor concreta, sem impacto social/econômico/profissional ou parecidos com conteúdos anteriores devem reprovar.
- **Retrabalho automático até aprovação:** artigo reprovado pela auditoria volta para `queue` e é refeito automaticamente quantas vezes forem necessárias até ser aprovado e publicado.
- **Lapidação econômica:** quando um artigo já possui rascunho substancial, a reprova não apaga o texto; o worker manda o próprio artigo para o Ollama corrigir apenas os bloqueios da auditoria, preservando a pesquisa original e economizando Gemini. Itens já aprovados pela auditoria, como título, resumo e imagem, devem ser preservados para evitar retrabalho desnecessário.
- **Publicação antes do próximo:** a esteira só cria/procura nova pauta quando não existe artigo em `queue`, `generating`, `review`, `analysis` ou `approved`.
- **Acabamento antes da auditoria:** antes de reprovar, o worker adiciona uma camada editorial sobre quem ganha, quem perde, riscos, oportunidades, cenários, fontes e decisões práticas quando detecta lacunas objetivas no texto.
- **Orçamento Gemini:** limite interno conservador de 3 chamadas por dia, controlado em `/opt/m4-worker/gemini_usage.json`, para caber no uso gratuito e evitar gasto desnecessário.
- **Higiene de modelos Ollama:** manter na VPS apenas os modelos efetivamente usados pelo worker. Modelos grandes, duplicados ou fora da configuração devem ser removidos com `ollama rm`.
- **Estilos de abertura:** 12 estilos rotativos (dado chocante, pergunta retórica, cena vivida, paradoxo, declaração ousada, contexto histórico, citação de autoridade, contraste dramático, número impactante, virada narrativa).

## Checklist de finalização

- [x] Confirmar pasta ativa do projeto: `D:\GRUPO_M4_HUB\05_Portal_M4`.
- [x] Validar build local com `npm run build`.
- [x] Validar lint local com `npm run lint`.
- [x] Confirmar que `https://portalm4.com.br` responde `200`.
- [x] Consolidar cópias externas em `D:\GRUPO_M4_HUB\05_Portal_M4\_merged_sources\20260517-045807`.
- [x] Remover pastas externas antigas do Portal M4 após cópia de segurança.
- [x] Preservar e remover `D:\GRUPO_M4_HUB\03_M4_GAMES` (antigo `Portal AutoBlog`).
- [x] Criar teste isolado OpenAI sem gravar chave real no código.
- [x] Implementar OpenAI estruturado no worker com fallback reversível para Gemini/Ollama.
- [x] Adicionar campos de rastreabilidade editorial: fontes, notas factuais, provedor e modelo de geração.
- [x] Worker `m4-worker` reativado em 14/05/2026, processando a fila em segundo plano sem depender do painel aberto.
- [x] Modelo ativo na VPS: `llama3:8b-instruct-q4_2`, com worker ajustado para `num_ctx=2048` para evitar OOM no Ollama.
- [ ] Confirmar no painel da Vercel que `portalm4.com.br` está como domínio principal/canônico.
- [ ] Revisar/rotacionar tokens, senhas e chaves que já foram compartilhados em chat ou apareceram em arquivos.
- [ ] Garantir que nenhuma chave privada, token ou senha volte para arquivos versionados.
- [ ] Confirmar e commitar a remoção dos arquivos sensíveis/obsoletos que já aparecem como deletados no Git.
- [ ] Remover ou arquivar a pasta antiga `D:\04 Portal AutoBlog` quando o Windows liberar os arquivos em uso.
- [x] Executar `npm run setup:db` quando `DATABASE_URL` estiver configurado para garantir todas as tabelas.
- [ ] Rodar `python scripts\test_openai_text.py` com `OPENAI_API_KEY` configurada em `.env.local` e avaliar qualidade do texto.
- [x] Executar `npm run setup:db` antes de publicar com metadados OpenAI para criar `source_urls`, `source_titles`, `factual_notes`, `generation_provider` e `generation_model`.
- [ ] Fazer deploy do worker com `node scripts\deploy_worker.js` após configurar `OPENAI_API_KEY`.
- [ ] Fazer teste ponta a ponta completo: aprovar/publicar artigo gerado automaticamente, abrir artigo público e conferir métricas.
- [ ] Rotacionar a senha SSH usada anteriormente e manter o acesso apenas em variáveis locais/secret manager.
