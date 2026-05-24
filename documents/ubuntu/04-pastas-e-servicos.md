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

**Por que `/srv`:** no Linux, `/srv` é a convenção para **dados de serviços** (sites, jogos, backups) separados do sistema em `/`. Facilita backups, permissões e expansão de disco montado só em `/srv`.

O comando abaixo cria as quatro pastas de uma vez; `-p` evita erro se alguma já existir.

```bash
sudo mkdir -p /srv/{web,games,casaos,backup}
```

**Resultado esperado:** `ls /srv` lista `web`, `games`, `casaos`, `backup`.

### 1.2 Permissões iniciais

Antes de criar usuários por serviço ([05-usuarios-e-permissoes.md](05-usuarios-e-permissoes.md)), define-se um dono inicial. O administrador (`$USER`) controla web/jogos/casaos; `backup` fica mais restrito desde o início.

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

Esta seção cobre transferência **pontual** pela rede, usando a mesma autenticação SSH da administração. Útil para enviar um site, um mod de jogo ou copiar backup sem montar pasta de rede no sistema operacional.

**Quando usar cada ferramenta:** `scp` para poucos arquivos; `rsync` para pastas grandes ou atualizações repetidas; SFTP quando se prefere interface gráfica (FileZilla).

### 3.1 SCP — arquivo único

O `scp` copia arquivos por cima do SSH — criptografado e simples, sem configurar Samba.

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

**Quando usar:** copiar muitos arquivos ou atualizar um site várias vezes. O `rsync` envia só o que mudou desde a última cópia — mais rápido que `scp` em pastas grandes.

**Enviar site para o servidor:**

```bash
rsync -avz --progress ./meu-site/ usuario@192.168.1.100:/srv/web/meu-site/
```

**Baixar backup do servidor:**

```bash
rsync -avz usuario@192.168.1.100:/srv/backup/ ./backup-local/
```

### 3.3 SFTP (modo interativo)

**O que é:** SFTP roda sobre SSH e permite navegar pastas no servidor como se fossem locais. Útil para testar permissões ou enviar arquivos sem montar pasta de rede.

```bash
sftp usuario@192.168.1.100
```

Dentro da sessão SFTP, estes comandos manipulam arquivos remotos:

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

**O que este passo instala:**

| Pacote | Função |
|--------|--------|
| **nginx** | Servidor web — responde HTTP na porta 80 |
| **mariadb-server** | Banco de dados (compatível com MySQL) |
| **php-fpm** | Executa código PHP fora do Nginx |
| **php-mysql** | Ligação entre PHP e MariaDB |

```bash
sudo apt update
sudo apt install -y nginx mariadb-server php-fpm php-mysql
```

**Resultado esperado:** `systemctl status nginx` e `php8.3-fpm` (versão pode variar) ativos.

### 4.3 Estrutura do site

Separar a pasta pública (`public`) do restante do projeto evita expor arquivos de configuração na web. O grupo `www-data` é o usuário sob o qual o Nginx/PHP leem arquivos.

```bash
sudo mkdir -p /srv/web/meusite/public
sudo chown -R $USER:www-data /srv/web/meusite
```

Enviar arquivos PHP do computador local:

```bash
rsync -avz ./projeto/ usuario@192.168.1.100:/srv/web/meusite/public/
```

### 4.4 Configurar Nginx (exemplo)

**Problema que resolve:** o Nginx precisa saber qual pasta servir e como encaminhar arquivos `.php` para o PHP-FPM.

Criar o arquivo de site em `/etc/nginx/sites-available/meusite` (substituir `meusite` pelo nome desejado):

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

O link simbólico **ativa** o site; `nginx -t` valida sintaxe antes de aplicar (evita derrubar o servidor com erro de config).

```bash
sudo ln -s /etc/nginx/sites-available/meusite /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

**Resultado esperado:** `nginx -t` exibe `syntax is ok`; no navegador da LAN, `http://IP_DO_SERVIDOR` mostra a página (ou lista de diretório se não houver `index.php`).

### 4.5 Acesso

- **Navegador (LAN):** `http://192.168.1.100`
- **Terminal:** edição via SSH; deploy via `rsync`

### 4.6 Banco de dados

**Fluxo:** endurecer instalação padrão do MariaDB → criar banco e usuário só para esta aplicação (não usar `root` no PHP).

```bash
sudo mysql_secure_installation
sudo mysql -e "CREATE DATABASE meusite; CREATE USER 'meusite'@'localhost' IDENTIFIED BY 'senha_forte'; GRANT ALL ON meusite.* TO 'meusite'@'localhost';"
```

Substituir `senha_forte` por senha real. O usuário `'meusite'@'localhost'` só conecta **do próprio servidor** — adequado para PHP na mesma máquina.

> Nunca expor a porta 3306 na internet sem necessidade e firewall restritivo.

---

## 5. Cenário 2 — Servidor de jogos (`/srv/games`)

### 5.1 Objetivo

Executar binários de servidor de jogos (ex.: Minecraft Java) com arquivos e mundos em `/srv/games`.

### 5.2 Preparar pasta

O servidor de jogo grava mundos, mods e logs nesta pasta. Um usuário dedicado (`gameuser`) limita danos se o serviço do jogo for comprometido.

```bash
sudo mkdir -p /srv/games/minecraft
sudo chown -R gameuser:games /srv/games/minecraft
```

> Criar usuário `gameuser` conforme [05-usuarios-e-permissoes.md](05-usuarios-e-permissoes.md).

### 5.3 Enviar arquivos do servidor de jogo

Copiar o `.jar` (ou pacote do jogo) do PC de desenvolvimento para o servidor — mesmo fluxo de deploy de site, pasta de destino diferente.

```bash
scp server.jar usuario@192.168.1.100:/srv/games/minecraft/
```

Ou com rsync:

```bash
rsync -avz ./minecraft-server/ usuario@192.168.1.100:/srv/games/minecraft/
```

### 5.4 Firewall — liberar porta do jogo

**Por que:** o UFW bloqueia conexões entrantes por padrão. Jogadores na rede (ou na internet, se houver port forward) precisam alcançar a **porta TCP** que o jogo escuta.

Exemplo Minecraft Java (porta **25565**):

```bash
sudo ufw allow 25565/tcp
```

**Resultado esperado:** `sudo ufw status` lista a regra; cliente do jogo conecta em `IP:25565`.

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

Organizar subpastas facilita backups por tipo (documentos, fotos). Permissões iniciais restritas; usuário `backupuser` recebe acesso na seção de permissões.

```bash
sudo mkdir -p /srv/backup/{documentos,fotos,arquivos}
sudo chown root:root /srv/backup
sudo chmod 755 /srv/backup
```

### 7.3 Opção A — SFTP (simples, seguro)

**Ideal para:** quem já usa SSH e quer criptografia sem configurar Samba. Upload/download via `scp`, `rsync` ou FileZilla em `/srv/backup/`.

Restrição por usuário (só esta pasta): [05-usuarios-e-permissoes.md](05-usuarios-e-permissoes.md).

### 7.4 Opção B — Samba (pastas de rede)

**Ideal para:** Mac e Windows montarem `/srv/backup` como disco de rede — mesma ideia das pastas CasaOS, outro caminho no disco.

```bash
sudo apt install -y samba
```

O bloco abaixo define um share chamado `backup` visível na rede. Apenas `backupuser` autentica (`valid users`).

Editar `/etc/smb.conf` — adicionar ao final:

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
