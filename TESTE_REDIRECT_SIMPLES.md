# 🧪 TESTE: Verificar se redirect funciona

Para testar se o problema é com redirect ou com CSP, crie uma rota de teste:

```javascript
// Adicionar em server.js antes das rotas protegidas
app.get('/test-redirect', (req, res) => {
  console.log('🧪 TESTE REDIRECT - Redirecionando para Google');
  return res.redirect('https://google.com');
});

app.post('/test-redirect-post', (req, res) => {
  console.log('🧪 TESTE REDIRECT POST - Redirecionando para Google');
  return res.redirect('https://google.com');
});
```

Se esses testes funcionarem, o problema não é com redirect em si.
Se não funcionarem, há um problema mais fundamental.

