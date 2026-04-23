const mongoose = require("mongoose");

const ChamadoSchema = new mongoose.Schema({

  titulo: { type: String, required: true },

  descricao: { type: String, required: true },

  categoria: {
    type: String,
    enum: ["Hardware", "Software", "Rede", "Impressora", "Outro"],
    default: "Outro"
  },
  empresa: String,
setor: String,
numero: String,
arquivo: String,

  status: {
    type: String,
    enum: ["aberto", "andamento", "fechado"],
    default: "aberto"
  },

  // 🔥 mantém compatibilidade com seus chamados antigos
  criadoEm: {
    type: Date,
    default: Date.now
  },

  usuario: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },

  tecnico: {
  type: mongoose.Schema.Types.ObjectId,
  ref: "User",
  default: null
},


  mensagens: [
    {
      autor: String,
      texto: String,
      nome: String,
      data: {
        type: Date,
        default: Date.now
      }
    }
  ]

}, { timestamps: true }); // 🔥 NOVO (PROFISSIONAL)



module.exports = mongoose.model("Chamado", ChamadoSchema);

