# 📧 Configuração de Email com Gmail

## Erro: Invalid login - Username and Password not accepted

Este erro ocorre quando o Gmail não aceita as credenciais fornecidas. Para usar o Gmail como servidor SMTP, você precisa usar uma **Senha de App** (não a senha normal da conta).

## Como Configurar

### 1. Ativar Autenticação de Dois Fatores

1. Acesse: https://myaccount.google.com/security
2. Procure por "Verificação em duas etapas"
3. Ative a autenticação de dois fatores (obrigatório para gerar senhas de app)

### 2. Gerar Senha de App

1. Acesse: https://myaccount.google.com/apppasswords
2. Se solicitado, faça login novamente
3. Em "Selecione o app", escolha **"Email"**
4. Em "Selecione o dispositivo", escolha **"Outro (nome personalizado)"**
5. Digite um nome (ex: "Suporte DP")
6. Clique em **"Gerar"**
7. **Copie a senha gerada** (16 caracteres, sem espaços)

### 3. Configurar no .env

Adicione/atualize no arquivo `.env`:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=ads.mktt@gmail.com
SMTP_PASS=xxxx xxxx xxxx xxxx  # Cole a senha gerada aqui (com ou sem espaços, o sistema remove)
SMTP_FROM=ads.mktt@gmail.com
```

**Importante:**
- Use a senha gerada (16 caracteres), não a senha normal da conta
- A senha pode ter espaços ou não, o sistema funciona em ambos os casos
- Cada senha de app é única e pode ser revogada a qualquer momento

### 4. Testar Configuração

Execute o script de teste:

```bash
node scripts/test-email.js
```

## Exemplo de Senha de App

Uma senha de app gerada pelo Gmail se parece com isso:
- `abcd efgh ijkl mnop` (com espaços)
- `abcdefghijklmnop` (sem espaços)

Ambos funcionam! O sistema aceita com ou sem espaços.

## Troubleshooting

### Erro: "BadCredentials"

- ✅ Verifique se a autenticação de dois fatores está ativada
- ✅ Use uma senha de app (não a senha normal)
- ✅ Verifique se copiou a senha corretamente
- ✅ Tente gerar uma nova senha de app

### Erro: "Connection timeout"

- ✅ Verifique sua conexão com a internet
- ✅ Verifique se a porta 587 está aberta
- ✅ Tente usar a porta 465 com `secure: true`

### Email não chega

- ✅ Verifique a pasta de spam
- ✅ Verifique se o email de destino está correto
- ✅ Verifique os logs do servidor para erros

## Segurança

- ⚠️ **Nunca** compartilhe senhas de app
- ⚠️ **Nunca** commite o arquivo `.env` no Git
- ✅ Revogue senhas de app antigas quando não usar mais
- ✅ Use senhas de app diferentes para cada aplicativo

## Alternativas

Se não quiser usar Gmail, você pode usar:

- **SendGrid** (recomendado para produção)
- **Mailgun**
- **Amazon SES**
- **Outlook/Hotmail** (mesmo processo, mas URL diferente)

Para cada serviço, ajuste as variáveis `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER` e `SMTP_PASS` conforme a documentação do serviço.

