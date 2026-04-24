// ============================================================================
// IMPORTAÇÃO DE DEPENDÊNCIAS
// ============================================================================
const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const path = require("path");
const multer = require("multer");

// ============================================================================
// CONFIGURAÇÃO DO MULTER (UPLOAD DE ARQUIVOS)
// ============================================================================
// Define como os arquivos enviados serão armazenados no servidor
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Pasta de destino para os uploads
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    // Gera nome único para o arquivo: timestamp + nome original formatado
    cb(null, Date.now() + "-" + file.originalname
      .replace(/\s/g, "_")
      .toLowerCase()
    );
  }
});
const upload = multer({ storage });

// ============================================================================
// INICIALIZAÇÃO DO EXPRESS E CONFIGURAÇÕES GERAIS
// ============================================================================
const app = express();

// Middleware para parse de JSON nas requisições
app.use(express.json());
// Serve arquivos estáticos da pasta uploads publicamente
app.use("/uploads", express.static("uploads"));
// Serve arquivos estáticos da pasta public (frontend)
app.use(express.static(path.join(__dirname, "public")));

// ============================================================================
// CONEXÃO COM O BANCO DE DADOS MONGODB
// ============================================================================
mongoose.connect("mongodb://ADMIN:12345@ac-valttbo-shard-00-00.2x7yeza.mongodb.net:27017,ac-valttbo-shard-00-01.2x7yeza.mongodb.net:27017,ac-valttbo-shard-00-02.2x7yeza.mongodb.net:27017/sistema-ti?ssl=true&replicaSet=atlas-kfmx88-shard-0&authSource=admin&retryWrites=true&w=majority")
  .then(() => console.log("Banco conectado"))
  .catch(err => console.log(err));

// ============================================================================
// IMPORTAÇÃO DOS MODELOS DO MONGOOSE
// ============================================================================
const User = require("./models/User");
const Chamado = require("./models/Chamado");

// ============================================================================
// MIDDLEWARES DE AUTENTICAÇÃO E AUTORIZAÇÃO
// ============================================================================

// Verifica se o token JWT é válido e anexa os dados do usuário à requisição
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

// Middleware que restringe acesso apenas para usuários com perfil técnico ou admin
function somenteTecnico(req, res, next) {
  if (req.user.role !== "tecnico" && req.user.role !== "admin") {
    return res.status(403).json({ error: "Acesso negado" });
  }
  next();
}

// Middleware que restringe acesso apenas para usuários com perfil admin
function somenteAdmin(req, res, next) {
  if (req.user.role !== "admin") {
    return res.status(403).json({ error: "Apenas admin" });
  }
  next();
}

// ============================================================================
// ROTAS PÚBLICAS E DE AUTENTICAÇÃO
// ============================================================================

// Rota raiz: serve a página de login
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "login.html"));
});

