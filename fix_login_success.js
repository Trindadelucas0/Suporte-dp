// Script temporário para verificar e corrigir
const fs = require('fs');
const filePath = 'controllers/authController.js';
let code = fs.readFileSync(filePath, 'utf8');

// Encontrar todas as ocorrências de res.render('auth/login' que não têm success
const regex = /res\.render\('auth\/login',\s*\{([^}]*)\}/g;
let match;
let fixes = 0;

code = code.replace(/res\.render\('auth\/login',\s*\{([^}]*)\}/g, (match, content) => {
  if (!content.includes('success')) {
    // Se não tem success, adiciona antes do }
    const fixed = match.replace(/(\n\s*)\}/, `,$1success: null$1}`);
    fixes++;
    return fixed;
  }
  return match;
});

if (fixes > 0) {
  fs.writeFileSync(filePath, code, 'utf8');
  console.log(`✅ Corrigido ${fixes} ocorrência(s)`);
} else {
  console.log('✅ Nenhuma correção necessária');
}



