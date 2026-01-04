/**
 * ROTAS: Checklists
 */

const express = require('express');
const router = express.Router();
const ChecklistController = require('../controllers/checklistController');
const { requireActiveSubscription } = require('../middleware/auth');

router.get('/', requireActiveSubscription, ChecklistController.index);
router.get('/custom/:id', requireActiveSubscription, ChecklistController.showCustom);
router.get('/:tipo', requireActiveSubscription, ChecklistController.show);
router.post('/criar', requireActiveSubscription, ChecklistController.criar);
router.post('/criar-custom', requireActiveSubscription, ChecklistController.criarCustom);
router.post('/atualizar-custom', requireActiveSubscription, ChecklistController.atualizarCustom);
router.post('/deletar', requireActiveSubscription, ChecklistController.deletar);
router.post('/item/concluir', requireActiveSubscription, ChecklistController.concluirItem);
router.post('/atualizar', requireActiveSubscription, ChecklistController.atualizarChecklist);
router.post('/item/atualizar', requireActiveSubscription, ChecklistController.atualizarItem);
router.post('/item/adicionar', requireActiveSubscription, ChecklistController.adicionarItem);
router.post('/item/remover', requireActiveSubscription, ChecklistController.removerItem);

module.exports = router;

