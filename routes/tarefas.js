/**
 * ROTAS: Tarefas
 */

const express = require('express');
const router = express.Router();
const TarefasController = require('../controllers/tarefasController');
const { requireAuth } = require('../middleware/auth');
const { body } = require('express-validator');

// Validações para criação completa
const validarTarefa = [
  body('nome')
    .trim()
    .notEmpty()
    .withMessage('Nome da tarefa é obrigatório')
    .isLength({ max: 255 })
    .withMessage('Nome muito longo'),
  body('data_vencimento')
    .notEmpty()
    .withMessage('Data de vencimento é obrigatória')
    .isISO8601()
    .withMessage('Data inválida'),
  body('prioridade')
    .optional()
    .isIn(['alta', 'media', 'baixa'])
    .withMessage('Prioridade inválida'),
  body('status')
    .optional()
    .isIn(['nao_iniciado', 'em_andamento', 'feito'])
    .withMessage('Status inválido'),
  body('tipo')
    .optional()
    .isLength({ max: 50 })
    .withMessage('Tipo muito longo'),
  body('data_conclusao')
    .optional()
    .isISO8601()
    .withMessage('Data de conclusão inválida')
];

// Validação para atualização (mais flexível)
const validarTarefaUpdate = [
  body('nome')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Nome da tarefa não pode ser vazio')
    .isLength({ max: 255 })
    .withMessage('Nome muito longo'),
  body('data_vencimento')
    .optional()
    .isISO8601()
    .withMessage('Data inválida'),
  body('prioridade')
    .optional()
    .isIn(['alta', 'media', 'baixa'])
    .withMessage('Prioridade inválida'),
  body('status')
    .optional()
    .isIn(['nao_iniciado', 'em_andamento', 'feito'])
    .withMessage('Status inválido'),
  body('tipo')
    .optional()
    .isLength({ max: 50 })
    .withMessage('Tipo muito longo'),
  body('data_conclusao')
    .optional()
    .custom((value) => {
      if (value === null || value === '') return true;
      return /^\d{4}-\d{2}-\d{2}$/.test(value);
    })
    .withMessage('Data de conclusão inválida'),
  body('descricao')
    .optional()
];

router.get('/', requireAuth, TarefasController.index);
router.get('/api/calendario', requireAuth, TarefasController.getForCalendar);
router.get('/api/stats', requireAuth, TarefasController.getStats);
router.get('/api/:id', requireAuth, TarefasController.show);
router.post('/', requireAuth, validarTarefa, TarefasController.create);
router.put('/:id', requireAuth, validarTarefaUpdate, TarefasController.update);
router.delete('/:id', requireAuth, TarefasController.delete);
router.post('/update-order', requireAuth, TarefasController.updateOrder);

module.exports = router;

