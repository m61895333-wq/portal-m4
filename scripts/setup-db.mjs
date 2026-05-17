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
      image_prompt text,
      category text not null,
      tags text[] not null default '{}',
      status text not null default 'review',
      priority integer not null default 50,
      scheduled_at timestamptz,
      published_at timestamptz,
      reviewer_notes text,
      source_topic text,
      editorial_angle text,
      visual_fingerprint text,
      content_fingerprint text,
      source_urls text[] not null default '{}',
      source_titles text[] not null default '{}',
      factual_notes text,
      generation_provider text,
      generation_model text,
      editorial_score integer,
      editorial_audit jsonb,
      editorial_revision_count integer not null default 0,
      reviewed_at timestamptz,
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

    create table if not exists portal_page_views (
      id uuid primary key default gen_random_uuid(),
      path text not null,
      viewed_at timestamptz not null default now()
    );

    create table if not exists portal_contacts (
      id uuid primary key default gen_random_uuid(),
      name text not null,
      email text not null,
      message text not null,
      created_at timestamptz not null default now()
    );

    create table if not exists portal_settings (
      key text primary key,
      value jsonb not null,
      updated_at timestamptz not null default now()
    );

    alter table portal_posts add column if not exists source_topic text;
    alter table portal_posts add column if not exists editorial_angle text;
    alter table portal_posts add column if not exists image_prompt text;
    alter table portal_posts add column if not exists visual_fingerprint text;
    alter table portal_posts add column if not exists content_fingerprint text;
    alter table portal_posts add column if not exists source_urls text[] not null default '{}';
    alter table portal_posts add column if not exists source_titles text[] not null default '{}';
    alter table portal_posts add column if not exists factual_notes text;
    alter table portal_posts add column if not exists generation_provider text;
    alter table portal_posts add column if not exists generation_model text;
    alter table portal_posts add column if not exists editorial_score integer;
    alter table portal_posts add column if not exists editorial_audit jsonb;
    alter table portal_posts add column if not exists editorial_revision_count integer not null default 0;
    alter table portal_posts add column if not exists reviewed_at timestamptz;

    create index if not exists idx_portal_posts_status_active on portal_posts(status, is_active);
    create index if not exists idx_portal_posts_category on portal_posts(category);
    create unique index if not exists idx_portal_posts_title_unique_normalized on portal_posts ((lower(trim(title))));
    create unique index if not exists idx_portal_posts_editorial_unique
      on portal_posts ((lower(trim(coalesce(source_topic, '')))), (lower(trim(coalesce(editorial_angle, '')))))
      where source_topic is not null and editorial_angle is not null and status <> 'rejected';
    create unique index if not exists idx_portal_posts_visual_fingerprint_unique
      on portal_posts (visual_fingerprint)
      where visual_fingerprint is not null and visual_fingerprint <> '' and status <> 'rejected';
    create index if not exists idx_portal_posts_source_topic on portal_posts(source_topic);
    create index if not exists idx_portal_views_post_period on portal_post_views(post_id, viewed_at);
    create index if not exists idx_portal_page_views_path_period on portal_page_views(path, viewed_at);
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
      "Pauta inicial arquivada do Portal M4",
      "Registro tecnico inicial mantido fora da publicacao para nao ocupar espaco editorial do portal.",
      longArticle,
      "https://images.unsplash.com/photo-1642790106117-e829e14a795f?auto=format&fit=crop&w=1400&q=85",
      "inteligencia-artificial",
      ["portal-m4", "inteligencia-artificial", "investimentos"],
      "rejected",
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

  await client.query(
    `
    insert into portal_settings(key, value)
    values
      ('autonomy', '{"active":false,"dailyCount":5,"startTime":"08:00","activeDays":["seg","ter","qua","qui","sex"]}'::jsonb),
      ('topic_tags', '["Mercado Financeiro","Inteligência Artificial","Investimentos","Tecnologia","Empreendedorismo"]'::jsonb)
    on conflict(key) do nothing
    `
  );

  console.log("Banco Portal M4 configurado com sucesso.");
} finally {
  await client.end();
}