// Rota para registro de novo usuário
app.post("/register", async (req, res) => {
  try {
    const { nome, email, senha } = req.body;

    // Verifica se o email já está em uso
    const existe = await User.findOne({ email });
    if (existe) return res.status(400).json({ error: "Email já cadastrado" });

    // Gera hash da senha para armazenamento seguro
    const senhaHash = await bcrypt.hash(senha, 10);

    // Cria novo usuário com perfil padrão "usuario"
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

// Rota para login e geração de token JWT
app.post("/login", async (req, res) => {
  try {
    const { email, senha } = req.body;

    // Busca usuário pelo email
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ error: "Usuário não encontrado" });

    // Valida a senha informada contra o hash armazenado
    const senhaValida = await bcrypt.compare(senha, user.senha);
    if (!senhaValida) return res.status(400).json({ error: "Senha incorreta" });

    // Gera token JWT com dados do usuário e validade de 1 dia
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

// Rota protegida para buscar dados do perfil do usuário autenticado
app.get("/perfil", auth, async (req, res) => {
  const user = await User.findById(req.user.id);
  res.json(user);
});

// ============================================================================
// ROTAS DE GERENCIAMENTO DE CHAMADOS
// ============================================================================

// Cria um novo chamado com opção de anexo de arquivo
app.post("/chamados", auth, upload.single("arquivo"), async (req, res) => {

  const titulo = req.body.titulo;
  const descricao = req.body.descricao;
  const categoria = req.body.categoria;
  const empresa = req.body.empresa;
  const setor = req.body.setor;
  const numero = req.body.numero;

  // Instancia novo chamado com dados do formulário e arquivo (se houver)
  const chamado = new Chamado({
    titulo,
    descricao,
    categoria,
    empresa,
    setor,
    numero,
    arquivo: req.file ? req.file.filename : null,
    usuario: req.user.id
  });

  await chamado.save();

  res.json({ message: "Chamado criado" });
});

// Lista chamados com regras de visualização baseadas no perfil do usuário
app.get("/chamados", auth, async (req, res) => {
  let chamados;

  if (req.user.role === "admin") {
    // Admin visualiza todos os chamados
    chamados = await Chamado.find().populate("tecnico", "nome");
  }

  else if (req.user.role === "tecnico") {
    // Técnico visualiza: chamados atribuídos a ele, chamados livres ou fechados
    chamados = await Chamado.find({
      $or: [
        { tecnico: req.user.id },
        { tecnico: null },
        { status: "fechado" }
      ]
    }).populate("tecnico", "nome");
  }

  else {
    // Usuário comum visualiza apenas seus próprios chamados
    chamados = await Chamado.find({
      usuario: req.user.id
    }).populate("tecnico", "nome");
  }

  res.json(chamados);
});

// Envia uma nova mensagem para o chat de um chamado específico
app.post("/chamados/:id/mensagem", auth, async (req, res) => {
  try {
    const { texto } = req.body;

    if (!texto) {
      return res.status(400).json({ error: "Mensagem vazia" });
    }

    const chamado = await Chamado.findById(req.params.id);

    if (!chamado) {
      return res.status(404).json({ error: "Chamado não encontrado" });
    }

    // Busca dados do usuário para registrar nome do autor da mensagem
    const user = await User.findById(req.user.id);

    // Adiciona mensagem ao array de mensagens do chamado
    chamado.mensagens.push({
      texto,
      autor: String(req.user.id),
      nome: user.nome,
      data: new Date()
    });

    await chamado.save();

    console.log("MENSAGENS:", chamado.mensagens);

    // Retorna o chamado atualizado com as novas mensagens
    const atualizado = await Chamado.findById(req.params.id);

    res.json(atualizado);

  } catch (err) {
    console.log("ERRO CHAT:", err);
    res.status(500).json({ error: "Erro ao enviar mensagem" });
  }
});

// ============================================================================
// ROTAS ADMINISTRATIVAS E DE GERENCIAMENTO DE USUÁRIOS
// ============================================================================

// Lista todos os usuários (acesso restrito a técnico e admin)
app.get("/usuarios", auth, somenteTecnico, async (req, res) => {
  try {
    // Retorna usuários sem o campo de senha por segurança
    const users = await User.find().select("-senha");
    res.json(users);
  } catch {
    res.status(500).json({ error: "Erro ao buscar usuários" });
  }
});

// Promove um usuário para o perfil técnico (acesso restrito a admin)
app.put("/promover/:id", auth, somenteAdmin, async (req, res) => {
  await User.findByIdAndUpdate(req.params.id, { role: "tecnico" });
  res.json({ message: "Promovido!" });
});

// ============================================================================
// ROTAS DE ATUALIZAÇÃO DE STATUS E ATRIBUIÇÃO DE CHAMADOS
// ============================================================================

// Altera o status de um chamado (acesso restrito a técnico e admin)
app.put("/chamados/:id/status", auth, async (req, res) => {
  try {
    const { status } = req.body;

    // Valida permissão do usuário
    if (req.user.role !== "tecnico" && req.user.role !== "admin") {
      return res.status(403).json({ error: "Sem permissão" });
    }

    await Chamado.findByIdAndUpdate(req.params.id, { status });

    res.json({ message: "Status atualizado!" });

  } catch (err) {
    res.status(500).json({ error: "Erro ao atualizar status" });
  }
});

// Permite que um técnico assuma um chamado disponível
app.put("/chamados/:id/assumir", auth, async (req, res) => {

  const chamado = await Chamado.findById(req.params.id);

  if (!chamado) {
    return res.status(404).json({ error: "Chamado não encontrado" });
  }

  // Valida se o usuário tem permissão para assumir chamados
  if (req.user.role !== "tecnico" && req.user.role !== "admin") {
    return res.status(403).json({ error: "Sem permissão" });
  }

  // Atribui o chamado ao técnico e altera status para "andamento"
  chamado.tecnico = req.user.id;
  chamado.status = "andamento";

  await chamado.save();

  res.json({ message: "Chamado assumido" });
});

// ============================================================================
// ROTA DE REDEFINIÇÃO DE SENHA
// ============================================================================
app.post("/reset-password", async (req, res) => {
  try {
    const { email, novaSenha } = req.body;

    if (!email || !novaSenha) {
      return res.status(400).json({ error: "Dados inválidos" });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ error: "Usuário não encontrado" });
    }

    // Gera novo hash para a senha e atualiza no banco
    const bcrypt = require("bcrypt");

    user.senha = await bcrypt.hash(novaSenha, 10);

    await user.save();

    res.json({ message: "Senha atualizada com sucesso" });

  } catch (err) {
    console.log("ERRO RESET:", err);
    res.status(500).json({ error: "Erro ao resetar senha" });
  }
});

// ============================================================================
// INICIALIZAÇÃO DO SERVIDOR
// ============================================================================
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("Servidor rodando...");
});