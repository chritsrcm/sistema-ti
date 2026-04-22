const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const path = require("path");

const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// BANCO DE DADOS
mongoose.connect("mongodb://ADMIN:12345@ac-valttbo-shard-00-00.2x7yeza.mongodb.net:27017,ac-valttbo-shard-00-01.2x7yeza.mongodb.net:27017,ac-valttbo-shard-00-02.2x7yeza.mongodb.net:27017/sistema-ti?ssl=true&replicaSet=atlas-kfmx88-shard-0&authSource=admin&retryWrites=true&w=majority")
.then(() => console.log("Banco conectado"))
.catch(err => console.log(err));

// modelo de chamado
const User = require("./models/User");
const Chamado = require("./models/Chamado");

// AUTHENTICAÇÂO
function auth(req, res, next) {
  let token = req.headers.authorization;

  if (!token) return res.status(401).json({ error: "Sem token" });

  if (token.startsWith("Bearer ")) {
    token = token.replace("Bearer ", "");
  }

  try {
    const decoded = jwt.verify(token, "segredo_super_secreto");
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ error: "Token inválido" });
  }
}

// PERMITIR VER USUARIOS TECNICO E ADMIN
function somenteTecnico(req, res, next) {
  if (req.user.role !== "tecnico" && req.user.role !== "admin") {
    return res.status(403).json({ error: "Acesso negado" });
  }
  next();
}

// ADMINISTRADOR
function somenteAdmin(req, res, next) {
  if (req.user.role !== "admin") {
    return res.status(403).json({ error: "Apenas admin" });
  }
  next();
}

// Inicial
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "login.html"));
});

// Criar seu acesso
app.post("/register", async (req, res) => {
  try {
    const { nome, email, senha } = req.body;

    const existe = await User.findOne({ email });
    if (existe) return res.status(400).json({ error: "Email já cadastrado" });

    const senhaHash = await bcrypt.hash(senha, 10);

    const user = new User({
      nome,
      email,
      senha: senhaHash,
      role: "usuario"
    });

    await user.save();

    res.json({ message: "Usuário criado!" });

  } catch {
    res.status(500).json({ error: "Erro no cadastro" });
  }
});

// LOGIN
app.post("/login", async (req, res) => {
  try {
    const { email, senha } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ error: "Usuário não encontrado" });

    const senhaValida = await bcrypt.compare(senha, user.senha);
    if (!senhaValida) return res.status(400).json({ error: "Senha incorreta" });

    const token = jwt.sign(
      { id: user._id, role: user.role },
      "segredo_super_secreto",
      { expiresIn: "1d" }
    );

    res.json({ token });

  } catch {
    res.status(500).json({ error: "Erro no login" });
  }
});

// PERFIL
app.get("/perfil", auth, async (req, res) => {
  const user = await User.findById(req.user.id);
  res.json(user);
});

// CHAMADOS
app.post("/chamados", auth, async (req, res) => {
  const { titulo, descricao, categoria } = req.body;

  const chamado = new Chamado({
    titulo,
    descricao,
    categoria,
    usuario: req.user.id
  });

  await chamado.save();
  res.json({ message: "Chamado criado!" });
});

app.get("/chamados", auth, async (req, res) => {
  let chamados;

  if (req.user.role === "tecnico" || req.user.role === "admin") {
    chamados = await Chamado.find();
  } else {
    chamados = await Chamado.find({ usuario: req.user.id });
  }

  res.json(chamados);
});

app.post("/chamados/:id/mensagem", auth, async (req, res) => {
  const chamado = await Chamado.findById(req.params.id);

  const user = await User.findById(req.user.id);

chamado.mensagens.push({
  autor: req.user.role,
  nome: user.nome, // 🔥 NOME AQUI
  texto
});
  await chamado.save();

  res.json({ message: "Mensagem enviada!" });
});

// Colocar o usuario em lista na aba de user
app.get("/usuarios", auth, somenteTecnico, async (req, res) => {
  try {
    const users = await User.find().select("-senha");
    res.json(users);
  } catch {
    res.status(500).json({ error: "Erro ao buscar usuários" });
  }
});

// Promovendo usuario de função
app.put("/promover/:id", auth, somenteAdmin, async (req, res) => {
  await User.findByIdAndUpdate(req.params.id, { role: "tecnico" });
  res.json({ message: "Promovido!" });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("Servidor rodando...");
});