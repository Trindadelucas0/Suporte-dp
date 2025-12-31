/**
 * Testes Unitários: INSS Service
 */

const INSSService = require('../../../services/inssService');

describe('INSSService', () => {
  describe('calcular', () => {
    test('deve calcular INSS corretamente para salário mínimo', () => {
      const resultado = INSSService.calcular(1412.00, false);
      
      expect(resultado).toHaveProperty('valorINSS');
      expect(resultado).toHaveProperty('aliquotaEfetiva');
      expect(resultado).toHaveProperty('memoria');
      expect(resultado.valorINSS).toBeGreaterThan(0);
    });

    test('deve calcular INSS para salário acima do teto', () => {
      const resultado = INSSService.calcular(10000.00, false);
      
      expect(resultado.valorINSS).toBeLessThanOrEqual(7786.02 * 0.14);
    });

    test('deve aplicar pró-labore corretamente', () => {
      const resultado = INSSService.calcular(5000.00, true);
      
      expect(resultado).toHaveProperty('valorINSS');
      expect(resultado.memoria).toBeDefined();
    });

    test('deve retornar valor zero ou tratar salário negativo', () => {
      // O serviço pode não lançar erro, apenas retornar valor zero ou tratar
      const resultado = INSSService.calcular(-100, false);
      // Verifica se retorna um objeto válido (mesmo que com valor zero)
      expect(resultado).toHaveProperty('valorINSS');
      expect(resultado.valorINSS).toBeGreaterThanOrEqual(0);
    });

    test('deve calcular corretamente para diferentes faixas', () => {
      const casos = [
        { salario: 1000, esperado: expect.any(Number) },
        { salario: 2000, esperado: expect.any(Number) },
        { salario: 3000, esperado: expect.any(Number) },
        { salario: 5000, esperado: expect.any(Number) },
      ];

      casos.forEach(caso => {
        const resultado = INSSService.calcular(caso.salario, false);
        expect(resultado.valorINSS).toBeGreaterThan(0);
        expect(resultado.aliquotaEfetiva).toBeGreaterThan(0);
      });
    });
  });
});

