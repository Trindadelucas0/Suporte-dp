/**
 * MODEL: User
 * Gerencia operações relacionadas a usuários
 */

const db = require('../config/database');
const bcrypt = require('bcrypt');

class User {
  static async create(nome, email, senha, isAdmin = false) {
    const senhaHash = await bcrypt.hash(senha, 10);
    const result = await db.query(
      'INSERT INTO users (nome, email, senha_hash, is_admin) VALUES ($1, $2, $3, $4) RETURNING id, nome, email, is_admin',
      [nome, email, senhaHash, isAdmin]
    );
    return result.rows[0];
  }

  static async findByEmail(email) {
    try {
      // Verifica quais campos existem
      const columnsCheck = await db.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name IN ('ativo', 'bloqueado')
      `);
      
      const existingColumns = columnsCheck.rows.map(r => r.column_name);
      const hasAtivo = existingColumns.includes('ativo');
      const hasBloqueado = existingColumns.includes('bloqueado');

      let selectFields = 'id, nome, email, senha_hash, is_admin';
      if (hasAtivo) selectFields += ', ativo';
      if (hasBloqueado) selectFields += ', bloqueado';

      const result = await db.query(
        `SELECT ${selectFields} FROM users WHERE email = $1`,
        [email]
      );
      
      if (!result.rows[0]) return null;

      const user = result.rows[0];
      // Garante valores padrão
      return {
        ...user,
        ativo: hasAtivo ? (user.ativo !== undefined ? user.ativo : true) : true,
        bloqueado: hasBloqueado ? (user.bloqueado !== undefined ? user.bloqueado : false) : false
      };
    } catch (error) {
      console.error('Erro ao buscar usuário por email:', error);
      // Fallback: busca básica sem os novos campos
      const result = await db.query(
        'SELECT id, nome, email, senha_hash, is_admin FROM users WHERE email = $1',
        [email]
      );
      if (!result.rows[0]) return null;
      return {
        ...result.rows[0],
        ativo: true,
        bloqueado: false
      };
    }
  }

  static async findById(id) {
    try {
      // Verifica quais campos existem
      const columnsCheck = await db.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name IN ('ativo', 'bloqueado', 'last_login')
      `);
      
      const existingColumns = columnsCheck.rows.map(r => r.column_name);
      const hasAtivo = existingColumns.includes('ativo');
      const hasBloqueado = existingColumns.includes('bloqueado');
      const hasLastLogin = existingColumns.includes('last_login');

      let selectFields = 'id, nome, email, is_admin, created_at';
      if (hasAtivo) selectFields += ', ativo';
      if (hasBloqueado) selectFields += ', bloqueado';
      if (hasLastLogin) selectFields += ', last_login';

      const result = await db.query(
        `SELECT ${selectFields} FROM users WHERE id = $1`,
        [id]
      );
      
      if (!result.rows[0]) return null;

      const user = result.rows[0];
      // Garante valores padrão
      return {
        ...user,
        ativo: hasAtivo ? (user.ativo !== undefined ? user.ativo : true) : true,
        bloqueado: hasBloqueado ? (user.bloqueado !== undefined ? user.bloqueado : false) : false,
        last_login: hasLastLogin ? user.last_login : null
      };
    } catch (error) {
      console.error('Erro ao buscar usuário por ID:', error);
      // Fallback
      const result = await db.query(
        'SELECT id, nome, email, is_admin, created_at FROM users WHERE id = $1',
        [id]
      );
      if (!result.rows[0]) return null;
      return {
        ...result.rows[0],
        ativo: true,
        bloqueado: false,
        last_login: null
      };
    }
  }

  static async findAll(filtros = {}) {
    try {
      // Verifica se os campos existem antes de usar
      const columnsCheck = await db.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name IN ('ativo', 'bloqueado', 'last_login')
      `);
      
      const existingColumns = columnsCheck.rows.map(r => r.column_name);
      const hasAtivo = existingColumns.includes('ativo');
      const hasBloqueado = existingColumns.includes('bloqueado');
      const hasLastLogin = existingColumns.includes('last_login');

      // Monta query dinamicamente baseado nos campos que existem
      let selectFields = 'id, nome, email, is_admin, created_at';
      if (hasAtivo) selectFields += ', ativo';
      if (hasBloqueado) selectFields += ', bloqueado';
      if (hasLastLogin) selectFields += ', last_login';

      let query = `SELECT ${selectFields} FROM users WHERE 1=1`;
      const params = [];
      let paramCount = 1;

      if (filtros.ativo !== undefined && hasAtivo) {
        query += ` AND ativo = $${paramCount++}`;
        params.push(filtros.ativo);
      }

      if (filtros.bloqueado !== undefined && hasBloqueado) {
        query += ` AND bloqueado = $${paramCount++}`;
        params.push(filtros.bloqueado);
      }

      query += ' ORDER BY created_at DESC';

      const result = await db.query(query, params);
      
      // Garante que todos os registros tenham os campos padrão
      return result.rows.map(row => ({
        ...row,
        ativo: hasAtivo ? (row.ativo !== undefined ? row.ativo : true) : true,
        bloqueado: hasBloqueado ? (row.bloqueado !== undefined ? row.bloqueado : false) : false,
        last_login: hasLastLogin ? row.last_login : null
      }));
    } catch (error) {
      console.error('Erro ao buscar usuários:', error);
      // Fallback: busca básica sem os novos campos
      const result = await db.query('SELECT id, nome, email, is_admin, created_at FROM users ORDER BY created_at DESC');
      return result.rows.map(row => ({
        ...row,
        ativo: true,
        bloqueado: false,
        last_login: null
      }));
    }
  }

  static async updateLastLogin(id) {
    await db.query(
      'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
      [id]
    );
  }

  static async updateStatus(id, data) {
    try {
      // Verifica quais campos existem
      const columnsCheck = await db.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name IN ('ativo', 'bloqueado')
      `);
      
      const existingColumns = columnsCheck.rows.map(r => r.column_name);
      const hasAtivo = existingColumns.includes('ativo');
      const hasBloqueado = existingColumns.includes('bloqueado');

      const fields = [];
      const values = [];
      let paramCount = 1;

      if (data.ativo !== undefined && hasAtivo) {
        fields.push(`ativo = $${paramCount++}`);
        values.push(data.ativo);
      }
      if (data.bloqueado !== undefined && hasBloqueado) {
        fields.push(`bloqueado = $${paramCount++}`);
        values.push(data.bloqueado);
      }
      if (data.is_admin !== undefined) {
        fields.push(`is_admin = $${paramCount++}`);
        values.push(data.is_admin);
      }

      if (fields.length === 0) {
        console.warn('Nenhum campo para atualizar');
        return null;
      }

      values.push(id);
      
      let returnFields = 'id, nome, email, is_admin';
      if (hasAtivo) returnFields += ', ativo';
      if (hasBloqueado) returnFields += ', bloqueado';
      
      const query = `UPDATE users SET ${fields.join(', ')} WHERE id = $${paramCount} RETURNING ${returnFields}`;
      
      console.log('Executando query:', query);
      console.log('Valores:', values);
      
      const result = await db.query(query, values);
      
      if (!result.rows[0]) return null;
      
      const user = result.rows[0];
      // Garante valores padrão
      return {
        ...user,
        ativo: hasAtivo ? (user.ativo !== undefined ? user.ativo : true) : true,
        bloqueado: hasBloqueado ? (user.bloqueado !== undefined ? user.bloqueado : false) : false
      };
    } catch (error) {
      console.error('Erro ao atualizar status do usuário:', error);
      throw error;
    }
  }

  static async resetPassword(id, novaSenha) {
    const senhaHash = await bcrypt.hash(novaSenha, 10);
    const result = await db.query(
      'UPDATE users SET senha_hash = $1 WHERE id = $2 RETURNING id, nome, email',
      [senhaHash, id]
    );
    return result.rows[0] || null;
  }

  static async getStats() {
    try {
      // Verifica se os campos existem
      const columnsCheck = await db.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name IN ('ativo', 'bloqueado')
      `);
      
      const existingColumns = columnsCheck.rows.map(r => r.column_name);
      const hasAtivo = existingColumns.includes('ativo');
      const hasBloqueado = existingColumns.includes('bloqueado');

      const [total] = await Promise.all([
        db.query('SELECT COUNT(*) as total FROM users')
      ]);

      let ativos = { rows: [{ total: total.rows[0].total }] };
      let inativos = { rows: [{ total: '0' }] };
      let bloqueados = { rows: [{ total: '0' }] };

      if (hasAtivo) {
        const [ativosResult, inativosResult] = await Promise.all([
          db.query('SELECT COUNT(*) as total FROM users WHERE ativo = true'),
          db.query('SELECT COUNT(*) as total FROM users WHERE ativo = false')
        ]);
        ativos = ativosResult;
        inativos = inativosResult;
      }

      if (hasBloqueado) {
        const bloqueadosResult = await db.query('SELECT COUNT(*) as total FROM users WHERE bloqueado = true');
        bloqueados = bloqueadosResult;
      }

      return {
        total: parseInt(total.rows[0].total),
        ativos: parseInt(ativos.rows[0].total),
        inativos: parseInt(inativos.rows[0].total),
        bloqueados: parseInt(bloqueados.rows[0].total)
      };
    } catch (error) {
      console.error('Erro ao buscar estatísticas:', error);
      const total = await db.query('SELECT COUNT(*) as total FROM users');
      return {
        total: parseInt(total.rows[0].total),
        ativos: parseInt(total.rows[0].total),
        inativos: 0,
        bloqueados: 0
      };
    }
  }

  static async verifyPassword(senha, hash) {
    return await bcrypt.compare(senha, hash);
  }

  static async update(id, data) {
    const fields = [];
    const values = [];
    let paramCount = 1;

    if (data.nome) {
      fields.push(`nome = $${paramCount++}`);
      values.push(data.nome);
    }
    if (data.email) {
      fields.push(`email = $${paramCount++}`);
      values.push(data.email);
    }
    if (data.senha) {
      const senhaHash = await bcrypt.hash(data.senha, 10);
      fields.push(`senha_hash = $${paramCount++}`);
      values.push(senhaHash);
    }
    // Campos de perfil
    if (data.telefone !== undefined) {
      fields.push(`telefone = $${paramCount++}`);
      values.push(data.telefone || null);
    }
    if (data.whatsapp !== undefined) {
      fields.push(`whatsapp = $${paramCount++}`);
      values.push(data.whatsapp || null);
    }
    if (data.empresa !== undefined) {
      fields.push(`empresa = $${paramCount++}`);
      values.push(data.empresa || null);
    }
    if (data.cargo !== undefined) {
      fields.push(`cargo = $${paramCount++}`);
      values.push(data.cargo || null);
    }
    if (data.observacoes !== undefined) {
      fields.push(`observacoes = $${paramCount++}`);
      values.push(data.observacoes || null);
    }
    if (data.instagram !== undefined) {
      fields.push(`instagram = $${paramCount++}`);
      values.push(data.instagram || null);
    }

    if (fields.length === 0) return null;

    fields.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);
    
    // Retorna todos os campos de perfil
    const returnFields = 'id, nome, email, is_admin, telefone, whatsapp, empresa, cargo, observacoes, instagram, created_at, updated_at';
    const query = `UPDATE users SET ${fields.join(', ')} WHERE id = $${paramCount} RETURNING ${returnFields}`;
    
    const result = await db.query(query, values);
    return result.rows[0] || null;
  }

  /**
   * Busca perfil completo do usuário (incluindo campos adicionais)
   */
  static async findProfileById(id) {
    try {
      // Verifica quais campos existem
      const columnsCheck = await db.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'users'
      `);
      
      const existingColumns = columnsCheck.rows.map(r => r.column_name);
      
      let selectFields = 'id, nome, email, is_admin, created_at, updated_at';
      const profileFields = ['telefone', 'whatsapp', 'empresa', 'cargo', 'observacoes', 'instagram', 'ativo', 'bloqueado', 'last_login'];
      
      profileFields.forEach(field => {
        if (existingColumns.includes(field)) {
          selectFields += `, ${field}`;
        }
      });

      const result = await db.query(
        `SELECT ${selectFields} FROM users WHERE id = $1`,
        [id]
      );
      
      if (!result.rows[0]) return null;

      const user = result.rows[0];
      // Garante valores padrão para campos que podem não existir
      return {
        ...user,
        telefone: user.telefone || null,
        whatsapp: user.whatsapp || null,
        empresa: user.empresa || null,
        cargo: user.cargo || null,
        observacoes: user.observacoes || null,
        instagram: user.instagram || null,
        ativo: user.ativo !== undefined ? user.ativo : true,
        bloqueado: user.bloqueado !== undefined ? user.bloqueado : false,
        last_login: user.last_login || null
      };
    } catch (error) {
      console.error('Erro ao buscar perfil do usuário:', error);
      return null;
    }
  }
}

module.exports = User;

