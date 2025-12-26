/**
 * CONTROLLER: ChecklistController
 * Gerencia checklists de processos
 */

const db = require("../config/database");

class ChecklistController {
  static async index(req, res) {
    const userId = req.session.user.id;

    try {
      const checklists = await db.query(
        `SELECT c.*, 
         COUNT(ci.id) as total_itens,
         COUNT(CASE WHEN ci.concluido THEN 1 END) as itens_concluidos
         FROM checklists c
         LEFT JOIN checklist_itens ci ON c.id = ci.checklist_id
         WHERE c.user_id = $1
         GROUP BY c.id
         ORDER BY c.created_at DESC`,
        [userId]
      );

      res.render("checklist/index", {
        title: "Checklists de Processos - Suporte DP",
        checklists: checklists.rows,
      });
    } catch (error) {
      console.error("Erro ao buscar checklists:", error);
      res.render("checklist/index", {
        title: "Checklists de Processos - Suporte DP",
        checklists: [],
      });
    }
  }

  static async show(req, res) {
    const userId = req.session.user.id;
    const { tipo } = req.params;

    // Templates de checklists
    const templates = {
      admissao: {
        titulo: "Checklist de Admissão",
        itens: [
          "Coleta de documentos pessoais (RG, CPF, CTPS)",
          "Verificação de antecedentes criminais (se aplicável)",
          "Exame admissional (ASO) - Atestado de Saúde Ocupacional",
          "Registro na CTPS Digital",
          "Cadastro no eSocial (evento S-2200)",
          "Assinatura de contrato de trabalho",
          "Cadastro em sistemas internos da empresa",
          "Entrega de uniforme/EPI (se aplicável)",
          "Treinamento de boas-vindas e integração",
          "Comunicação ao sindicato (se aplicável)",
          "Cadastro no sistema de ponto (se aplicável)",
          "Entrega de crachá e credenciais de acesso",
        ],
      },
      rescisao: {
        titulo: "Checklist de Rescisão",
        itens: [
          "Aviso prévio trabalhado ou indenizado (se aplicável)",
          "Exame demissional (ASO) - Atestado de Saúde Ocupacional",
          "Cálculo completo de rescisão (férias, 13º, aviso prévio, etc.)",
          "Solicitação de chave FGTS (se aplicável)",
          "Encerramento no eSocial (evento S-2299)",
          "Entrega de documentos trabalhistas (CTPS, certidões)",
          "Quitação de férias proporcionais e 13º salário",
          "Baixa em sistemas internos da empresa",
          "Entrega de uniforme/EPI (se aplicável)",
          "Devolução de equipamentos e materiais",
          "Comunicação ao sindicato (se aplicável)",
          "Arquivo de documentação completa",
        ],
      },
      afastamento_inss: {
        titulo: "Checklist de Afastamento por INSS",
        itens: [
          "Recebimento do atestado médico ou comunicação de afastamento",
          "Verificação da validade do atestado médico",
          "Registro do afastamento no eSocial (evento S-2230)",
          "Suspensão do contrato de trabalho",
          "Cálculo de avos de 13º considerando o afastamento",
          "Verificação de direito a auxílio-doença",
          "Comunicação ao setor de benefícios (se aplicável)",
          "Acompanhamento do prazo de afastamento",
          "Preparação para retorno ao trabalho (quando aplicável)",
          "Exame de retorno ao trabalho (ASO)",
          "Reintegração no eSocial (evento S-2231)",
          "Atualização de dados no sistema interno",
        ],
      },
    };

    const template = templates[tipo];
    if (!template) {
      return res.redirect("/checklist");
    }

    try {
      // Busca checklist existente ou cria novo
      let checklist = await db.query(
        "SELECT * FROM checklists WHERE user_id = $1 AND tipo = $2 ORDER BY created_at DESC LIMIT 1",
        [userId, tipo]
      );

      let checklistId;
      if (checklist.rows.length === 0) {
        // Cria novo checklist
        const novoChecklist = await db.query(
          "INSERT INTO checklists (user_id, tipo, titulo) VALUES ($1, $2, $3) RETURNING *",
          [userId, tipo, template.titulo]
        );
        checklistId = novoChecklist.rows[0].id;

        // Cria itens
        for (let i = 0; i < template.itens.length; i++) {
          await db.query(
            "INSERT INTO checklist_itens (checklist_id, item, ordem) VALUES ($1, $2, $3)",
            [checklistId, template.itens[i], i + 1]
          );
        }
      } else {
        checklistId = checklist.rows[0].id;
      }

      // Busca itens
      const itens = await db.query(
        "SELECT * FROM checklist_itens WHERE checklist_id = $1 ORDER BY ordem",
        [checklistId]
      );

      res.render("checklist/show", {
        title: template.titulo + " - Suporte DP",
        checklist: checklist.rows[0] || {
          id: checklistId,
          tipo,
          titulo: template.titulo,
        },
        itens: itens.rows,
      });
    } catch (error) {
      console.error("Erro ao carregar checklist:", error);
      res.redirect("/checklist");
    }
  }

