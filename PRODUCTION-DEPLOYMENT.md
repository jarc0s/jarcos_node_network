# 🏭 Despliegue en Producción

## 🔒 Repositorio Privado en Producción

### **Método 1: SSH Keys (Recomendado)**

#### **Configuración del servidor de producción:**

```bash
# 1. Generar SSH key en el servidor
ssh-keygen -t ed25519 -C "production-server@yourcompany.com"

# 2. Agregar la clave pública a GitHub
# Copia el contenido de ~/.ssh/id_ed25519.pub
# Ve a GitHub → Settings → SSH and GPG keys → New SSH key

# 3. Instalar en producción
npm install git+ssh://git@github.com:jarc0s/jarcos_node_network.git
```

#### **Docker con SSH:**

```dockerfile
# Dockerfile
FROM node:18-alpine

# Instalar git y ssh
RUN apk add --no-cache git openssh

# Copiar SSH keys (build-time)
COPY --from=ssh-stage /root/.ssh/id_ed25519 /root/.ssh/id_ed25519
COPY --from=ssh-stage /root/.ssh/known_hosts /root/.ssh/known_hosts
RUN chmod 600 /root/.ssh/id_ed25519

# Instalar dependencias
COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

EXPOSE 3000
CMD ["npm", "start"]
```

### **Método 2: Personal Access Token**

#### **Configuración con token:**

```bash
# 1. Crear Personal Access Token en GitHub
# Settings → Developer settings → Personal access tokens → Generate new token
# Permisos necesarios: repo (full control)

# 2. Configurar en el servidor
export GITHUB_TOKEN="ghp_your_token_here"

# 3. Instalar usando token
npm install git+https://${GITHUB_TOKEN}@github.com/jarc0s/jarcos_node_network.git
```

#### **package.json con token:**

```json
{
  "dependencies": {
    "@jarc0s/jarcos-node-network": "git+https://jarc0s:${GITHUB_TOKEN}@github.com/jarc0s/jarcos_node_network.git"
  }
}
```

### **Método 3: GitHub Actions (CI/CD)**

#### **.github/workflows/deploy.yml:**

```yaml
name: Deploy to Production

on:
  push:
    branches: [main]
    tags: ['v*']

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          
      - name: Configure Git for private repos
        run: |
          git config --global url."https://${{ secrets.GITHUB_TOKEN }}@github.com/".insteadOf "https://github.com/"
          
      - name: Install dependencies
        run: npm ci
        
      - name: Build
        run: npm run build
        
      - name: Deploy to production
        run: |
          # Tu script de despliegue aquí
          echo "Deploying to production..."
```

### **Método 4: NPM Registry Privado**

#### **Opción A: GitHub Packages**

```bash
# 1. Configurar .npmrc en tu proyecto
echo "@jarc0s:registry=https://npm.pkg.github.com" >> .npmrc

# 2. Publicar en GitHub Packages
npm publish

# 3. Instalar desde GitHub Packages
npm install @jarc0s/jarcos-node-network
```

#### **Configuración para GitHub Packages:**

```json
// package.json
{
  "name": "@jarc0s/jarcos-node-network",
  "publishConfig": {
    "registry": "https://npm.pkg.github.com"
  }
}
```

#### **Opción B: Verdaccio (NPM Registry Privado)**

```bash
# 1. Instalar Verdaccio
npm install -g verdaccio

# 2. Configurar registry
npm set registry http://localhost:4873/

# 3. Crear usuario
npm adduser --registry http://localhost:4873/

# 4. Publicar
npm publish

# 5. Instalar
npm install @jarc0s/jarcos-node-network
```

## 🚀 **Configuraciones de Entorno**

### **Variables de entorno para producción:**

```bash
# .env.production
NODE_ENV=production
GITHUB_TOKEN=ghp_your_token_here
NPM_REGISTRY=https://npm.pkg.github.com
API_BASE_URL=https://api.yourcompany.com
```

