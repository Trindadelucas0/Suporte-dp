# ⚡ Guia Rápido - Suporte DP

## 🚀 Início Rápido

### 1. Instalação
```bash
npm install
cp .env.example .env
# Editar .env com suas configurações
npm run init-db
npm run create-admin
npm start
```

### 2. Acesso
- URL: `http://localhost:3000`
- Login: `admin@suportedp.com` / `admin123`

## 📖 Como Usar

### Calcular INSS
1. Acesse `/inss`
2. Digite o salário bruto
3. Marque "Pró-labore" se aplicável
4. Clique em "Calcular"
5. Veja resultado, memória e base legal

### Calcular IRRF
1. Acesse `/irrf`
2. Digite salário bruto, dependentes e pensão
3. O sistema calcula INSS automaticamente
4. Veja o resultado completo

### Calendário
1. Acesse `/calendario`
2. Clique em uma data para anotar
3. Use "Calcular Dias Úteis" para períodos

### Checklists
1. Acesse `/checklist`
2. Escolha "Admissão" ou "Rescisão"
3. Marque itens conforme concluídos

### Gerar PDF
1. Após calcular (INSS, IRRF, FGTS)
2. Acesse `/pdf/[tipo]/[id]`
3. PDF será baixado automaticamente

## 🎯 Atalhos

- **Dashboard**: `/dashboard`
- **INSS**: `/inss`
- **IRRF**: `/irrf`
- **FGTS**: `/fgts`
- **Avos**: `/avos`
- **Custo**: `/custo`
- **Calendário**: `/calendario`
- **Checklists**: `/checklist`

## 💡 Dicas

- Todos os cálculos são salvos automaticamente
- Use as abas "Memória" e "Base Legal" para entender melhor
- O calendário mostra feriados automaticamente
- Checklists são criados automaticamente na primeira vez

## ❓ Problemas Comuns

**Erro de conexão com banco?**
- Verifique se PostgreSQL está rodando
- Confira credenciais no `.env`

**Página não carrega?**
- Verifique se o servidor está rodando
- Confira a porta no `.env`

**Erro ao calcular?**
- Verifique se os dados estão corretos
- Confira os logs do servidor

---

**Precisa de mais ajuda?** Consulte `README.md` ou `GUIA_INSTALACAO.md`

