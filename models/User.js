const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
  nome: String,

  email: {
    type: String,
    unique: true
  },

  senha: String,

  role: {
    type: String,
    enum: ["usuario", "tecnico", "admin"],
    default: "usuario"
  }
});

module.exports = mongoose.model("User", UserSchema);