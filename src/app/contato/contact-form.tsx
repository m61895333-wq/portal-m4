"use client";

import { useState } from "react";
import { contactAction } from "../admin/actions";

export function ContactForm() {
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    const res = await contactAction(formData);
    setLoading(false);
    if (res.success) {
      setSent(true);
    } else {
      alert("Erro ao enviar mensagem. Tente novamente.");
    }
  }

  if (sent) {
    return (
      <div className="card" style={{ padding: 40, textAlign: 'center', maxWidth: 600, margin: '0 auto' }}>
        <div style={{ fontSize: '3rem', marginBottom: 16 }}>✅</div>
        <h2 style={{ color: 'var(--cyan)', marginBottom: 12 }}>Mensagem Enviada!</h2>
        <p style={{ color: 'var(--muted)' }}>Obrigado pelo contato. Nossa equipe analisara sua mensagem e respondera em breve.</p>
        <button onClick={() => setSent(false)} className="buttonSecondary" style={{ marginTop: 24 }}>Enviar outra mensagem</button>
      </div>
    );
  }

  return (
    <form action={handleSubmit} className="card" style={{ padding: 40, textAlign: 'left', maxWidth: 600, margin: '0 auto' }}>
      <div style={{ marginBottom: 24 }}>
        <label style={{ display: 'block', marginBottom: 8, fontSize: '0.9rem', fontWeight: 700, color: 'var(--cyan)' }}>
          Nome Completo
        </label>
        <input 
          name="name"
          type="text" 
          placeholder="Seu nome..."
          required
          style={{ 
            width: '100%', 
            padding: '14px', 
            background: 'rgba(255,255,255,0.03)', 
            border: '1px solid var(--line)', 
            borderRadius: 12,
            color: 'white'
          }} 
        />
      </div>

      <div style={{ marginBottom: 24 }}>
        <label style={{ display: 'block', marginBottom: 8, fontSize: '0.9rem', fontWeight: 700, color: 'var(--cyan)' }}>
          E-mail Profissional
        </label>
        <input 
          name="email"
          type="email" 
          placeholder="seu@email.com"
          required
          style={{ 
            width: '100%', 
            padding: '14px', 
            background: 'rgba(255,255,255,0.03)', 
            border: '1px solid var(--line)', 
            borderRadius: 12,
            color: 'white'
          }} 
        />
      </div>

      <div style={{ marginBottom: 32 }}>
        <label style={{ display: 'block', marginBottom: 8, fontSize: '0.9rem', fontWeight: 700, color: 'var(--cyan)' }}>
          Mensagem
        </label>
        <textarea 
          name="message"
          rows={5}
          placeholder="Como podemos ajudar?"
          required
          style={{ 
            width: '100%', 
            padding: '14px', 
            background: 'rgba(255,255,255,0.03)', 
            border: '1px solid var(--line)', 
            borderRadius: 12,
            color: 'white',
            resize: 'none'
          }} 
        ></textarea>
      </div>

      <button className="button" type="submit" disabled={loading} style={{ width: '100%', padding: 16 }}>
        {loading ? "Enviando..." : "Enviar Mensagem"}
      </button>
    </form>
  );
}
