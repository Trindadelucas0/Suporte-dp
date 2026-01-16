# 🔧 CONFIGURAÇÃO PARA VPS (IP Público)

## ✅ CORREÇÕES APLICADAS

O código foi ajustado para funcionar em VPS com IP público (não Render).

### 1. **Configuração de Proxy** ✅
- Removida configuração específica do Render
- Agora detecta automaticamente se tem proxy reverso (Nginx/Apache)
- Funciona tanto com proxy reverso quanto sem

### 2. **Configuração de Cookies** ✅
- Cookies `secure` agora dependem de variável de ambiente
- Funciona em HTTP (sem HTTPS) e HTTPS
- Não quebra mais em VPS sem certificado SSL

### 3. **Detecção de IP** ✅
- Função `getRealIp` ajustada para VPS
- Funciona com ou sem proxy reverso
- Rate limiting funciona corretamente

### 4. **Tratamento de Erros** ✅
- Adicionado tratamento de erro na rota GET /login
- Evita erros 500 não tratados

---

## 📋 VARIÁVEIS DE AMBIENTE PARA VPS

Configure estas variáveis no seu servidor VPS:

### **Obrigatórias:**
```bash
# Banco de dados PostgreSQL
DB_HOST=seu-host-postgresql
DB_PORT=5432
DB_NAME=seu-banco
DB_USER=seu-usuario
DB_PASSWORD=sua-senha

# Sessão (CRÍTICO - gere um valor seguro)
SESSION_SECRET=seu-secret-aqui-32-caracteres-minimo
```

### **Opcionais (mas recomendadas):**
```bash
# Se sua VPS tem HTTPS (Let's Encrypt, etc)
HAS_HTTPS=true

# Se tem proxy reverso (Nginx/Apache na frente)
HAS_REVERSE_PROXY=true

# Porta do servidor (padrão: 3000)
PORT=3000

# Ambiente (development ou production)
NODE_ENV=production
```

---

## 🔍 COMO CONFIGURAR

### **Cenário 1: VPS Direto (sem Nginx/Apache, sem HTTPS)**
```bash
# Não defina HAS_REVERSE_PROXY
# Não defina HAS_HTTPS
# Cookies funcionarão em HTTP
```

### **Cenário 2: VPS com Nginx/Apache (sem HTTPS)**
```bash
HAS_REVERSE_PROXY=true
# Não defina HAS_HTTPS
# Cookies funcionarão em HTTP
```

### **Cenário 3: VPS com HTTPS (Let's Encrypt, etc)**
```bash
HAS_HTTPS=true
# Se tiver proxy reverso:
HAS_REVERSE_PROXY=true
# Cookies funcionarão em HTTPS (mais seguro)
```

---

## 🚀 COMANDOS PARA CONFIGURAR

### 1. Gerar SESSION_SECRET:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 2. Adicionar variáveis de ambiente:
```bash
# Se usar systemd (recomendado)
sudo nano /etc/systemd/system/suporte-dp.service

# Adicione:
Environment="SESSION_SECRET=seu-secret-gerado"
Environment="DB_HOST=localhost"
Environment="DB_PORT=5432"
# ... etc
```

### 3. Reiniciar serviço:
```bash
sudo systemctl daemon-reload
sudo systemctl restart suporte-dp
```

---

## 🐛 DIAGNÓSTICO DE PROBLEMAS

### **Problema: Erro ao clicar em Login**

1. **Verifique logs:**
   ```bash
   sudo journalctl -u suporte-dp -f
   # ou
   pm2 logs
   # ou
   tail -f logs/app.log
   ```

2. **Verifique cookies no navegador:**
   - F12 → Application → Cookies
   - Deve ver `suporte-dp.sid`
   - Se não aparecer, problema com cookies

3. **Verifique se porta está aberta:**
   ```bash
   sudo netstat -tlnp | grep :3000
   # ou
   sudo ss -tlnp | grep :3000
   ```

4. **Teste acesso direto:**
   ```
   http://seu-ip:3000/login
   ```

---

## ✅ CHECKLIST DE CONFIGURAÇÃO

- [ ] SESSION_SECRET configurado
- [ ] Variáveis de banco de dados configuradas
- [ ] Porta 3000 (ou outra) aberta no firewall
- [ ] PostgreSQL rodando e acessível
- [ ] HAS_HTTPS configurado (se tiver HTTPS)
- [ ] HAS_REVERSE_PROXY configurado (se tiver Nginx/Apache)
- [ ] Servidor Node.js rodando
- [ ] Teste: http://seu-ip:3000/login funciona

---

## 📝 NOTAS IMPORTANTES

1. **Sem HTTPS:** Cookies `secure` serão `false` automaticamente
2. **Com HTTPS:** Defina `HAS_HTTPS=true` para usar cookies seguros
3. **Proxy Reverso:** Se usar Nginx/Apache, defina `HAS_REVERSE_PROXY=true`
4. **IP Público:** A função `getRealIp` agora funciona corretamente em VPS

---

## 🔒 SEGURANÇA

- **Em produção sem HTTPS:** Considere usar HTTPS (Let's Encrypt é gratuito)
- **SESSION_SECRET:** NUNCA compartilhe ou commite no Git
- **Firewall:** Configure para permitir apenas portas necessárias
- **Banco de dados:** Use senhas fortes e não exponha diretamente na internet
