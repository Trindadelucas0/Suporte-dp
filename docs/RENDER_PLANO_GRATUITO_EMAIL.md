# ⚠️ Render: Plano Gratuito e Envio de Emails

## 🔍 Confirmação da Pesquisa

**Sim, o Render bloqueia SMTP no plano gratuito!**

Desde **26 de setembro de 2025**, o Render bloqueou o tráfego SMTP (portas 25, 465 e 587) em serviços web gratuitos.

---

## ❌ O que NÃO funciona no plano gratuito:

- ❌ **SMTP tradicional** (portas 25, 465, 587)
- ❌ Conexões SMTP são bloqueadas
- ❌ Timeout de conexão ao tentar usar SMTP

---

## ✅ O que FUNCIONA no plano gratuito:

- ✅ **APIs de email** (HTTP/HTTPS)
- ✅ **Resend API** (recomendado)
- ✅ **SendGrid API**
- ✅ **Mailgun API**
- ✅ **Amazon SES API**
- ✅ Qualquer serviço que use API HTTP (não SMTP)

---

## 💡 Solução Implementada

O sistema agora usa **API do Resend** ao invés de SMTP!

### **Como funciona:**

1. **Se `RESEND_API_KEY` está configurado:**
   - ✅ Usa **API do Resend** (HTTP)
   - ✅ Funciona no **plano gratuito** do Render
   - ✅ Não depende de SMTP
   - ✅ Sem timeout

2. **Se `RESEND_API_KEY` NÃO está configurado:**
   - Usa SMTP tradicional (só funciona em instância paga)

---

## 🎯 Resposta Direta

**Você NÃO precisa pagar pela instância do Render para enviar emails!**

Basta usar a **API do Resend** (que já está implementada no sistema).

---

## 📋 Configuração Necessária

No Render, adicione apenas:

```
RESEND_API_KEY = re_DTQJ4DTE_9uZqzWpxtTt32iQbLyEe3etE
SMTP_FROM = noreply@pixsile.resend.app
```

**Isso é suficiente!** Não precisa de instância paga.

---

## 💰 Quando Precisaria Pagar?

Você só precisaria pagar se quisesse usar **SMTP tradicional** (não recomendado).

Com a **API do Resend**, você pode usar o plano gratuito do Render sem problemas.

---

## ✅ Vantagens da API do Resend

- ✅ Funciona no plano gratuito do Render
- ✅ Mais rápido que SMTP
- ✅ Mais confiável
- ✅ Não bloqueado por firewall
- ✅ 3.000 emails/mês grátis

---

## 🔗 Referências

- [Render Free Tier Limitations](https://render.com/free)
- [Resend API Documentation](https://resend.com/docs)
- [Render Community - SMTP Blocking](https://community.render.com/t/unable-to-send-email-through-smtp/39454)

---

## ✨ Conclusão

**Não precisa pagar!** Use a API do Resend que já está implementada no sistema.

Basta configurar `RESEND_API_KEY` no Render e funcionará no plano gratuito.

