# Pastas, serviços e transferência de arquivos

Este guia descreve como organizar o armazenamento em `/srv`, configurar quatro cenários de uso distintos e transferir arquivos entre o servidor e outros computadores — via terminal, aplicativos gráficos ou navegador.

**Pré-requisitos:**

- Ubuntu Server instalado com espaço em disco adequado ([03-armazenamento-disco.md](03-armazenamento-disco.md))
- Acesso SSH ([02-acesso-remoto.md](02-acesso-remoto.md))

**Índice:** [UBUNTO_SERVER.md](../UBUNTO_SERVER.md) | Anterior: [03-armazenamento-disco.md](03-armazenamento-disco.md) | Próximo: [05-usuarios-e-permissoes.md](05-usuarios-e-permissoes.md)

---

## 1. Estrutura de pastas sugerida

Este repositório utiliza o seguinte layout como referência em todos os guias:

```
/srv/
├── web/       # Sites e aplicações PHP
├── games/     # Servidores de jogos
├── casaos/    # Dados auxiliares CasaOS (opcional)
└── backup/    # Armazenamento tipo nuvem privada
```

### 1.1 Criar as pastas

```bash
sudo mkdir -p /srv/{web,games,casaos,backup}
```

### 1.2 Permissões iniciais

```bash
# Dono administrativo; ajustar por serviço depois
sudo chown -R $USER:$USER /srv/web /srv/games /srv/casaos
sudo chown root:root /srv/backup
sudo chmod 755 /srv/web /srv/games /srv/casaos
sudo chmod 755 /srv/backup
```

Permissões refinadas por usuário de serviço em [05-usuarios-e-permissoes.md](05-usuarios-e-permissoes.md).

---

## 2. Métodos de acesso e transferência

| Método | Protocolo | Ideal para |
|--------|-----------|------------|
| **SCP** | SSH | Arquivos pontuais, scripts |
| **rsync** | SSH | Sincronização, deploy de sites, backups |
| **SFTP** | SSH | Navegação em pastas via FileZilla/Cyberduck |
| **Samba (SMB)** | SMB/CIFS | Pastas de rede no Windows/macOS |
| **Navegador (HTTP/HTTPS)** | HTTP | Painéis (CasaOS, Nextcloud, sites) |

Substituir `usuario`, `192.168.1.100` e caminhos pelos valores reais do ambiente.

---

## 3. Comandos gerais de upload e download

### 3.1 SCP — arquivo único

**Enviar para o servidor:**

```bash
scp documento.pdf usuario@192.168.1.100:/srv/backup/
```

**Baixar do servidor:**

```bash
scp usuario@192.168.1.100:/srv/backup/documento.pdf ~/Downloads/
```

**Pasta inteira (recursivo):**

```bash
scp -r ./meu-site/ usuario@192.168.1.100:/srv/web/
```

### 3.2 rsync — sincronização

**Enviar site para o servidor:**

```bash
rsync -avz --progress ./meu-site/ usuario@192.168.1.100:/srv/web/meu-site/
```

**Baixar backup do servidor:**

```bash
rsync -avz usuario@192.168.1.100:/srv/backup/ ./backup-local/
```

### 3.3 SFTP (modo interativo)

```bash
sftp usuario@192.168.1.100
```

Comandos dentro do SFTP:

```
cd /srv/backup
put arquivo.zip
get arquivo.zip
ls
bye
```

### 3.4 Clientes gráficos

| Aplicativo | Sistema | Protocolo |
|------------|---------|-----------|
| FileZilla | Windows, macOS, Linux | SFTP |
| Cyberduck | macOS, Windows | SFTP |
| Finder (macOS) | macOS | SFTP via “Conectar ao servidor” (`sftp://usuario@IP`) |

---

## 4. Cenário 1 — Site PHP com MySQL (`/srv/web`)

### 4.1 Objetivo

Hospedar aplicações PHP com banco MariaDB/MySQL, acessíveis na rede local via HTTP.

### 4.2 Instalar stack LAMP simplificado (Nginx + PHP-FPM + MariaDB)

```bash
sudo apt update
sudo apt install -y nginx mariadb-server php-fpm php-mysql
```

### 4.3 Estrutura do site

```bash
sudo mkdir -p /srv/web/meusite/public
sudo chown -R $USER:www-data /srv/web/meusite
```

Enviar arquivos PHP do computador local:

```bash
rsync -avz ./projeto/ usuario@192.168.1.100:/srv/web/meusite/public/
```

### 4.4 Configurar Nginx (exemplo)

Criar `/etc/nginx/sites-available/meusite`:

```nginx
server {
    listen 80;
    server_name _;
    root /srv/web/meusite/public;
    index index.php index.html;

    location / {
        try_files $uri $uri/ =404;
    }

    location ~ \.php$ {
        include snippets/fastcgi-php.conf;
        fastcgi_pass unix:/run/php/php8.3-fpm.sock;
    }
}
```

Ativar e testar:

```bash
sudo ln -s /etc/nginx/sites-available/meusite /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 4.5 Acesso

- **Navegador (LAN):** `http://192.168.1.100`
- **Terminal:** edição via SSH; deploy via `rsync`

### 4.6 Banco de dados

```bash
sudo mysql_secure_installation
sudo mysql -e "CREATE DATABASE meusite; CREATE USER 'meusite'@'localhost' IDENTIFIED BY 'senha_forte'; GRANT ALL ON meusite.* TO 'meusite'@'localhost';"
```

> Utilizar senhas fortes e nunca expor a porta 3306 na internet sem necessidade.

---

