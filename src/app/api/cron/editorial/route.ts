import { NextResponse } from "next/server";
import { createQueuedPost, getAutonomyStatus, getPerformance, listPosts, publishDueScheduledPosts } from "@/lib/portal-cms";

/**
 * API CRON: Despertador Editorial M4
 * Este endpoint e chamado pela Vercel para processar a autonomia total.
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const publication = await publishDueScheduledPosts();
    const autonomy = await getAutonomyStatus();
    
    if (!autonomy.active) {
      return NextResponse.json({
        message: "Agente de Autonomia esta DESLIGADO.",
        publication
      });
    }

    // REGRA MARCO: Verificar se ja existe algo na fila (foco total)
    const currentQueue = await listPosts("all");
    const activeTasks = currentQueue.filter(p => p.status === 'queued' || p.status === 'generating');
    
    if (activeTasks.length > 0) {
      return NextResponse.json({
        message: "Agente aguardando a finalizacao da fila atual para respeitar o foco total.",
        publication
      });
    }

    // 2. Decisao de Pauta (Impacto vs Fallback)
    const performance = await getPerformance("week");
    let targetTopic = "Tendencias de Mercado e IA";
    
    if (performance.mostReadTopics && performance.mostReadTopics.length > 0) {
      targetTopic = performance.mostReadTopics[0].topic;
    } else {
      const cats = ["IA", "Investimentos", "Mercado Financeiro", "Tecnologia", "Empreendedorismo"];
      targetTopic = cats[Math.floor(Math.random() * cats.length)];
    }

    // 3. Disparo oficial: cria fila para o worker da VPS processar sem timeout da Vercel.
    console.log(`[CRON] Enfileirando Artigo Epico do Dia para: ${targetTopic}`);
    
    const post = await createQueuedPost({
      topic: targetTopic,
      sourceTopic: targetTopic,
      editorialAngle: "capa estrategica do dia com decisao pratica para o leitor brasileiro",
      audience: "leitor brasileiro amplo, de diferentes classes sociais, que busca uma leitura premium e aplicavel",
      visualDirection: "premium homepage cover, Brazilian finance and technology context, refined editorial photography, no text, no identifiable people"
    });

    return NextResponse.json({ 
      message: "Artigo do Dia enfileirado com sucesso.", 
      topic: targetTopic,
      id: post.id,
      publication
    });

  } catch (error) {
    console.error("[CRON ERROR]", error);
    return NextResponse.json({ error: "Falha no processamento editorial." }, { status: 500 });
  }
}
