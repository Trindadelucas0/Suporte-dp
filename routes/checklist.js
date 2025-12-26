/**
 * ROTAS: Checklists
 */

const express = require('express');
const router = express.Router();
const ChecklistController = require('../controllers/checklistController');
const { requireAuth } = require('../middleware/auth');

router.get('/', requireAuth, ChecklistController.index);
router.get('/custom/:id', requireAuth, ChecklistController.showCustom);
router.get('/:tipo', requireAuth, ChecklistController.show);
router.post('/criar', requireAuth, ChecklistController.criar);
router.post('/criar-custom', requireAuth, ChecklistController.criarCustom);
router.post('/atualizar-custom', requireAuth, ChecklistController.atualizarCustom);
router.post('/deletar', requireAuth, ChecklistController.deletar);
router.post('/item/concluir', requireAuth, ChecklistController.concluirItem);
router.post('/atualizar', requireAuth, ChecklistController.atualizarChecklist);
router.post('/item/atualizar', requireAuth, ChecklistController.atualizarItem);
router.post('/item/adicionar', requireAuth, ChecklistController.adicionarItem);
router.post('/item/remover', requireAuth, ChecklistController.removerItem);

module.exports = router;

