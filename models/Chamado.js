// ============================================================================
// IMPORTAÇÃO DO MONGOOSE E DEFINIÇÃO DO SCHEMA DE CHAMADO
// ============================================================================
const mongoose = require("mongoose");

// Define a estrutura do documento "Chamado" no MongoDB
const ChamadoSchema = new mongoose.Schema({

  // Título do chamado - campo obrigatório
  titulo: { type: String, required: true },

  // Descrição detalhada do problema - campo obrigatório
  descricao: { type: String, required: true },

  // Categoria do chamado: restringe valores a opções pré-definidas
  categoria: {
    type: String,
    enum: ["Hardware", "Software", "Rede", "Impressora", "Outro"],
    default: "Outro"
  },

  // Informações contextuais do solicitante (opcionais)
  empresa: String,
  setor: String,
  numero: String,

  // Nome do arquivo anexado (armazenado pelo multer)
  arquivo: String,

  // Status do fluxo do chamado: restringe valores e define padrão inicial
  status: {
    type: String,
    enum: ["aberto", "andamento", "fechado"],
    default: "aberto"
  },

  // Campo de data de criação para compatibilidade com registros legados
  criadoEm: {
    type: Date,
    default: Date.now
  },

  // Referência ao usuário que abriu o chamado (relacionamento 1:N)
  usuario: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },

  // Referência ao técnico responsável pelo chamado (pode ser nulo inicialmente)
  tecnico: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null
  },

  // Array de mensagens que compõem o chat do chamado
  mensagens: [
    {
      autor: String,           // ID do autor da mensagem (armazenado como string)
      texto: String,           // Conteúdo da mensagem
      nome: String,            // Nome exibido do autor (para evitar consultas adicionais)
      data: {
        type: Date,
        default: Date.now      // Timestamp automático de cada mensagem
      }
    }
  ]

  // Opção timestamps: adiciona automaticamente createdAt e updatedAt ao documento
}, { timestamps: true });

// ============================================================================
// EXPORTAÇÃO DO MODELO PARA USO EM OUTROS MÓDULOS
// ============================================================================
module.exports = mongoose.model("Chamado", ChamadoSchema);