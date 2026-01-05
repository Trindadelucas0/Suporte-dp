/**
 * Testes Unitários: User Model
 */

const User = require('../../../models/User');
const bcrypt = require('bcrypt');

describe('User Model', () => {
  describe('verifyPassword', () => {
    test('deve verificar senha correta', async () => {
      const senha = 'senha123';
      const hash = await bcrypt.hash(senha, 10);
      
      const resultado = await User.verifyPassword(senha, hash);
      expect(resultado).toBe(true);
    });

    test('deve rejeitar senha incorreta', async () => {
      const senha = 'senha123';
      const hash = await bcrypt.hash(senha, 10);
      
      const resultado = await User.verifyPassword('senhaErrada', hash);
      expect(resultado).toBe(false);
    });
  });

  describe('create', () => {
    test('deve criar hash de senha corretamente', async () => {
      const nome = 'Teste User';
      const email = 'teste@teste.com';
      const senha = 'senha123';

      // Mock do banco de dados
      const originalQuery = require('../../../config/database').query;
      const mockQuery = jest.fn().mockResolvedValue({
        rows: [{
          id: '123e4567-e89b-12d3-a456-426614174000',
          nome,
          email,
          is_admin: false,
          created_at: new Date()
        }]
      });

      require('../../../config/database').query = mockQuery;

      const user = await User.create(nome, email, senha);

      expect(mockQuery).toHaveBeenCalled();
      const callArgs = mockQuery.mock.calls[0];
      expect(callArgs[0]).toContain('INSERT INTO users');
      
      // Verifica se a senha foi hasheada
      const senhaHash = callArgs[1][2];
      expect(senhaHash).not.toBe(senha);
      expect(await bcrypt.compare(senha, senhaHash)).toBe(true);

      // Restaura
      require('../../../config/database').query = originalQuery;
    });
  });
});




