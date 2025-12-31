/**
 * Testes de Integração: Perfil do Usuário
 */

const request = require('supertest');
const app = require('../../server');
const db = require('../../config/database');
const User = require('../../models/User');

describe('Perfil do Usuário', () => {
  let testUser;
  let sessionCookie;

  beforeAll(async () => {
    // Limpa usuário anterior se existir
    try {
      await db.query('DELETE FROM users WHERE email = $1', ['test_perfil@test.com']);
    } catch (error) {
      // Ignora
    }

    // Cria usuário de teste e faz login
    try {
      testUser = await User.create(
        'Teste Perfil',
        'test_perfil@test.com',
        'senha123'
      );
    } catch (error) {
      // Se falhar, tenta buscar usuário existente
      testUser = await User.findByEmail('test_perfil@test.com');
    }

    // Faz login para obter sessão
    const loginResponse = await request(app)
      .post('/login')
      .send({
        email: 'test_perfil@test.com',
        senha: 'senha123'
      });

    sessionCookie = loginResponse.headers['set-cookie'];
  });

  afterAll(async () => {
    // Limpa dados de teste
    if (testUser) {
      try {
        await db.query('DELETE FROM users WHERE id = $1', [testUser.id]);
      } catch (error) {
        // Ignora
      }
    }
  });

  describe('GET /perfil', () => {
    test('deve retornar página de perfil para usuário autenticado', async () => {
      const response = await request(app)
        .get('/perfil')
        .set('Cookie', sessionCookie);

      expect(response.status).toBe(200);
      expect(response.text).toContain('Meu Perfil');
    });

    test('deve redirecionar usuário não autenticado', async () => {
      const response = await request(app)
        .get('/perfil');

      expect(response.status).toBe(302);
      expect(response.headers.location).toBe('/login');
    });
  });

  describe('POST /perfil/update-basic', () => {
    test('deve atualizar dados básicos com sucesso', async () => {
      const response = await request(app)
        .post('/perfil/update-basic')
        .set('Cookie', sessionCookie)
        .send({
          nome: 'Nome Atualizado',
          email: 'test_perfil@test.com'
        });

      expect(response.status).toBe(200);
      expect(response.text).toContain('atualizados com sucesso');
    });

    test('deve rejeitar email duplicado', async () => {
      // Limpa usuário anterior se existir
      try {
        await db.query('DELETE FROM users WHERE email = $1', ['outro@test.com']);
      } catch (error) {
        // Ignora
      }

      // Cria outro usuário
      let outroUser;
      try {
        outroUser = await User.create(
          'Outro User',
          'outro@test.com',
          'senha123'
        );
      } catch (error) {
        outroUser = await User.findByEmail('outro@test.com');
      }

      const response = await request(app)
        .post('/perfil/update-basic')
        .set('Cookie', sessionCookie)
        .send({
          nome: 'Teste Perfil',
          email: 'outro@test.com'
        });

      expect(response.status).toBe(200);
      expect(response.text).toContain('já está em uso');

      // Limpa
      if (outroUser) {
        await db.query('DELETE FROM users WHERE id = $1', [outroUser.id]);
      }
    });

    test('deve validar formato de email', async () => {
      const response = await request(app)
        .post('/perfil/update-basic')
        .set('Cookie', sessionCookie)
        .send({
          nome: 'Teste',
          email: 'email-invalido'
        });

      expect(response.status).toBe(200);
      expect(response.text).toContain('Email inválido');
    });
  });

  describe('POST /perfil/update-profile', () => {
    test('deve atualizar perfil com dados válidos', async () => {
      const response = await request(app)
        .post('/perfil/update-profile')
        .set('Cookie', sessionCookie)
        .send({
          telefone: '(11) 99999-9999',
          whatsapp: '(11) 88888-8888',
          empresa: 'Empresa Teste',
          cargo: 'Desenvolvedor',
          instagram: 'testuser',
          observacoes: 'Observações de teste'
        });

      expect(response.status).toBe(200);
      expect(response.text).toMatch(/atualizado com sucesso|Perfil atualizado/i);
    });

    test('deve validar formato de telefone', async () => {
      const response = await request(app)
        .post('/perfil/update-profile')
        .set('Cookie', sessionCookie)
        .send({
          telefone: 'telefone-invalido-123'
        });

      expect(response.status).toBe(200);
      expect(response.text).toContain('Telefone inválido');
    });

    test('deve validar tamanho máximo de observações', async () => {
      const observacoesLongas = 'a'.repeat(6000);

      const response = await request(app)
        .post('/perfil/update-profile')
        .set('Cookie', sessionCookie)
        .send({
          observacoes: observacoesLongas
        });

      expect(response.status).toBe(200);
      expect(response.text).toContain('muito longas');
    });
  });
});