  static async criar(req, res) {
    const userId = req.session.user.id;
    const { tipo, titulo } = req.body;

    try {
      const resultado = await db.query(
        "INSERT INTO checklists (user_id, tipo, titulo) VALUES ($1, $2, $3) RETURNING *",
        [userId, tipo, titulo]
      );

      res.json({ success: true, data: resultado.rows[0] });
    } catch (error) {
      console.error("Erro ao criar checklist:", error);
      res.status(500).json({ error: "Erro ao criar checklist" });
    }
  }

  static async concluirItem(req, res) {
    const userId = req.session.user.id;
    const { itemId, concluido } = req.body;

    try {
      // Verifica se o item pertence ao usuário
      const item = await db.query(
        `SELECT ci.* FROM checklist_itens ci
         JOIN checklists c ON ci.checklist_id = c.id
         WHERE ci.id = $1 AND c.user_id = $2`,
        [itemId, userId]
      );

      if (item.rows.length === 0) {
        return res.status(404).json({ error: "Item não encontrado" });
      }

      await db.query(
        "UPDATE checklist_itens SET concluido = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2",
        [concluido === "true", itemId]
      );

      res.json({ success: true });
    } catch (error) {
      console.error("Erro ao atualizar item:", error);
      res.status(500).json({ error: "Erro ao atualizar item" });
    }
  }

  static async atualizarChecklist(req, res) {
    const userId = req.session.user.id;
    const { checklistId, titulo, descricao } = req.body;

    try {
      // Verifica se o checklist pertence ao usuário
      const checklist = await db.query(
        "SELECT * FROM checklists WHERE id = $1 AND user_id = $2",
        [checklistId, userId]
      );

      if (checklist.rows.length === 0) {
        return res.status(404).json({ error: "Checklist não encontrado" });
      }

      // Atualiza apenas o título se fornecido, mantém descricao se não fornecida
      if (titulo) {
        await db.query(
          "UPDATE checklists SET titulo = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2",
          [titulo, checklistId]
        );
      } else if (descricao !== undefined) {
        await db.query(
          "UPDATE checklists SET descricao = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2",
          [descricao, checklistId]
        );
      }

      res.json({ success: true });
    } catch (error) {
      console.error("Erro ao atualizar checklist:", error);
      res.status(500).json({ error: "Erro ao atualizar checklist" });
    }
  }

  static async atualizarItem(req, res) {
    const userId = req.session.user.id;
    const { itemId, item, observacao } = req.body;

    try {
      // Verifica se o item pertence ao usuário
      const itemCheck = await db.query(
        `SELECT ci.* FROM checklist_itens ci
         JOIN checklists c ON ci.checklist_id = c.id
         WHERE ci.id = $1 AND c.user_id = $2`,
        [itemId, userId]
      );

      if (itemCheck.rows.length === 0) {
        return res.status(404).json({ error: "Item não encontrado" });
      }

      await db.query(
        "UPDATE checklist_itens SET item = $1, observacao = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3",
        [item, observacao, itemId]
      );

      res.json({ success: true });
    } catch (error) {
      console.error("Erro ao atualizar item:", error);
      res.status(500).json({ error: "Erro ao atualizar item" });
    }
  }

  static async adicionarItem(req, res) {
    const userId = req.session.user.id;
    const { checklistId, item } = req.body;

    try {
      // Verifica se o checklist pertence ao usuário
      const checklist = await db.query(
        "SELECT * FROM checklists WHERE id = $1 AND user_id = $2",
        [checklistId, userId]
      );

      if (checklist.rows.length === 0) {
        return res.status(404).json({ error: "Checklist não encontrado" });
      }

      // Pega a última ordem
      const ultimoItem = await db.query(
        "SELECT MAX(ordem) as max_ordem FROM checklist_itens WHERE checklist_id = $1",
        [checklistId]
      );

      const novaOrdem = (ultimoItem.rows[0].max_ordem || 0) + 1;

      const resultado = await db.query(
        "INSERT INTO checklist_itens (checklist_id, item, ordem) VALUES ($1, $2, $3) RETURNING *",
        [checklistId, item, novaOrdem]
      );

      res.json({ success: true, data: resultado.rows[0] });
    } catch (error) {
      console.error("Erro ao adicionar item:", error);
      res.status(500).json({ error: "Erro ao adicionar item" });
    }
  }

