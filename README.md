#  Sistema de Gestão de Chamados

> Plataforma completa para abertura, acompanhamento e resolução de chamados técnicos, com autenticação segura, chat integrado e dashboard analítico.

##  Funcionalidades
-  Autenticação JWT com hash de senhas (bcrypt)
-  Controle de acesso por perfis (Usuário, Técnico, Administrador)
-  CRUD completo de chamados com upload de anexos
-  Chat por chamado com polling otimizado e notificações
-  Dashboard com métricas em tempo real e gráficos interativos (Chart.js)
-  Filtros por status, busca textual e cálculo automático de prioridade/SLA
-  Interface 100% responsiva com animações CSS e tema escuro
-  Arquitetura pronta para deploy em PaaS (Render, Railway, etc.)

##  Tecnologias Utilizadas
**Backend**
- Node.js + Express
- MongoDB + Mongoose
- JWT (`jsonwebtoken`)
- Hashing (`bcryptjs` / `bcrypt`)
- Upload de arquivos (`multer`)

**Frontend**
- HTML5, CSS3, JavaScript (Vanilla)
- Chart.js (visualização de dados)
- Canvas API (animações de fundo)
- Fetch API + LocalStorage

##  Instalação e Execução Local
### Pré-requisitos
- Node.js (v16 ou superior)
- MongoDB (local ou MongoDB Atlas)

### Passos
1. Clone o repositório
   ```bash
   git clone https://github.com/SEU-USUARIO/NOME-DO-REPO.git
   cd NOME-DO-REPO
