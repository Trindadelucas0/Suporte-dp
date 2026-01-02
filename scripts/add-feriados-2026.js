/**
 * SCRIPT: Adiciona Feriados de 2026
 * Execute: node scripts/add-feriados-2026.js
 */

const db = require('../config/database');

const feriados2026 = [
  { data: '2026-01-01', nome: 'Confraternização Universal', tipo: 'nacional' },
  { data: '2026-02-16', nome: 'Carnaval', tipo: 'facultativo' },
  { data: '2026-02-17', nome: 'Carnaval', tipo: 'facultativo' },
  { data: '2026-02-18', nome: 'Quarta-Feira de Cinzas', tipo: 'facultativo' },
  { data: '2026-04-03', nome: 'Paixão de Cristo', tipo: 'nacional' },
  { data: '2026-04-20', nome: 'Ponto Facultativo', tipo: 'facultativo' },
  { data: '2026-04-21', nome: 'Tiradentes', tipo: 'nacional' },
  { data: '2026-05-01', nome: 'Dia Mundial do Trabalho', tipo: 'nacional' },
  { data: '2026-06-04', nome: 'Corpus Christi', tipo: 'facultativo' },
  { data: '2026-06-05', nome: 'Ponto Facultativo', tipo: 'facultativo' },
  { data: '2026-09-07', nome: 'Independência do Brasil', tipo: 'nacional' },
  { data: '2026-10-12', nome: 'Nossa Senhora Aparecida', tipo: 'nacional' },
  { data: '2026-10-28', nome: 'Dia do Servidor Público Federal', tipo: 'facultativo' },
  { data: '2026-11-02', nome: 'Finados', tipo: 'nacional' },
  { data: '2026-11-15', nome: 'Proclamação da República', tipo: 'nacional' },
  { data: '2026-11-20', nome: 'Dia Nacional de Zumbi e da Consciência Negra', tipo: 'nacional' },
  { data: '2026-12-24', nome: 'Véspera do Natal', tipo: 'facultativo' },
  { data: '2026-12-25', nome: 'Natal', tipo: 'nacional' },
  { data: '2026-12-31', nome: 'Véspera do Ano Novo', tipo: 'facultativo' }
];

async function adicionarFeriados2026() {
  try {
    console.log('📅 Verificando e adicionando feriados de 2026...\n');

    let adicionados = 0;
    let jaExistem = 0;
    let atualizados = 0;

    for (const feriado of feriados2026) {
      try {
        // Primeiro verifica se já existe
        const check = await db.query(
          'SELECT id, nome, tipo FROM feriados WHERE data = $1',
          [feriado.data]
        );

        if (check.rows.length > 0) {
          // Já existe - verifica se precisa atualizar
          const existente = check.rows[0];
          if (existente.nome !== feriado.nome || existente.tipo !== feriado.tipo) {
            // Atualiza se nome ou tipo for diferente
            await db.query(
              'UPDATE feriados SET nome = $1, tipo = $2 WHERE data = $3',
              [feriado.nome, feriado.tipo, feriado.data]
            );
            console.log(`🔄 ${feriado.data} - Atualizado: ${feriado.nome} (${feriado.tipo})`);
            atualizados++;
          } else {
            console.log(`✓ ${feriado.data} - ${feriado.nome} (já existe)`);
            jaExistem++;
          }
        } else {
          // Não existe - adiciona
          await db.query(
            'INSERT INTO feriados (data, nome, tipo) VALUES ($1, $2, $3)',
            [feriado.data, feriado.nome, feriado.tipo]
          );
          console.log(`✅ ${feriado.data} - ${feriado.nome} (${feriado.tipo}) - ADICIONADO`);
          adicionados++;
        }
      } catch (error) {
        if (error.code === '23505') { // Unique violation
          console.log(`⚠️  ${feriado.data} - Já existe no banco`);
          jaExistem++;
        } else {
          console.error(`❌ Erro ao processar ${feriado.data}:`, error.message);
        }
      }
    }

    console.log(`\n✅ Processo concluído!`);
    console.log(`   - Adicionados: ${adicionados}`);
    console.log(`   - Atualizados: ${atualizados}`);
    console.log(`   - Já existiam: ${jaExistem}`);
    console.log(`   - Total: ${feriados2026.length}`);

    if (typeof process !== 'undefined' && process.exit) {
      process.exit(0);
    }
  } catch (error) {
    console.error('❌ Erro ao adicionar feriados:', error);
    if (typeof process !== 'undefined' && process.exit) {
      process.exit(1);
    }
    throw error;
  }
}

// Permite executar diretamente ou como módulo
if (require.main === module) {
  adicionarFeriados2026();
} else {
  module.exports = adicionarFeriados2026;
}