  static async removerItem(req, res) {
    const userId = req.session.user.id;
    const { itemId } = req.body;

    try {
      // Verifica se o item pertence ao usuário
      const itemCheck = await db.query(
        `SELECT ci.* FROM checklist_itens ci
         JOIN checklists c ON ci.checklist_id = c.id
         WHERE ci.id = $1 AND c.user_id = $2`,
        [itemId, userId]
      );

      if (itemCheck.rows.length === 0) {
        return res.status(404).json({ error: "Item não encontrado" });
      }

      await db.query("DELETE FROM checklist_itens WHERE id = $1", [itemId]);

      res.json({ success: true });
    } catch (error) {
      console.error("Erro ao remover item:", error);
      res.status(500).json({ error: "Erro ao remover item" });
    }
  }

  // CRUD Completo de Checklists
  static async criarCustom(req, res) {
    const userId = req.session.user.id;
    const { titulo, tipo, itens } = req.body;

    try {
      if (!titulo || !titulo.trim()) {
        return res.status(400).json({ error: "Título é obrigatório" });
      }

      // Cria o checklist
      const resultado = await db.query(
        "INSERT INTO checklists (user_id, tipo, titulo) VALUES ($1, $2, $3) RETURNING *",
        [userId, tipo || "custom", titulo.trim()]
      );

      const checklistId = resultado.rows[0].id;

      // Cria os itens se fornecidos
      if (itens && Array.isArray(itens) && itens.length > 0) {
        for (let i = 0; i < itens.length; i++) {
          await db.query(
            "INSERT INTO checklist_itens (checklist_id, item, ordem) VALUES ($1, $2, $3)",
            [checklistId, itens[i], i + 1]
          );
        }
      }

      res.json({ success: true, data: resultado.rows[0] });
    } catch (error) {
      console.error("Erro ao criar checklist customizado:", error);
      res.status(500).json({ error: "Erro ao criar checklist" });
    }
  }

  static async atualizarCustom(req, res) {
    const userId = req.session.user.id;
    const { checklistId, titulo, tipo } = req.body;

    try {
      // Verifica se o checklist pertence ao usuário
      const checklist = await db.query(
        "SELECT * FROM checklists WHERE id = $1 AND user_id = $2",
        [checklistId, userId]
      );

      if (checklist.rows.length === 0) {
        return res.status(404).json({ error: "Checklist não encontrado" });
      }

      // Atualiza
      await db.query(
        "UPDATE checklists SET titulo = $1, tipo = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3",
        [titulo.trim(), tipo || "custom", checklistId]
      );

      res.json({ success: true });
    } catch (error) {
      console.error("Erro ao atualizar checklist:", error);
      res.status(500).json({ error: "Erro ao atualizar checklist" });
    }
  }

  static async deletar(req, res) {
    const userId = req.session.user.id;
    const { checklistId } = req.body;

    try {
      // Verifica se o checklist pertence ao usuário
      const checklist = await db.query(
        "SELECT * FROM checklists WHERE id = $1 AND user_id = $2",
        [checklistId, userId]
      );

      if (checklist.rows.length === 0) {
        return res.status(404).json({ error: "Checklist não encontrado" });
      }

      // Deleta os itens primeiro
      await db.query("DELETE FROM checklist_itens WHERE checklist_id = $1", [
        checklistId,
      ]);

      // Deleta o checklist
      await db.query("DELETE FROM checklists WHERE id = $1", [checklistId]);

      res.json({ success: true });
    } catch (error) {
      console.error("Erro ao deletar checklist:", error);
      res.status(500).json({ error: "Erro ao deletar checklist" });
    }
  }

  static async showCustom(req, res) {
    const userId = req.session.user.id;
    const { id } = req.params;

    try {
      // Busca checklist
      const checklist = await db.query(
        "SELECT * FROM checklists WHERE id = $1 AND user_id = $2",
        [id, userId]
      );

      if (checklist.rows.length === 0) {
        return res.redirect("/checklist");
      }

      // Busca itens
      const itens = await db.query(
        "SELECT * FROM checklist_itens WHERE checklist_id = $1 ORDER BY ordem",
        [id]
      );

      res.render("checklist/show", {
        title: checklist.rows[0].titulo + " - Suporte DP",
        checklist: checklist.rows[0],
        itens: itens.rows,
      });
    } catch (error) {
      console.error("Erro ao carregar checklist:", error);
      res.redirect("/checklist");
    }
  }
}

module.exports = ChecklistController;
