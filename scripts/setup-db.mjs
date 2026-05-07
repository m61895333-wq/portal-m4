import fs from "node:fs";
import path from "node:path";
import pg from "pg";

const root = process.cwd();
const envPath = path.join(root, ".env.local");

if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!match) continue;
    const [, key, rawValue] = match;
    process.env[key] ??= rawValue.replace(/^"|"$/g, "");
  }
}

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL nao encontrado. Crie .env.local antes de executar setup:db.");
  process.exit(1);
}

const { Client } = pg;
const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });

const longArticle = `
## Contexto estrategico
O Portal M4 nasce para oferecer uma leitura premium sobre mercado financeiro, investimentos, tecnologia, inteligencia artificial e carreira. A proposta e transformar assuntos complexos em analises organizadas, confiaveis e uteis para leitores que buscam tomar decisoes melhores.

## Diagnostico profissional
Um portal de conteudo automatizado nao pode depender apenas de volume. O diferencial esta na curadoria, no padrao editorial e na revisao humana antes da publicacao. Por isso, cada post passa pelo painel administrativo antes de ir ao ar.

## Oportunidade
Existe uma demanda crescente por conteudos que conectem economia, tecnologia e inteligencia artificial. O leitor moderno quer contexto, aplicacao pratica e uma linguagem que transmita autoridade sem parecer distante.

## Metodo editorial
Cada artigo deve trabalhar com titulo claro, resumo objetivo, imagem realista, tags estrategicas e texto longo. A regra operacional e criar artigos com profundidade, preferencialmente entre 3000 e 5000 palavras quando a automacao completa estiver ativa.

## Proximos passos
A evolucao natural do Portal M4 sera conectar agentes de inteligencia artificial para sugerir pautas, gerar rascunhos, analisar desempenho e priorizar assuntos com maior demanda semanal ou mensal.
`.trim();

const now = new Date().toISOString();

try {
  await client.connect();
  await client.query("create extension if not exists pgcrypto");
  await client.query(`
    create table if not exists portal_posts (
      id uuid primary key default gen_random_uuid(),
      slug text unique not null,
      title text not null,
      excerpt text not null,
      content text not null,
      image_url text not null,
      category text not null,
      tags text[] not null default '{}',
      status text not null default 'review',
      priority integer not null default 50,
      scheduled_at timestamptz,
      published_at timestamptz,
      reviewer_notes text,
      is_active boolean not null default true,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );

    create table if not exists portal_post_views (
      id uuid primary key default gen_random_uuid(),
      post_id uuid not null references portal_posts(id) on delete cascade,
      viewed_at timestamptz not null default now()
    );

    create table if not exists portal_topic_tags (
      tag text primary key,
      created_at timestamptz not null default now()
    );

    create index if not exists idx_portal_posts_status_active on portal_posts(status, is_active);
    create index if not exists idx_portal_posts_category on portal_posts(category);
    create index if not exists idx_portal_views_post_period on portal_post_views(post_id, viewed_at);
  `);

  await client.query(
    `
    insert into portal_posts (
      slug, title, excerpt, content, image_url, category, tags, status, priority,
      scheduled_at, published_at, reviewer_notes, is_active, created_at, updated_at
    )
    values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
    on conflict (slug) do update set
      title = excluded.title,
      excerpt = excluded.excerpt,
      content = excluded.content,
      image_url = excluded.image_url,
      category = excluded.category,
      tags = excluded.tags,
      status = excluded.status,
      priority = excluded.priority,
      updated_at = now()
    `,
    [
      "portal-m4-inteligencia-financeira-e-tecnologia",
      "Portal M4: inteligencia financeira, tecnologia e IA para decidir melhor",
      "Uma visao editorial sobre como tecnologia, investimentos e inteligencia artificial se conectam na nova economia.",
      longArticle,
      "https://images.unsplash.com/photo-1642790106117-e829e14a795f?auto=format&fit=crop&w=1400&q=85",
      "inteligencia-artificial",
      ["portal-m4", "inteligencia-artificial", "investimentos"],
      "approved",
      1,
      null,
      now,
      "Post inicial criado na migracao do Portal M4 para banco separado.",
      true,
      now,
      now
    ]
  );

  for (const tag of ["juros-e-inflacao", "inteligencia-artificial", "investimentos", "tecnologia", "carreira-ia"]) {
    await client.query("insert into portal_topic_tags(tag) values($1) on conflict(tag) do nothing", [tag]);
  }

  console.log("Banco Portal M4 configurado com sucesso.");
} finally {
  await client.end();
}
