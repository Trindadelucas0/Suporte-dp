# 📧 Configuração SendGrid para Render

## 🚀 Setup Rápido

### 1. Criar Conta SendGrid

1. Acesse: https://signup.sendgrid.com/
2. Crie uma conta gratuita
3. Confirme seu email

### 2. Criar API Key

1. No painel SendGrid, vá em **Settings** > **API Keys**
2. Clique em **Create API Key**
3. Escolha **Full Access** ou **Restricted Access** (email send)
4. Copie a API Key (você só verá uma vez!)

### 3. Configurar no Render

No painel do Render, adicione/atualize as variáveis de ambiente:

```
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=<cole-aqui-sua-api-key-do-sendgrid>
SMTP_FROM=noreply@seudominio.com
```

**⚠️ IMPORTANTE:**
- `SMTP_USER` deve ser exatamente: `apikey` (não seu email!)
- `SMTP_PASS` é sua API Key do SendGrid
- `SMTP_FROM` deve ser um email verificado no SendGrid

### 4. Verificar Email Remetente no SendGrid

1. No SendGrid, vá em **Settings** > **Sender Authentication**
2. Clique em **Verify a Single Sender**
3. Preencha os dados e verifique o email
4. Use esse email no `SMTP_FROM`

### 5. Testar

Execute o teste:
```bash
npm run test-email
```

## 📊 Limites do Plano Gratuito

- **100 emails/dia** (perfeito para começar)
- **25.000 emails/mês** quando você adiciona cartão de crédito
- SMTP e API funcionam

## ✅ Vantagens

- ✅ Funciona no Render
- ✅ Não bloqueia conexões
- ✅ Confiável
- ✅ Tracking de emails
- ✅ Relatórios
- ✅ Grátis para começar

## 🔄 Migração

O código atual **não precisa ser alterado**! Basta mudar as variáveis de ambiente no Render.

## 🆘 Troubleshooting

### Erro: "Authentication failed"
- Verifique se `SMTP_USER` está como `apikey` (literalmente)
- Verifique se a API Key está correta
- Verifique se a API Key tem permissões de envio

### Erro: "From address not verified"
- Verifique o email remetente no SendGrid
- Use um email verificado no `SMTP_FROM`

### Emails não estão chegando
- Verifique a pasta de spam
- Verifique logs do SendGrid (Activity)
- Verifique se o limite diário não foi atingido

