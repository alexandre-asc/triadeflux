# 🚀 TRÍADE FLUX — GUIA DE DEPLOY COMPLETO
> Passo a passo para colocar o sistema em produção

---

## PASSO 1 — Criar projeto no Firebase

1. Acesse https://console.firebase.google.com
2. Clique em **"Adicionar projeto"**
3. Nome: `triade-flux` → Continuar
4. Desative o Google Analytics (opcional) → Criar projeto
5. Aguarde criar e clique em **Continuar**

---

## PASSO 2 — Ativar Authentication

1. No menu lateral: **Build → Authentication**
2. Clique em **"Começar"**
3. Clique em **"E-mail/senha"** → Ativar → Salvar

---

## PASSO 3 — Criar Firestore Database

1. No menu lateral: **Build → Firestore Database**
2. Clique em **"Criar banco de dados"**
3. Selecione **"Modo de produção"** → Próximo
4. Região: **southamerica-east1 (São Paulo)** → Ativar
5. Aguarde criar

### Regras de segurança do Firestore
Após criar, vá em **Regras** e cole:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Master pode tudo
    function isMaster() {
      return request.auth != null && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'master';
    }

    // Usuário pertence ao tenant
    function belongsToTenant(tenantId) {
      return request.auth != null &&
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.tenantId == tenantId;
    }

    // Tenants: master lê/escreve tudo, cliente lê só o seu
    match /tenants/{tenantId} {
      allow read:  if isMaster() || belongsToTenant(tenantId);
      allow write: if isMaster();

      // Subcoleções: cliente lê/escreve apenas do seu tenant
      match /lancamentos/{id} {
        allow read, write: if isMaster() || belongsToTenant(tenantId);
      }
      match /documentos/{id} {
        allow read, write: if isMaster() || belongsToTenant(tenantId);
      }
    }

    // Usuários: cada um lê/edita só o próprio perfil
    match /users/{userId} {
      allow read:  if request.auth.uid == userId || isMaster();
      allow write: if isMaster();
    }
  }
}
```

---

## PASSO 4 — Ativar Firebase Storage

1. No menu lateral: **Build → Storage**
2. Clique em **"Começar"** → Modo de produção → southamerica-east1 → Concluído

### Regras do Storage
Vá em **Regras** e cole:
```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /tenants/{tenantId}/{allPaths=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

---

## PASSO 5 — Obter credenciais do Firebase

### Client SDK (para o .env.local):
1. Firebase Console → Configurações do projeto (ícone ⚙️)
2. Role até **"Seus apps"** → clique em **"</>  Web"**
3. Nome do app: `triade-flux-web` → Registrar app
4. Copie os valores do `firebaseConfig` para o `.env.local`

### Admin SDK (chave privada):
1. Ainda em Configurações → aba **"Contas de serviço"**
2. Clique em **"Gerar nova chave privada"** → Gerar chave
3. Baixe o arquivo JSON
4. Copie para o `.env.local`:
   - `FIREBASE_PROJECT_ID` = campo `project_id`
   - `FIREBASE_CLIENT_EMAIL` = campo `client_email`
   - `FIREBASE_PRIVATE_KEY` = campo `private_key` (cole tudo com as aspas)

---

## PASSO 6 — Criar usuário Master

No Firebase Console → Authentication → Users → **"Adicionar usuário"**:
- E-mail: `master@triade.com` (ou o seu)
- Senha: sua senha segura

Depois, no Firestore → Coleção `users` → Adicionar documento:
- ID do documento = UID do usuário master (copie do Authentication)
- Campos:
  ```
  email:    "master@triade.com"
  name:     "Alexandre Amorim"
  role:     "master"
  tenantId: ""
  createdAt: (timestamp atual)
  ```

---

## PASSO 7 — Configurar o .env.local

Abra o arquivo `.env.local` e preencha todos os campos com os valores copiados.

---

## PASSO 8 — Rodar localmente

```bash
# Instalar dependências
npm install

# Rodar em desenvolvimento
npm run dev
```

Acesse http://localhost:3000 e faça login com o usuário master.

---

## PASSO 9 — Deploy no Vercel

### Opção A — Via GitHub (recomendado):
1. Crie repositório no GitHub: https://github.com/new
2. Faça push do projeto:
   ```bash
   git init
   git add .
   git commit -m "feat: Tríade Flux inicial"
   git branch -M main
   git remote add origin https://github.com/SEU_USUARIO/triade-flux.git
   git push -u origin main
   ```
3. Acesse https://vercel.com/new
4. Importe o repositório `triade-flux`
5. Em **"Environment Variables"**, adicione TODAS as variáveis do `.env.local`
6. Clique em **Deploy**

### Após o deploy:
- Adicione seu domínio customizado em: Vercel → Settings → Domains
- Exemplo: `flux.triade.com.br`

---

## PASSO 10 — Criar primeiro cliente

1. Faça login como master em produção
2. No painel Master → **"+ Novo Cliente"**
3. Preencha os dados e salve
4. O sistema cria automaticamente:
   - Tenant isolado no Firestore
   - Usuário com e-mail e senha
   - Acesso restrito apenas aos dados da empresa

---

## ESTRUTURA DO FIRESTORE

```
/tenants/{tenantId}
  - name, email, plan, status, dueDate...
  /lancamentos/{id}
    - tipo, data, descricao, categoria, valor...
  /documentos/{id}
    - nome, url, status, analise...

/users/{uid}
  - email, name, role, tenantId...
```

---

## SUPORTE

Desenvolvido por **Alexandre Amorim | Tríade Resultados**