## 5. Cenário 2 — Servidor de jogos (`/srv/games`)

### 5.1 Objetivo

Executar binários de servidor de jogos (ex.: Minecraft Java) com arquivos e mundos em `/srv/games`.

### 5.2 Preparar pasta

```bash
sudo mkdir -p /srv/games/minecraft
sudo chown -R gameuser:games /srv/games/minecraft
```

> Criar usuário `gameuser` em [05-usuarios-e-permissoes.md](05-usuarios-e-permissoes.md).

### 5.3 Enviar arquivos do servidor de jogo

```bash
scp server.jar usuario@192.168.1.100:/srv/games/minecraft/
```

Ou com rsync:

```bash
rsync -avz ./minecraft-server/ usuario@192.168.1.100:/srv/games/minecraft/
```

### 5.4 Firewall — liberar porta do jogo

Exemplo Minecraft (porta 25565):

```bash
sudo ufw allow 25565/tcp
```

### 5.5 Executar como serviço (systemd, exemplo)

Criar `/etc/systemd/system/minecraft.service` e iniciar com `systemctl`. Consultar documentação específica de cada jogo para parâmetros JVM e memória.

### 5.6 Acesso

| Canal | Uso |
|-------|-----|
| **Cliente do jogo** | Conectar ao IP público ou LAN (`192.168.1.100:25565`) |
| **Terminal/SSH** | Administração, logs, upload de mods |
| **Navegador** | Em geral não aplicável, salvo painéis web do jogo |

---

## 6. Cenário 3 — CasaOS (`/srv/casaos`)

O [CasaOS](https://casaos.zimaspace.com/) é um painel web para apps Docker, arquivos e compartilhamento em rede. A pasta `/srv/casaos/` pode armazenar dados dos apps e compartilhamentos Samba.

**Guia completo (trilha própria, separada deste documento):**

- Hub: [CASAOS.md](../CASAOS.md)
- Instalação: [casaos/01-instalacao.md](../casaos/01-instalacao.md)
- Pastas, Mac, Windows, Android e iOS: [casaos/03-pastas-rede-e-mobile.md](../casaos/03-pastas-rede-e-mobile.md)

---

## 7. Cenário 4 — Backup / nuvem privada (`/srv/backup`)

### 7.1 Objetivo

Armazenar arquivos para backup e acesso tipo “nuvem privada”, sem executar sites ou jogos nesta pasta.

### 7.2 Estrutura

```bash
sudo mkdir -p /srv/backup/{documentos,fotos,arquivos}
sudo chown root:root /srv/backup
sudo chmod 755 /srv/backup
```

### 7.3 Opção A — SFTP (simples, seguro)

Upload/download via `scp`, `rsync` ou FileZilla para `/srv/backup/`. Restrição por usuário em [05-usuarios-e-permissoes.md](05-usuarios-e-permissoes.md).

### 7.4 Opção B — Samba (pastas de rede)

```bash
sudo apt install -y samba
```

Editar `/etc/smb.conf` — exemplo de compartilhamento:

```ini
[backup]
   path = /srv/backup
   browseable = yes
   read only = no
   guest ok = no
   valid users = backupuser
```

```bash
sudo smbpasswd -a backupuser
sudo systemctl restart smbd
```

**macOS:** Finder → Ir → Conectar ao servidor → `smb://192.168.1.100/backup`  
**Windows:** `\\192.168.1.100\backup`

### 7.5 Opção C — Nextcloud (navegador)

Instalar via Docker ou snap para interface web completa (sincronização, compartilhamento). Adequado quando o acesso por navegador é prioridade.

### 7.6 Acesso resumido

| Método | Upload | Download |
|--------|--------|----------|
| `rsync` | `rsync -avz ./pasta/ user@IP:/srv/backup/` | `rsync -avz user@IP:/srv/backup/ ./local/` |
| SFTP | `put` no cliente | `get` no cliente |
| Samba | Arrastar na pasta de rede | Idem |
| Nextcloud | Interface web / app | Interface web / app |

---

## 8. Tabela comparativa dos quatro cenários

| Pasta | Serviço principal | Porta típica | Acesso navegador | Acesso terminal |
|-------|-------------------|--------------|------------------|-----------------|
| `/srv/web` | Nginx + PHP-FPM + MariaDB | 80, 443 | Sim (site) | SSH, rsync, scp |
| `/srv/games` | Binário do jogo | Variável (ex. 25565) | Raro | SSH, scp |
| `/srv/casaos` | CasaOS / Docker | 80 ou porta do painel | Sim (painel) | SSH + painel |
| `/srv/backup` | SFTP / Samba / Nextcloud | 22 / 445 / 443 | Opcional | SSH, rsync, SMB |

---

## 9. Problemas comuns

| Problema | Causa | Solução |
|----------|-------|---------|
| Permissão negada ao gravar | Dono/grupo incorretos | `sudo chown` / adicionar usuário ao grupo |
| Site retorna 502/403 | PHP-FPM ou permissões Nginx | Verificar socket PHP e `root` no Nginx |
| Samba não conecta | Firewall ou credenciais | `sudo ufw allow samba`; recriar `smbpasswd` |
| CasaOS inacessível | Serviço parado | `sudo systemctl status casaos` (nome pode variar) |

---

## Próximos passos

1. [05-usuarios-e-permissoes.md](05-usuarios-e-permissoes.md) — usuários dedicados e acesso só à pasta backup
2. [06-servidor-na-internet.md](06-servidor-na-internet.md) — acesso fora da rede local

[← Voltar ao índice](../UBUNTO_SERVER.md)
