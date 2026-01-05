/**
 * UTILITÁRIO: EmailValidator
 * Valida e normaliza emails preservando pontos e convertendo para minúsculas
 */

/**
 * Regex robusto para validação de email
 * Valida formato completo incluindo caracteres especiais permitidos
 */
const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

/**
 * Valida se um email tem formato válido
 * @param {String} email - Email para validar
 * @returns {Boolean} True se o email é válido
 */
function isValidEmailFormat(email) {
  if (!email || typeof email !== 'string') {
    return false;
  }
  
  // Remove espaços em branco
  const trimmedEmail = email.trim();
  
  // Verifica se está vazio após trim
  if (trimmedEmail.length === 0) {
    return false;
  }
  
  // Verifica comprimento máximo (RFC 5321)
  if (trimmedEmail.length > 254) {
    return false;
  }
  
  // Valida formato usando regex
  return EMAIL_REGEX.test(trimmedEmail);
}

/**
 * Normaliza email: converte para minúsculas e remove espaços
 * PRESERVA PONTOS (não remove como normalizeEmail do express-validator)
 * @param {String} email - Email para normalizar
 * @returns {String|null} Email normalizado ou null se inválido
 */
function normalizeEmail(email) {
  if (!email || typeof email !== 'string') {
    return null;
  }
  
  // Remove espaços em branco
  const trimmed = email.trim();
  
  // Verifica se está vazio
  if (trimmed.length === 0) {
    return null;
  }
  
  // Converte para minúsculas (preserva pontos e outros caracteres)
  const normalized = trimmed.toLowerCase();
  
  // Valida formato antes de retornar
  if (!isValidEmailFormat(normalized)) {
    return null;
  }
  
  return normalized;
}

/**
 * Valida e normaliza email em uma única função
 * @param {String} email - Email para validar e normalizar
 * @returns {Object} { valid: Boolean, normalized: String|null, error: String|null }
 */
function validateAndNormalizeEmail(email) {
  if (!email || typeof email !== 'string') {
    return {
      valid: false,
      normalized: null,
      error: 'Email é obrigatório'
    };
  }
  
  const trimmed = email.trim();
  
  if (trimmed.length === 0) {
    return {
      valid: false,
      normalized: null,
      error: 'Email não pode estar vazio'
    };
  }
  
  if (trimmed.length > 254) {
    return {
      valid: false,
      normalized: null,
      error: 'Email muito longo (máximo 254 caracteres)'
    };
  }
  
  if (!isValidEmailFormat(trimmed)) {
    return {
      valid: false,
      normalized: null,
      error: 'Formato de email inválido'
    };
  }
  
  const normalized = trimmed.toLowerCase();
  
  return {
    valid: true,
    normalized: normalized,
    error: null
  };
}

module.exports = {
  isValidEmailFormat,
  normalizeEmail,
  validateAndNormalizeEmail
};