### **Docker Compose para producción:**

```yaml
# docker-compose.prod.yml
version: '3.8'

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile.prod
      args:
        GITHUB_TOKEN: ${GITHUB_TOKEN}
    environment:
      - NODE_ENV=production
      - API_BASE_URL=${API_BASE_URL}
    ports:
      - "3000:3000"
    restart: unless-stopped
    
  # Nginx proxy
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - app
```

### **Dockerfile optimizado para producción:**

```dockerfile
# Dockerfile.prod
FROM node:18-alpine AS builder

# Instalar git para private repos
RUN apk add --no-cache git openssh

# Configurar SSH (si usas SSH)
RUN mkdir -p /root/.ssh
COPY ssh/id_ed25519 /root/.ssh/id_ed25519
COPY ssh/known_hosts /root/.ssh/known_hosts
RUN chmod 600 /root/.ssh/id_ed25519

# Configurar Git (si usas token)
ARG GITHUB_TOKEN
RUN git config --global url."https://${GITHUB_TOKEN}@github.com/".insteadOf "https://github.com/"

WORKDIR /app

# Instalar dependencias
COPY package*.json ./
RUN npm ci --only=production

# Copiar código y build
COPY . .
RUN npm run build

# Producción stage
FROM node:18-alpine AS production

WORKDIR /app

# Copiar solo lo necesario
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./

# Usuario no-root
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001
USER nextjs

EXPOSE 3000

CMD ["npm", "start"]
```

## 🔐 **Seguridad en Producción**

### **1. Rotación de tokens:**

```bash
# Script para rotar tokens automáticamente
#!/bin/bash
# rotate-github-token.sh

OLD_TOKEN=$1
NEW_TOKEN=$2

# Actualizar en todos los servidores
for server in prod-server-1 prod-server-2; do
  ssh $server "
    export GITHUB_TOKEN=$NEW_TOKEN
    cd /app
    npm install git+https://\${GITHUB_TOKEN}@github.com/jarc0s/jarcos_node_network.git
    pm2 restart app
  "
done

echo "Token rotated successfully"
```

### **2. Secrets management:**

```bash
# Usando AWS Secrets Manager
aws secretsmanager get-secret-value \
  --secret-id prod/github-token \
  --query SecretString \
  --output text

# Usando HashiCorp Vault
vault kv get -field=github_token secret/prod/tokens
```

### **3. Network security:**

```bash
# Whitelist GitHub IPs en firewall
# https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/about-githubs-ip-addresses

# UFW rules
ufw allow from 140.82.112.0/20
ufw allow from 185.199.108.0/22
ufw allow from 192.30.252.0/22
```

## 🚨 **Troubleshooting Común**

### **Error: "Repository not found"**

```bash
# Verificar permisos
ssh -T git@github.com

# Verificar token
curl -H "Authorization: token $GITHUB_TOKEN" \
  https://api.github.com/user/repos
```

### **Error: "Permission denied"**

```bash
# SSH: Verificar clave
ssh-add -l

# Token: Verificar scopes
# El token debe tener permiso "repo"
```

### **Error en CI/CD:**

```yaml
# GitHub Actions
- name: Debug SSH
  run: |
    ssh -T git@github.com || true
    git ls-remote git@github.com:jarc0s/jarcos_node_network.git
```

## 📊 **Monitoreo de Dependencias**

### **Renovate bot para actualizaciones:**

```json
// renovate.json
{
  "extends": ["config:base"],
  "packageRules": [
    {
      "matchPackageNames": ["@jarc0s/jarcos-node-network"],
      "schedule": ["before 9am on monday"]
    }
  ]
}
```

### **Dependabot config:**

```yaml
# .github/dependabot.yml
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
    open-pull-requests-limit: 5
```

---

**✅ Con estas configuraciones, tu librería privada funcionará perfectamente en producción con máxima seguridad y control de acceso.**