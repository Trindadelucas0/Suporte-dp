# 🔄 FLUXO COMPLETO: Verificação do Sistema

## ✅ FLUXO ESPERADO

### 1. **Usuário clica em "Ir para Pagamento"**
- ✅ Formulário POST para `/adquirir`
- ✅ Sistema cria pedido no banco
- ✅ Sistema chama API InfinitePay
- ✅ Sistema recebe `url` (link de checkout)
- ❌ **PROBLEMA:** Não está redirecionando (CSP bloqueando)

### 2. **Usuário paga no InfinitePay**
- ✅ InfinitePay processa pagamento
- ✅ InfinitePay envia webhook para `/webhook/infinitepay`
- ✅ Sistema salva pagamento no banco
- ✅ InfinitePay redireciona para `/register?order_nsu=...`

### 3. **Usuário chega em `/register?order_nsu=...`**
- ✅ Sistema verifica se existe pagamento aprovado
- ✅ Sistema mostra formulário de cadastro
- ✅ Usuário preenche dados
- ✅ Sistema cria usuário vinculado ao `order_nsu`
- ✅ Sistema faz login automático
- ✅ Redireciona para `/dashboard`

## 🐛 PROBLEMAS IDENTIFICADOS

### Problema 1: CSP Bloqueando Redirect (CRÍTICO)
**Status:** ⚠️ Bloqueando

**Sintoma:**
```
Sending form data to 'https://departamento-pessoal.onrender.com/adquirir' 
violates the following Content Security Policy directive: "form-action 'self'"
```

**Causa:**
- CSP não tinha `formAction` definido
- Formulário estava sendo bloqueado

**Correção aplicada:**
- ✅ Adicionado `formAction: ["'self'"]` no CSP
- ⚠️ **MAS:** Código em produção pode não estar atualizado

**Solução:**
1. Fazer deploy do código atualizado
2. Verificar headers HTTP (deve conter `form-action 'self'`)

### Problema 2: Redirect Não Funcionando
**Status:** ⚠️ Investigando

**Sintoma:**
- Log mostra "Link de checkout criado com sucesso"
- Log mostra URL correta
- ❌ Mas não redireciona

**Possíveis Causas:**
1. CSP ainda bloqueando (código não deployado)
2. Resposta já foi enviada antes do redirect
3. Erro silencioso após o log

**Verificação:**
- Verifique se há log "🚀 REDIRECIONANDO" (adicionei no código)
- Se não aparecer, há erro antes do redirect
- Se aparecer, problema é com res.redirect()

## ✅ VERIFICAÇÕES DO FLUXO

### ✅ 1. Redirect URL Configurado Corretamente
```javascript
redirect_url: `${this.APP_URL}/register?order_nsu=${orderNsu}`
```
- ✅ Usa `APP_URL` da variável de ambiente
- ✅ Inclui `order_nsu` na query string
- ✅ Aponta para `/register`

**Verificar:** Variável `APP_URL` está configurada em produção?

### ✅ 2. Webhook Configurado Corretamente
```javascript
webhook_url: `${this.APP_URL}/webhook/infinitepay`
```
- ✅ Aponta para `/webhook/infinitepay`
- ✅ URL pública (não localhost em produção)

### ✅ 3. Rota /register Existe e Funciona
- ✅ Rota GET `/register` existe
- ✅ Aceita `order_nsu` como query parameter
- ✅ Verifica pagamento antes de mostrar formulário
- ✅ Valida pagamento antes de criar usuário

### ✅ 4. Webhook Processa Pagamento
- ✅ Webhook recebe POST do InfinitePay
- ✅ Salva pagamento no banco
- ✅ Atualiza status do pedido para "paid"
- ✅ Aguarda cadastro do usuário

### ✅ 5. Cadastro Vincula ao Pagamento
- ✅ Verifica se pagamento existe e está aprovado
- ✅ Cria usuário com `order_nsu`
- ✅ Atualiza `user_id` no pagamento
- ✅ Define assinatura ativa

## 📋 CHECKLIST DE VERIFICAÇÃO

### Antes de Testar:
- [ ] Código commitado e pushed
- [ ] Deploy concluído no Render
- [ ] Variável `APP_URL` configurada no Render
- [ ] Variável `APP_URL` aponta para URL pública (não localhost)
- [ ] Servidor reiniciado após deploy

### Durante Teste:
- [ ] Formulário não é bloqueado pelo CSP
- [ ] Redirect para InfinitePay funciona
- [ ] Pagamento processado no InfinitePay
- [ ] Webhook recebido (verificar logs)
- [ ] Pagamento salvo no banco (verificar tabela `payments`)
- [ ] Redirect para `/register?order_nsu=...` funciona
- [ ] Formulário de cadastro aparece
- [ ] Cadastro funciona e cria usuário
- [ ] Login automático funciona
- [ ] Redireciona para `/dashboard`

## 🔧 PRÓXIMOS PASSOS

1. **Fazer deploy do código atualizado**
2. **Verificar variável APP_URL no Render**
3. **Testar fluxo completo após deploy**
4. **Verificar logs do servidor durante teste**
5. **Verificar banco de dados após teste**

## 📝 NOTAS IMPORTANTES

### Sobre APP_URL:
- Em **produção:** Deve ser `https://departamento-pessoal.onrender.com`
- Em **localhost:** Será `http://localhost:3000` (webhook não funciona)

### Sobre o Redirect:
- O redirect do InfinitePay acontece automaticamente após pagamento
- Não precisa fazer nada no código para isso funcionar
- Apenas precisa configurar `redirect_url` corretamente

### Sobre o Webhook:
- Webhook é enviado pelo InfinitePay automaticamente
- Pode demorar alguns segundos após pagamento
- Se não chegar, verificar URL do webhook no InfinitePay

