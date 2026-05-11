"use client";

import { useState } from "react";
import { createSingleDraftAction } from "./actions";
import styles from "../portal.module.css";

export function BatchCreator() {
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [total, setTotal] = useState(0);

  async function handleBatchCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const topic = formData.get("topic") as string;
    const count = Number(formData.get("count") ?? 1);

    // Variações de ângulo editorial para garantir títulos únicos em lote
    const ANGLE_VARIANTS = [
      "",                                      // 1º artigo: tópico puro
      "— Perspectivas e Tendências 2026",
      "— Impacto no Mercado Financeiro Brasileiro",
      "— Oportunidades Práticas para Investidores",
      "— O Que os Especialistas Estão Dizendo",
      "— Análise Aprofundada e Cenários Futuros",
      "— Guia Completo Para Profissionais",
      "— Riscos, Oportunidades e Decisões Estratégicas",
      "— Como Preparar Sua Carteira Para Esta Realidade",
      "— Lições do Mercado Global Para o Brasil",
    ];

    setLoading(true);
    setTotal(count);
    setProgress(0);

    for (let i = 1; i <= count; i++) {
      setProgress(i);

      // Cada artigo recebe uma variação de ângulo para garantir unicidade
      const angle = ANGLE_VARIANTS[(i - 1) % ANGLE_VARIANTS.length];
      const variantTopic = angle ? `${topic} ${angle}` : topic;

      const singleFormData = new FormData();
      singleFormData.append("topic", variantTopic);
      singleFormData.append("index", String(i));
      singleFormData.append("total", String(count));

      try {
        const result = await createSingleDraftAction(singleFormData);

        if (result && !result.success) {
          // Traduz o erro de duplicata para português
          const errorMsg = result.error?.includes("duplicate key") || result.error?.includes("CURADORIA")
            ? `Artigo ${i}: Já existe um artigo com tema muito similar na base. Tente um ângulo diferente ou tema mais específico.`
            : `Erro no Artigo ${i}:\n${result.error}`;
          alert(errorMsg);
          setLoading(false);
          return;
        }

        // Pausa inteligente entre artigos para não sobrecarregar
        if (i < count) {
          await new Promise(resolve => setTimeout(resolve, 3000));
        }
      } catch (err: any) {
        alert("Erro ao conectar com o servidor: " + err.message);
        setLoading(false);
        return;
      }
    }

    setLoading(false);
    window.location.reload();
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <form onSubmit={handleBatchCreate} style={{ display: 'flex', gap: '12px', alignItems: 'flex-end', flex: 1 }}>
        <label className={styles.field} style={{ marginBottom: 0, flex: 1 }}>
          Assunto ou Topic
          <input name="topic" placeholder="Ex: Mercado Financeiro 2026" required disabled={loading} />
        </label>
        <label className={styles.field} style={{ marginBottom: 0, width: '120px' }}>
          Artigos/Dia
          <input name="count" type="number" defaultValue="5" min="1" max="10" disabled={loading} />
        </label>
        <button className="button" type="submit" style={{ height: '48px', minWidth: '120px', position: 'relative', overflow: 'hidden' }} disabled={loading}>
          {loading ? `Gerando ${progress}/${total}...` : "Programar"}
        </button>
      </form>

      {loading && (
        <div style={{ 
          marginTop: '8px', 
          padding: '16px', 
          background: 'rgba(53, 242, 185, 0.05)', 
          border: '1px solid rgba(53, 242, 185, 0.2)', 
          borderRadius: '8px' 
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--green)' }}>
              Produção em Lote Ativada ({progress}/{total})
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
              ~10 a 15 segundos por artigo...
            </span>
          </div>
          <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', overflow: 'hidden' }}>
            <div style={{ 
              height: '100%', 
              background: 'var(--green)', 
              width: `${(progress / total) * 100}%`,
              transition: 'width 0.5s ease'
            }} />
          </div>
          <p style={{ fontSize: '0.75rem', color: 'var(--muted)', margin: '8px 0 0 0', fontStyle: 'italic' }}>
            A IA está estruturando o texto, realizando revisão ortográfica e validando a imagem do artigo {progress}. Por favor, aguarde.
          </p>
        </div>
      )}
    </div>
  );
}
