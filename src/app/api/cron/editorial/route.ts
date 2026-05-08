import { NextResponse } from "next/server";
import { getAutonomyStatus, getPerformance, listPosts, createDraft } from "@/lib/portal-cms";

/**
 * API CRON: Despertador Editorial M4
 * Este endpoint e chamado pela Vercel para processar a autonomia total.
 */
export async function GET(request: Request) {
  // 1. Verificacao de Seguranca (Opcional: usar Header de Autorizacao da Vercel)
  const authHeader = request.headers.get("authorization");
  
  // Em producao, verificamos o CRON_SECRET
  // if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
  //   return new Response("Unauthorized", { status: 401 });
  // }

  try {
    const autonomy = await getAutonomyStatus();
    
    if (!autonomy.active) {
      return NextResponse.json({ message: "Agente de Autonomia esta DESLIGADO." });
    }

    // REGRA MARCO: Verificar se ja existe algo na fila (foco total)
    const currentQueue = await listPosts("all");
    const activeTasks = currentQueue.filter(p => p.status === 'queued' || p.status === 'generating');
    
    if (activeTasks.length > 0) {
      return NextResponse.json({ message: "Agente aguardando a finalizacao da fila atual para respeitar o foco total." });
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

    // 3. Disparo da Geracao Sequencial Premium do Artigo do Dia
    console.log(`[CRON] Disparando o Artigo Epico do Dia para: ${targetTopic}`);
    
    await createDraft({
      topic: targetTopic,
      approach: "Artigo Epico de Capa. Foco em autoridade maxima e profundidade total para abertura do dia editorial."
    });

    return NextResponse.json({ 
      message: "Artigo do Dia gerado com sucesso!", 
      topic: targetTopic
    });

  } catch (error) {
    console.error("[CRON ERROR]", error);
    return NextResponse.json({ error: "Falha no processamento editorial." }, { status: 500 });
  }
}
