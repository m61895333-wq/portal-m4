"use client";

import { useState } from "react";
import { createEditorialBatchAction } from "./actions";
import styles from "../portal.module.css";

export function BatchCreator() {
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [total, setTotal] = useState(0);

  async function handleBatchCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const count = Number(formData.get("count") ?? 1);

    setLoading(true);
    setTotal(count);
    setProgress(0);

    try {
      setProgress(Math.max(1, Math.ceil(count / 2)));
      const result = await createEditorialBatchAction(formData);
      setProgress(count);

      if (!result.success) {
        alert(result.error || "Nenhuma pauta foi criada. Tente um tema mais específico.");
        setLoading(false);
        return;
      }

      if (result.error) {
        alert(`Foram criadas ${result.created} pautas. Algumas foram bloqueadas pela curadoria:\n\n${result.error}`);
      } else if ((result.pending ?? 0) > 0) {
        alert(`Produção sequencial ativada: 1 artigo entrou na fila agora e ${result.pending ?? 0} serão criados um por um após publicação.`);
      }
    } catch (err: any) {
      alert("Erro ao conectar com o servidor: " + err.message);
      setLoading(false);
      return;
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
              Curadoria premium em lote...
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
            O servidor está criando pautas com ângulos diferentes, trava anti-duplicidade e direção visual própria.
          </p>
        </div>
      )}
    </div>
  );
}
