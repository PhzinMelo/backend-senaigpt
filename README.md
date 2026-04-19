# AI Chat Backend

API REST para um sistema de chat com IA generativa, desenvolvida com **Node.js + Express + MongoDB**, com autenticação JWT e integração com o **Google Gemini**.

Funciona como backend de qualquer frontend (Angular, React, Vue, etc.), expondo endpoints para cadastro, login, gerenciamento de chats e envio de mensagens com resposta de IA.

---

## Índice

- [Tecnologias](#tecnologias)
- [Estrutura do projeto](#estrutura-do-projeto)
- [Como rodar localmente](#como-rodar-localmente)
- [Variáveis de ambiente](#variáveis-de-ambiente)
- [Rotas da API](#rotas-da-api)
- [Como conectar com o frontend](#como-conectar-com-o-frontend)
- [Como testar com Postman](#como-testar-com-postman)
- [Deploy no Render](#deploy-no-render)

---

## Tecnologias

| Tecnologia | Versão | Para que serve |
|---|---|---|
| Node.js | 18+ | Runtime JavaScript no servidor |
| Express | 4.x | Framework HTTP e roteamento |
| MongoDB | 6+ | Banco de dados NoSQL |
| Mongoose | 8.x | ODM — modelagem e queries no MongoDB |
| JWT (jsonwebtoken) | 9.x | Autenticação stateless via token |
| bcryptjs | 2.x | Hash seguro de senhas |
| Google Gemini API | @google/generative-ai | Modelo de linguagem (IA) |
| express-validator | 7.x | Validação de inputs nas rotas |
| dotenv | 16.x | Leitura de variáveis de ambiente |
| cors | 2.x | Liberação de origens no navegador |

---

## Estrutura do projeto

```
ai-chat-backend/
├── config/
│   ├── constants.js        # Magic numbers e strings centralizados
│   └── db.js               # Conexão com o MongoDB
├── controllers/
│   ├── aiController.js     # Lógica de chat com IA (histórico de contexto)
│   ├── authController.js   # Register, Login, GetMe
│   ├── chatController.js   # CRUD de chats
│   └── messageController.js# Listagem e envio de mensagens
├── middlewares/
│   ├── authMiddleware.js   # Verificação do token JWT
│   ├── errorMiddleware.js  # Handler global de erros
│   └── validationMiddleware.js # Validação de inputs
├── models/
│   ├── User.js             # Schema do usuário
│   ├── Chat.js             # Schema do chat
│   └── Message.js          # Schema das mensagens
├── routes/
│   ├── authRoutes.js       # /auth/*
│   ├── chatRoutes.js       # /chats/*
│   ├── messageRoutes.js    # /messages/*
│   └── aiRoutes.js         # /ai/*
├── services/
│   ├── geminiService.js    # Integração com a API do Gemini
│   └── tokenService.js     # Geração e verificação de JWT
├── utils/
│   ├── logger.js           # Logger estruturado (JSON)
│   └── rateLimiter.js      # Rate limiter em memória
├── .env.example            # Modelo de variáveis de ambiente
├── package.json
└── server.js               # Entry point da aplicação
```

---

## Como rodar localmente

### Pré-requisitos

- Node.js 18 ou superior → https://nodejs.org
- MongoDB rodando localmente → https://www.mongodb.com/try/download/community
  - _Ou use uma conta gratuita no MongoDB Atlas → https://cloud.mongodb.com_
- Chave da API do Google Gemini → https://aistudio.google.com/app/apikey _(gratuita)_

### Passo a passo

**1. Clone o repositório**

```bash
git clone https://github.com/seu-usuario/ai-chat-backend.git
cd ai-chat-backend
```

**2. Instale as dependências**

```bash
npm install
```

**3. Configure as variáveis de ambiente**

```bash
cp .env.example .env
```

Edite o arquivo `.env` com seus valores reais (veja a seção [Variáveis de ambiente](#variáveis-de-ambiente) abaixo).

**4. Rode o servidor**

```bash
# Desenvolvimento (hot-reload com nodemon)
npm run dev

# Produção
npm start
```

O servidor estará disponível em: `http://localhost:3000`

Para confirmar que está rodando, abra no navegador:
```
http://localhost:3000/health
```

---

## Variáveis de ambiente

Crie um arquivo `.env` na raiz do projeto com as seguintes variáveis:

```env
# Porta que o servidor vai escutar
PORT=3000

# Ambiente: "development" libera CORS para qualquer origem
# "production" usa apenas a FRONTEND_URL abaixo
NODE_ENV=development

# String de conexão com o MongoDB
# Local:   mongodb://localhost:27017/ai-chat-db
# Atlas:   mongodb+srv://usuario:senha@cluster.mongodb.net/ai-chat-db
MONGODB_URI=mongodb://localhost:27017/ai-chat-db

# Chave secreta usada para assinar os tokens JWT
# Use qualquer string longa e aleatória — NUNCA compartilhe essa chave
JWT_SECRET=troque_por_uma_string_longa_e_secreta_aqui

# Quanto tempo o token dura antes de expirar
# Exemplos: 1d = 1 dia | 7d = 7 dias | 1h = 1 hora
JWT_EXPIRES_IN=7d

# Chave da API do Google Gemini
# Obtenha gratuitamente em: https://aistudio.google.com/app/apikey
GEMINI_API_KEY=sua_chave_gemini_aqui

# Modelo do Gemini a ser usado (gemini-1.5-flash é o mais rápido e gratuito)
GEMINI_MODEL=gemini-1.5-flash

# URL do seu frontend — usada como origem permitida em produção
# Em desenvolvimento, qualquer origem é aceita (NODE_ENV=development)
FRONTEND_URL=http://localhost:4200
```

---

## Rotas da API

Todas as respostas seguem o padrão:
```json
{ "success": true, "data": { ... } }
{ "success": false, "error": "mensagem de erro" }
```

Rotas protegidas exigem o header:
```
Authorization: Bearer SEU_TOKEN_JWT
```

---

### Utilitárias (sem autenticação)

#### `GET /`
Verifica se a API está online.

```json
// Resposta 200
{ "success": true, "message": "API funcionando corretamente" }
```

#### `GET /health`
Status detalhado do servidor e do banco de dados.

```json
// Resposta 200
{
  "success": true,
  "data": {
    "status": "running",
    "environment": "development",
    "timestamp": "2024-06-01T12:00:00.000Z",
    "database": {
      "status": "connected",
      "name": "ai-chat-db"
    }
  }
}
```

---

### Auth

#### `POST /auth/register` — Criar conta
Cria um novo usuário. Retorna o token JWT já pronto para uso.

```json
// Body
{
  "email": "usuario@exemplo.com",
  "password": "senha123"
}

// Resposta 201
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "user": {
      "_id": "664a1b2c3d4e5f6789abcdef",
      "email": "usuario@exemplo.com",
      "createdAt": "2024-06-01T12:00:00.000Z"
    }
  }
}
```

#### `POST /auth/login` — Fazer login
Autentica um usuário existente. Retorna um novo token JWT.

```json
// Body
{
  "email": "usuario@exemplo.com",
  "password": "senha123"
}

// Resposta 200
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "user": {
      "_id": "664a1b2c3d4e5f6789abcdef",
      "email": "usuario@exemplo.com"
    }
  }
}
```

#### `GET /auth/me` 🔒 — Perfil do usuário logado

```json
// Resposta 200
{
  "success": true,
  "data": {
    "user": {
      "_id": "664a1b2c3d4e5f6789abcdef",
      "email": "usuario@exemplo.com",
      "createdAt": "2024-06-01T12:00:00.000Z"
    }
  }
}
```

---

### Chats

#### `GET /chats` 🔒 — Listar chats do usuário

```json
// Resposta 200
{
  "success": true,
  "data": {
    "chats": [
      {
        "_id": "664a...",
        "chatTitle": "Meu primeiro chat",
        "createdAt": "2024-06-01T12:00:00.000Z"
      }
    ],
    "count": 1
  }
}
```

#### `POST /chats` 🔒 — Criar novo chat

```json
// Body
{ "chatTitle": "Dúvidas sobre JavaScript" }

// Resposta 201
{
  "success": true,
  "data": {
    "chat": {
      "_id": "664a...",
      "chatTitle": "Dúvidas sobre JavaScript",
      "createdAt": "2024-06-01T12:00:00.000Z"
    }
  }
}
```

#### `DELETE /chats/:id` 🔒 — Deletar chat
Apaga o chat e todas as suas mensagens.

```json
// Resposta 200
{
  "success": true,
  "data": {
    "message": "Chat deleted successfully.",
    "deletedMessagesCount": 12
  }
}
```

---

### Messages

#### `GET /messages/:chatId` 🔒 — Listar mensagens (paginado)

```
GET /messages/664a...?page=1&limit=50
```

```json
// Resposta 200
{
  "success": true,
  "data": {
    "messages": [
      { "_id": "...", "text": "Olá!", "role": "user", "createdAt": "..." },
      { "_id": "...", "text": "Olá! Como posso ajudar?", "role": "ai", "createdAt": "..." }
    ],
    "pagination": {
      "total": 24,
      "page": 1,
      "limit": 50,
      "totalPages": 1,
      "hasNextPage": false,
      "hasPreviousPage": false
    }
  }
}
```

---

### AI Chat

#### `POST /ai/chat` 🔒 — Enviar mensagem para a IA
Salva a mensagem do usuário, chama o Gemini com o histórico do chat, salva e retorna a resposta da IA.
Rate-limited: **10 requisições por minuto por usuário**.

```json
// Body
{
  "chatId": "664a...",
  "message": "Explique o que é uma Promise em JavaScript"
}

// Resposta 200
{
  "success": true,
  "data": {
    "userMessage": {
      "_id": "...",
      "text": "Explique o que é uma Promise em JavaScript",
      "role": "user",
      "createdAt": "..."
    },
    "aiMessage": {
      "_id": "...",
      "text": "Uma Promise em JavaScript é um objeto que representa...",
      "role": "ai",
      "createdAt": "..."
    }
  }
}
```

#### `POST /ai/chat/new` 🔒 — Criar chat e já enviar a primeira mensagem

```json
// Body
{
  "message": "Me explique recursão",
  "chatTitle": "Aula de algoritmos"   // opcional — gerado automaticamente se omitido
}

// Resposta 201
{
  "success": true,
  "data": {
    "chat": { "_id": "...", "chatTitle": "Aula de algoritmos" },
    "userMessage": { "text": "Me explique recursão", "role": "user" },
    "aiMessage":   { "text": "Recursão é uma técnica...", "role": "ai" }
  }
}
```

---

## Como conectar com o frontend

### Configuração base (Angular HttpClient)

```typescript
// environment.ts
export const environment = {
  production: false,
  apiUrl: 'http://localhost:3000'
};
```

```typescript
// auth.interceptor.ts — envia o token automaticamente em toda requisição
import { HttpInterceptorFn } from '@angular/common/http';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token = localStorage.getItem('token');
  if (token) {
    req = req.clone({
      setHeaders: { Authorization: `Bearer ${token}` }
    });
  }
  return next(req);
};
```

```typescript
// auth.service.ts
import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../environments/environment';
import { tap } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private api = environment.apiUrl;

  constructor(private http: HttpClient) {}

  register(email: string, password: string) {
    return this.http.post<any>(`${this.api}/auth/register`, { email, password }).pipe(
      tap(res => localStorage.setItem('token', res.data.token))
    );
  }

  login(email: string, password: string) {
    return this.http.post<any>(`${this.api}/auth/login`, { email, password }).pipe(
      tap(res => localStorage.setItem('token', res.data.token))
    );
  }

  logout() {
    localStorage.removeItem('token');
  }
}
```

```typescript
// chat.service.ts
@Injectable({ providedIn: 'root' })
export class ChatService {
  private api = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getChats() {
    return this.http.get<any>(`${this.api}/chats`);
  }

  createChat(chatTitle: string) {
    return this.http.post<any>(`${this.api}/chats`, { chatTitle });
  }

  getMessages(chatId: string, page = 1) {
    return this.http.get<any>(`${this.api}/messages/${chatId}?page=${page}`);
  }

  sendMessage(chatId: string, message: string) {
    return this.http.post<any>(`${this.api}/ai/chat`, { chatId, message });
  }

  startNewChat(message: string) {
    return this.http.post<any>(`${this.api}/ai/chat/new`, { message });
  }
}
```

### Usando fetch puro (qualquer framework)

```javascript
const API = 'http://localhost:3000';
const token = localStorage.getItem('token');

// Login
const res = await fetch(`${API}/auth/login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'user@ex.com', password: 'senha123' })
});
const { data } = await res.json();
localStorage.setItem('token', data.token);

// Enviar mensagem para IA (rota protegida)
const chatRes = await fetch(`${API}/ai/chat`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({ chatId: '664a...', message: 'Olá!' })
});
const chatData = await chatRes.json();
console.log(chatData.data.aiMessage.text);
```

---

## Como testar com Postman

### 1. Preparar o Postman

1. Crie uma **Collection** chamada `AI Chat Backend`
2. Nas variáveis da collection, adicione:
   - `baseUrl` = `http://localhost:3000`
   - `token` = _(vazio por enquanto)_

### 2. Registrar um usuário

```
POST {{baseUrl}}/auth/register
Body (JSON):
{
  "email": "teste@exemplo.com",
  "password": "senha123"
}
```

Copie o `token` da resposta e salve na variável `token` da collection.

### 3. Fazer login (ou reutilize o token do passo anterior)

```
POST {{baseUrl}}/auth/login
Body (JSON):
{
  "email": "teste@exemplo.com",
  "password": "senha123"
}
```

### 4. Configurar autenticação automática

Em todas as requisições protegidas, vá na aba **Auth**:
- Type: `Bearer Token`
- Token: `{{token}}`

### 5. Criar um chat

```
POST {{baseUrl}}/chats
Auth: Bearer {{token}}
Body (JSON):
{
  "chatTitle": "Meu chat de teste"
}
```

Copie o `_id` do chat retornado.

### 6. Enviar primeira mensagem para a IA

```
POST {{baseUrl}}/ai/chat
Auth: Bearer {{token}}
Body (JSON):
{
  "chatId": "COLE_O_ID_DO_CHAT_AQUI",
  "message": "Olá! Quem é você?"
}
```

### 7. Ver histórico de mensagens

```
GET {{baseUrl}}/messages/COLE_O_ID_DO_CHAT_AQUI
Auth: Bearer {{token}}
```

### 8. Criar chat e enviar mensagem em uma única requisição

```
POST {{baseUrl}}/ai/chat/new
Auth: Bearer {{token}}
Body (JSON):
{
  "message": "Explique o que é inteligência artificial"
}
```

---

## Deploy no Render

### Passo a passo

**1. Acesse** https://render.com e crie uma conta gratuita.

**2. Crie um novo serviço:**
- Clique em **New → Web Service**
- Conecte seu repositório GitHub
- Selecione o repositório do backend

**3. Configure o serviço:**

| Campo | Valor |
|---|---|
| Name | `ai-chat-backend` |
| Environment | `Node` |
| Build Command | `npm install` |
| Start Command | `npm start` |

**4. Configure as variáveis de ambiente** (aba Environment):

| Variável | Valor |
|---|---|
| `NODE_ENV` | `production` |
| `PORT` | `10000` (Render usa esta porta por padrão) |
| `MONGODB_URI` | Sua string de conexão do MongoDB Atlas |
| `JWT_SECRET` | String longa e secreta (gere em https://1password.com/password-generator/) |
| `JWT_EXPIRES_IN` | `7d` |
| `GEMINI_API_KEY` | Sua chave do Google Gemini |
| `GEMINI_MODEL` | `gemini-1.5-flash` |
| `FRONTEND_URL` | URL do seu frontend (ex: `https://meu-app.vercel.app`) |

**5. Clique em Create Web Service** e aguarde o deploy (1-3 minutos).

**6. Teste a URL gerada** (ex: `https://ai-chat-backend.onrender.com`):

```
https://ai-chat-backend.onrender.com/
https://ai-chat-backend.onrender.com/health
```

> ⚠️ **Atenção:** No plano gratuito do Render, o serviço "dorme" após 15 minutos de inatividade. A primeira requisição após o sono pode demorar ~30 segundos para "acordar".

### Conectando o frontend ao Render

No seu frontend Angular, troque a URL base:

```typescript
// environment.prod.ts
export const environment = {
  production: true,
  apiUrl: 'https://ai-chat-backend.onrender.com'
};
```

---

## Segurança

| Proteção | Como funciona |
|---|---|
| Hash de senhas | bcrypt com 12 salt rounds — senha nunca salva em texto puro |
| JWT stateless | Token verificado em toda requisição protegida |
| Isolamento de dados | Toda query filtra por `userId` — um usuário nunca acessa dados de outro |
| Rate limit na IA | 10 req/min por usuário — evita abuso e gastos excessivos |
| Rate limit no login | 20 tentativas por IP a cada 15 min — protege contra brute-force |
| CORS controlado | Em produção, apenas `FRONTEND_URL` é aceita |
| Logs sem dados sensíveis | `password`, `token`, `apiKey` são automaticamente redigidos nos logs |

---

## Erros comuns

| Código | Causa | Solução |
|---|---|---|
| `400` | Campo inválido ou vazio | Verifique o body da requisição |
| `401` | Token ausente, expirado ou inválido | Faça login novamente e use o novo token |
| `404` | Rota inexistente ou recurso não encontrado | Verifique a URL e o ID usado |
| `409` | Email já cadastrado | Use outro email ou faça login |
| `429` | Rate limit excedido | Aguarde o tempo indicado no header `Retry-After` |
| `502` | Falha na API do Gemini | Verifique a `GEMINI_API_KEY` no `.env` |
