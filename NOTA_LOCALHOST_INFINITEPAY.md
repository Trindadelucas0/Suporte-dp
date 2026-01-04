# ⚠️ Nota sobre Localhost e InfinitePay

## 🔍 Por que estou usando localhost?

Quando você está testando localmente, o `APP_URL` está configurado como `http://localhost:3000`. Isso pode causar problemas com a API do InfinitePay porque:

1. **Webhook não funciona em localhost:**
   - O InfinitePay precisa enviar webhooks para uma URL pública
   - URLs locais (`localhost:3000`) não são acessíveis pela internet
   - O webhook não será recebido enquanto você estiver em localhost

2. **Redirect URL em localhost:**
   - Após o pagamento, o InfinitePay redireciona para `redirect_url`
   - Se for `http://localhost:3000/register`, só funciona no seu computador
   - Em produção, deve ser a URL pública do seu site

## 🛠️ Como resolver para testar localmente?

### Opção 1: Usar ngrok (recomendado para testes)

1. **Instalar ngrok:**
   ```bash
   # Baixar de https://ngrok.com/
   # Ou via npm: npm install -g ngrok
   ```

2. **Iniciar ngrok:**
   ```bash
   ngrok http 3000
   ```

3. **Copiar a URL pública** (ex: `https://abc123.ngrok.io`)

4. **Configurar no .env:**
   ```env
   APP_URL=https://abc123.ngrok.io
   ```

5. **Reiniciar o servidor:**
   ```bash
   npm start
   ```

### Opção 2: Testar apenas o fluxo (sem webhook real)

1. **Criar pedido e pagamento manualmente no banco:**
   - Criar pedido via `/adquirir`
   - Criar pagamento manualmente via SQL
   - Testar cadastro com `order_nsu`

2. **Simular webhook manualmente:**
   - Fazer POST para `/webhook/infinitepay` com dados de teste
   - Ou criar dados diretamente no banco

### Opção 3: Deploy em produção/teste

1. **Fazer deploy** em Render, Heroku, Railway, etc.
2. **Configurar APP_URL** com a URL pública
3. **Testar o fluxo completo**

## 📝 Sobre o erro "Total price must be greater than 1"

O erro está ocorrendo mesmo enviando 50, o que sugere:

1. **Possível formato de valor:**
   - Algumas APIs esperam centavos (50 reais = 5000)
   - Outras esperam reais com 2 decimais (50.00)
   - Nossa implementação está usando reais (50.00)

2. **Validação da API:**
   - A API pode estar calculando `quantity * price` e o total precisa ser > 1
   - Com `quantity: 1` e `price: 50`, o total deveria ser 50
   - Mas pode haver algum problema no cálculo interno da API

3. **Possível problema de ambiente:**
   - A API pode ter restrições em ambiente de desenvolvimento
   - Ou pode precisar de autenticação adicional

## 🔧 Próximos passos

1. **Verificar documentação da InfinitePay:**
   - Confirmar formato de valor (reais ou centavos)
   - Verificar se precisa de API key para criar links
   - Verificar requisitos mínimos

2. **Testar com valor diferente:**
   - Tentar com 100 ao invés de 50
   - Ver se o erro muda

3. **Verificar logs detalhados:**
   - O log já mostra o `payload_completo`
   - Verificar se está no formato correto

4. **Contatar suporte InfinitePay:**
   - Se persistir, pode ser questão de configuração da conta
   - Ou pode precisar ativar algo na conta InfinitePay

