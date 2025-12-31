/**
 * Testes de Integração: Painel Administrativo
 */

const request = require('supertest');
const app = require('../../server');
const db = require('../../config/database');
const User = require('../../models/User');

describe('Painel Administrativo', () => {
  let adminUser;
  let normalUser;
  let adminSession;
  let normalSession;

  beforeAll(async () => {
    // Limpa usuários anteriores se existirem
    try {
      await db.query('DELETE FROM users WHERE email IN ($1, $2)', ['admin_test@test.com', 'user_normal@test.com']);
    } catch (error) {
      // Ignora
    }

    // Cria admin
    try {
      adminUser = await User.create(
        'Admin Teste',
        'admin_test@test.com',
        'senha123',
        true
      );
    } catch (error) {
      adminUser = await User.findByEmail('admin_test@test.com');
    }

    // Cria usuário normal
    try {
      normalUser = await User.create(
        'User Normal',
        'user_normal@test.com',
        'senha123',
        false
      );
    } catch (error) {
      normalUser = await User.findByEmail('user_normal@test.com');
    }

    // Login admin
    const adminLogin = await request(app)
      .post('/login')
      .send({
        email: 'admin_test@test.com',
        senha: 'senha123'
      });
    adminSession = adminLogin.headers['set-cookie'];

    // Login normal
    const normalLogin = await request(app)
      .post('/login')
      .send({
        email: 'user_normal@test.com',
        senha: 'senha123'
      });
    normalSession = normalLogin.headers['set-cookie'];
  });

  afterAll(async () => {
    // Limpa dados
    if (adminUser) {
      try {
        await db.query('DELETE FROM users WHERE id = $1', [adminUser.id]);
      } catch (error) {}
    }
    if (normalUser) {
      try {
        await db.query('DELETE FROM users WHERE id = $1', [normalUser.id]);
      } catch (error) {}
    }
  });

  describe('GET /admin', () => {
    test('deve permitir acesso para admin', async () => {
      const response = await request(app)
        .get('/admin')
        .set('Cookie', adminSession);

      expect(response.status).toBe(200);
      expect(response.text).toContain('Painel Administrativo');
    });

    test('deve negar acesso para usuário normal', async () => {
      const response = await request(app)
        .get('/admin')
        .set('Cookie', normalSession);

      expect(response.status).toBe(403);
    });

    test('deve negar acesso sem autenticação', async () => {
      const response = await request(app)
        .get('/admin');

      expect(response.status).toBe(302);
      expect(response.headers.location).toBe('/login');
    });
  });

  describe('POST /admin/usuarios/:id/atualizar', () => {
    test('deve atualizar status do usuário (admin)', async () => {
      const response = await request(app)
        .post(`/admin/usuarios/${normalUser.id}/atualizar`)
        .set('Cookie', adminSession)
        .send({
          bloqueado: true
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    test('deve validar UUID', async () => {
      const response = await request(app)
        .post('/admin/usuarios/invalid-id/atualizar')
        .set('Cookie', adminSession)
        .send({
          bloqueado: true
        });

      expect(response.status).toBe(400);
    });

    test('deve negar acesso para usuário normal', async () => {
      const response = await request(app)
        .post(`/admin/usuarios/${normalUser.id}/atualizar`)
        .set('Cookie', normalSession)
        .send({
          bloqueado: true
        });

      expect(response.status).toBe(403);
    });
  });
});

