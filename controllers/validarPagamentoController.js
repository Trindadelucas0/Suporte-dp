/**
 * CONTROLLER: ValidarPagamentoController
 * Valida token de pagamento e libera acesso ao sistema
 */

const PaymentToken = require('../models/PaymentToken');
const Order = require('../models/Order');
const User = require('../models/User');
const db = require('../config/database');

class ValidarPagamentoController {
  /**
   * Página de validação de token (GET)
   * GET /validar-pagamento
   */
  static async index(req, res) {
    const { token, email, from } = req.query;
    
    // Se vier do login e usuário está logado, usa email da sessão
    let emailToUse = email;
    if (from === 'login' && req.session && req.session.user) {
      emailToUse = req.session.user.email;
    }
    
    return res.render('auth/validar-pagamento', {
      title: 'Validar Pagamento - Suporte DP',
      token: token || null,
      email: emailToUse || null,
      error: null,
      success: from === 'login' ? 'Digite o token recebido por email para completar o login.' : null,
      from: from || null
    });
  }

  /**
   * Processa validação de token (POST)
   * POST /validar-pagamento
   */
  static async validar(req, res) {
    const { token, email } = req.body;

    // Validações básicas
    if (!token || !email) {
      return res.render('auth/validar-pagamento', {
        title: 'Validar Pagamento - Suporte DP',
        token: token || null,
        email: email || null,
        error: 'Token e email são obrigatórios',
        success: null
      });
    }

    try {
      // 1. Buscar token no banco
      const paymentToken = await PaymentToken.findByToken(token);

      if (!paymentToken) {
        return res.render('auth/validar-pagamento', {
          title: 'Validar Pagamento - Suporte DP',
          token: token,
          email: email,
          error: 'Token inválido',
          success: null
        });
      }

      // 2. Verificar se token já foi usado
      if (paymentToken.used) {
        return res.render('auth/validar-pagamento', {
          title: 'Validar Pagamento - Suporte DP',
          token: token,
          email: email,
          error: 'Este token já foi utilizado',
          success: null
        });
      }

      // 3. Verificar se token expirou
      const now = new Date();
      const expiresAt = new Date(paymentToken.expires_at);
      if (now > expiresAt) {
        return res.render('auth/validar-pagamento', {
          title: 'Validar Pagamento - Suporte DP',
          token: token,
          email: email,
          error: 'Token expirado. Solicite um novo token.',
          success: null
        });
      }

      // 4. Verificar se email corresponde ao token
      if (paymentToken.email.toLowerCase() !== email.toLowerCase()) {
        return res.render('auth/validar-pagamento', {
          title: 'Validar Pagamento - Suporte DP',
          token: token,
          email: email,
          error: 'Email não corresponde ao token',
          success: null
        });
      }

      // 5. Buscar pedido
      const order = await Order.findByOrderNsu(paymentToken.order_nsu);
      if (!order) {
        return res.render('auth/validar-pagamento', {
          title: 'Validar Pagamento - Suporte DP',
          token: token,
          email: email,
          error: 'Pedido não encontrado',
          success: null
        });
      }

      // 6. Processar em transação: marcar token como usado e atualizar/criar usuário
      await db.transaction(async (client) => {
        // 6.1. Marcar token como usado
        await PaymentToken.markAsUsed(token);

        // 6.2. Verificar se usuário já existe (por email)
        const existingUserResult = await client.query(
          'SELECT id, nome, email, subscription_status FROM users WHERE email = $1',
          [email.toLowerCase()]
        );
        const existingUser = existingUserResult.rows[0];

        if (existingUser) {
          // Usuário já existe - atualizar assinatura
          const nextBillingDate = new Date();
          nextBillingDate.setDate(nextBillingDate.getDate() + 30);

          await client.query(
            `UPDATE users 
             SET subscription_status = $1, 
                 subscription_expires_at = $2,
                 status = $3,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $4`,
            ['ativa', nextBillingDate.toISOString().split('T')[0], 'ativo', existingUser.id]
          );

          console.log('✅ Assinatura atualizada para usuário existente:', existingUser.id);
          
          // Login automático
          req.session.user = {
            id: existingUser.id,
            nome: existingUser.nome,
            email: existingUser.email,
            is_admin: existingUser.is_admin || false
          };
          req.session.lastActivity = Date.now();
        } else {
          // Usuário não existe - redirecionar para cadastro com token válido
          // Salvar token na sessão para usar no cadastro
          req.session.pendingToken = token;
          req.session.pendingEmail = email;
          req.session.pendingOrderNsu = paymentToken.order_nsu;
          
          console.log('✅ Token validado - redirecionando para cadastro');
          
          // Redirecionar para cadastro
          req.session.save((err) => {
            if (err) {
              console.error('Erro ao salvar sessão:', err);
              return res.render('auth/validar-pagamento', {
                title: 'Validar Pagamento - Suporte DP',
                token: token,
                email: email,
                error: 'Erro ao processar validação. Tente novamente.',
                success: null
              });
            }
            
            return res.redirect('/register?token_validado=true');
          });
          return;
        }
      });

      // Se chegou aqui, usuário existe e foi atualizado
      // Remove flag de validação de token se existir (caso tenha vindo do login)
      if (req.session.requireTokenValidation) {
        delete req.session.requireTokenValidation;
      }
      
      // NÃO redireciona automaticamente para dashboard
      // Usuário precisa fazer login manualmente após validar token
      req.session.save((err) => {
        if (err) {
          console.error('Erro ao salvar sessão:', err);
          return res.render('auth/validar-pagamento', {
            title: 'Validar Pagamento - Suporte DP',
            token: token,
            email: email,
            error: 'Erro ao processar validação. Tente fazer login.',
            success: null
          });
        }
        
        // Mostra mensagem de sucesso e redireciona para login
        return res.render('auth/validar-pagamento', {
          title: 'Validar Pagamento - Suporte DP',
          token: null,
          email: email,
          error: null,
          success: 'Token validado com sucesso! Faça login para acessar o sistema.',
          from: 'validacao'
        });
      });

    } catch (error) {
      console.error('❌ Erro ao validar token:', error);
      return res.render('auth/validar-pagamento', {
        title: 'Validar Pagamento - Suporte DP',
        token: token,
        email: email,
        error: 'Erro ao processar validação. Tente novamente.',
        success: null
      });
    }
  }
}

module.exports = ValidarPagamentoController;

