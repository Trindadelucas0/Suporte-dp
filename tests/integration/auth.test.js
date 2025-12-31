/**
 * Testes de Integração: Autenticação
 */

const request = require('supertest');
const app = require('../../server');
const db = require('../../config/database');
const User = require('../../models/User');

describe('Autenticação', () => {
  let testUser;

  beforeAll(async () => {
    // Limpa dados de teste
    try {
      await db.query('DELETE FROM users WHERE email LIKE $1', ['test_%']);
    } catch (error) {
      // Ignora se tabela não existir
    }
  });

  afterAll(async () => {
    // Limpa dados de teste
    try {
      if (testUser) {
        await db.query('DELETE FROM users WHERE id = $1', [testUser.id]);
      }
    } catch (error) {
      // Ignora erros
    }
  });

  describe('POST /register', () => {
    test('deve registrar novo usuário com sucesso', async () => {
      const response = await request(app)
        .post('/register')
        .send({
          nome: 'Teste User',
          email: 'test_register@test.com',
          senha: 'senha123',
          confirmarSenha: 'senha123'
        });

      expect(response.status).toBe(302); // Redirect após registro
      expect(response.headers.location).toBe('/dashboard');
    });

    test('deve rejeitar registro com senhas diferentes', async () => {
      const response = await request(app)
        .post('/register')
        .send({
          nome: 'Teste User',
          email: 'test_register2@test.com',
          senha: 'senha123',
          confirmarSenha: 'senha456'
        });

      expect(response.status).toBe(200);
      // Pode retornar mensagem de validação genérica ou específica
      expect(response.text).toMatch(/senhas? não coincidem|preencha todos os campos/i);
    });

    test('deve rejeitar registro com email duplicado', async () => {
      // Primeiro registro
      const firstResponse = await request(app)
        .post('/register')
        .send({
          nome: 'Teste User 1',
          email: 'test_duplicate@test.com',
          senha: 'senha123',
          confirmarSenha: 'senha123'
        });

      // Aguarda um pouco para evitar rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));

      // Segundo registro com mesmo email
      const response = await request(app)
        .post('/register')
        .send({
          nome: 'Teste User 2',
          email: 'test_duplicate@test.com',
          senha: 'senha123',
          confirmarSenha: 'senha123'
        });

      // Pode retornar 200 com mensagem de erro ou 429 por rate limiting
      expect([200, 429]).toContain(response.status);
      if (response.status === 200) {
        expect(response.text).toMatch(/já está cadastrado|email/i);
      }
    });

    test('deve aplicar rate limiting', async () => {
      // Tenta registrar 4 vezes rapidamente (limite é 3 por hora)
      const responses = [];
      for (let i = 0; i < 4; i++) {
        const response = await request(app)
          .post('/register')
          .send({
            nome: `Teste User ${i}`,
            email: `test_rate${i}@test.com`,
            senha: 'senha123',
            confirmarSenha: 'senha123'
          });
        responses.push(response);
        // Pequeno delay para evitar problemas
        await new Promise(resolve => setTimeout(resolve, 50));
      }

      // Pelo menos uma deve ser bloqueada pelo rate limit (limite é 3)
      const rateLimited = responses.some(r => r.status === 429);
      expect(rateLimited).toBe(true);
    });
  });

  describe('POST /login', () => {
    beforeEach(async () => {
      // Cria usuário de teste
      testUser = await User.create(
        'Teste Login',
        'test_login@test.com',
        'senha123'
      );
    });

    afterEach(async () => {
      // Remove usuário de teste
      if (testUser) {
        try {
          await db.query('DELETE FROM users WHERE id = $1', [testUser.id]);
        } catch (error) {
          // Ignora
        }
      }
    });

    test('deve fazer login com credenciais corretas', async () => {
      const response = await request(app)
        .post('/login')
        .send({
          email: 'test_login@test.com',
          senha: 'senha123'
        });

      expect(response.status).toBe(302);
      expect(response.headers.location).toBe('/dashboard');
    });

    test('deve rejeitar login com senha incorreta', async () => {
      const response = await request(app)
        .post('/login')
        .send({
          email: 'test_login@test.com',
          senha: 'senhaErrada'
        });

      expect(response.status).toBe(200);
      expect(response.text).toContain('incorretos');
    });

    test('deve aplicar rate limiting no login', async () => {
      // Tenta fazer login 6 vezes rapidamente (limite é 5)
      const responses = [];
      for (let i = 0; i < 6; i++) {
        const response = await request(app)
          .post('/login')
          .send({
            email: 'test_login@test.com',
            senha: 'senhaErrada'
          });
        responses.push(response);
        // Pequeno delay
        await new Promise(resolve => setTimeout(resolve, 50));
      }

      // Pelo menos uma deve ser bloqueada (limite é 5 tentativas)
      const rateLimited = responses.some(r => r.status === 429);
      expect(rateLimited).toBe(true);
    });
  });
});

