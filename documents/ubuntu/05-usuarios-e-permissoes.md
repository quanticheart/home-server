# Usuários e permissões

Este guia descreve como criar usuários no Ubuntu Server, atribuir permissões por pasta e restringir o acesso para que uma conta acesse **apenas** diretórios específicos — com foco no exemplo de um usuário exclusivo para `/srv/backup`.

**Pré-requisitos:**

- Estrutura `/srv` criada ([04-pastas-e-servicos.md](04-pastas-e-servicos.md))
- Acesso `sudo` via SSH

**Índice:** [UBUNTO_SERVER.md](../UBUNTO_SERVER.md) | Anterior: [04-pastas-e-servicos.md](04-pastas-e-servicos.md) | Próximo: [06-servidor-na-internet.md](06-servidor-na-internet.md)

---

## 1. Modelo de usuários sugerido

| Usuário | Pasta principal | Privilégio sudo | Finalidade |
|---------|-----------------|-----------------|------------|
| `admin` (conta da instalação) | Todo o sistema | Sim | Administração geral |
| `webuser` | `/srv/web` | Não | Deploy e manutenção de sites |
| `gameuser` | `/srv/games` | Não | Servidor de jogos |
| `backupuser` | `/srv/backup` | Não | Apenas armazenamento/backup |

> Os nomes são ilustrativos. Adaptar conforme a política de cada ambiente.

---

## 2. Criar usuários

### 2.1 Usuário padrão interativo

```bash
sudo adduser backupuser
```

O assistente solicita senha e dados opcionais. Para usuários de serviço, utilizar senha forte.

### 2.2 Usuário sem shell interativo (opcional)

Para contas que só transferem arquivos:

```bash
sudo adduser --disabled-password --shell /usr/sbin/nologin servicoftp
```

---

## 3. Grupos e permissões POSIX

### 3.1 Criar grupo por serviço

```bash
sudo groupadd backup
sudo groupadd webdev
sudo groupadd games
```

### 3.2 Adicionar usuários aos grupos

```bash
sudo usermod -aG backup backupuser
sudo usermod -aG webdev webuser
sudo usermod -aG games gameuser
```

### 3.3 Ajustar dono e permissões das pastas

```bash
# Backup — grupo backup com escrita
sudo chown root:backup /srv/backup
sudo chmod 2770 /srv/backup
sudo mkdir -p /srv/backup/documentos
sudo chown backupuser:backup /srv/backup/documentos
sudo chmod 2770 /srv/backup/documentos

# Web
sudo chown -R webuser:webdev /srv/web
sudo chmod -R 775 /srv/web

# Games
sudo chown -R gameuser:games /srv/games
sudo chmod -R 775 /srv/games
```

O bit `setgid` (`2` no início de `chmod 2770`) faz novos arquivos herdarem o grupo da pasta — útil em pastas compartilhadas.

### 3.4 Impedir acesso a outras pastas

Por padrão, se `backupuser` não pertence aos grupos `webdev` ou `games` e as pastas não são world-readable (`o+r`), o usuário **não lê** `/srv/web` nem `/srv/games`.

Verificar:

```bash
sudo -u backupuser ls /srv/web
# Deve falhar com "Permission denied"
```

---

## 4. ACLs (controle fino)

Quando permissões POSIX não são suficientes:

```bash
sudo apt install -y acl

# Permitir leitura/escrita a backupuser em subpasta específica
sudo setfacl -R -m u:backupuser:rwx /srv/backup/documentos
sudo setfacl -R -d -m u:backupuser:rwx /srv/backup/documentos
```

Listar ACLs:

```bash
getfacl /srv/backup/documentos
```

---

## 5. SFTP com chroot — acesso somente à pasta backup

Abordagem **recomendada** para restringir um usuário à pasta de backup via SFTP, sem acesso ao restante do sistema.

### 5.1 Estrutura de diretórios para chroot

O diretório de chroot deve ser de propriedade de `root` e não gravável pelo usuário:

```bash
sudo chown root:root /srv/backup
sudo chmod 755 /srv/backup

# Pasta gravável dentro do chroot
sudo mkdir -p /srv/backup/uploads
sudo chown backupuser:backupuser /srv/backup/uploads
sudo chmod 755 /srv/backup/uploads
```

### 5.2 Configurar SSH

Editar `/etc/ssh/sshd_config` (adicionar ao final):

```
Match User backupuser
    ChrootDirectory /srv/backup
    ForceCommand internal-sftp
    AllowTcpForwarding no
    X11Forwarding no
```

Validar e reiniciar:

```bash
sudo sshd -t
sudo systemctl restart ssh
```

### 5.3 Testar conexão

No cliente:

```bash
sftp backupuser@192.168.1.100
```

O usuário deve ver apenas o conteúdo dentro de `/srv/backup` (raiz virtual `/`). Navegação para `/srv/web` não é possível.

### 5.4 Samba com usuário restrito

No compartilhamento Samba ([04-pastas-e-servicos.md](04-pastas-e-servicos.md)):

```ini
[backup]
   path = /srv/backup/uploads
   valid users = backupuser
   read only = no
```

---

## 6. Sudo — quem pode administrar o sistema

Conceder sudo apenas à conta administrativa:

```bash
sudo usermod -aG sudo admin
```

**Não** adicionar `backupuser`, `webuser` ou `gameuser` ao grupo `sudo`, salvo necessidade explícita.

Para permitir comandos específicos sem sudo completo, usar `visudo` com regras granulares — documentação: `man sudoers`.

---

## 7. Autenticação por chave SSH

### 7.1 No servidor (como admin)

```bash
sudo mkdir -p /home/backupuser/.ssh
sudo nano /home/backupuser/.ssh/authorized_keys
# Colar chave pública
sudo chown -R backupuser:backupuser /home/backupuser/.ssh
sudo chmod 700 /home/backupuser/.ssh
sudo chmod 600 /home/backupuser/.ssh/authorized_keys
```

### 7.2 Desabilitar login por senha (opcional, após testar chaves)

Em `/etc/ssh/sshd_config`:

```
PasswordAuthentication no
```

Reiniciar SSH. Manter sessão aberta durante o teste para não perder acesso.

---

## 8. Resumo das abordagens

| Abordagem | Restrição | Complexidade | Melhor para |
|-----------|-----------|--------------|-------------|
| Grupos POSIX | Média | Baixa | Equipes pequenas na LAN |
| ACLs | Alta (por arquivo/pasta) | Média | Permissões mistas |
| SFTP chroot | Muito alta | Média | Usuário só backup |
| Samba `valid users` | Alta no share | Baixa | Windows/macOS na rede |

---

## 9. Problemas comuns

| Problema | Causa | Solução |
|----------|-------|---------|
| SFTP chroot falha ao conectar | `/srv/backup` gravável ou não pertence a root | `chown root:root`; `chmod 755` no chroot |
| `Permission denied` no upload | Subpasta sem permissão do usuário | Ajustar dono em `/srv/backup/uploads` |
| Usuário vê outras pastas via SSH shell | Chroot não aplicado | Confirmar bloco `Match User` e `ForceCommand internal-sftp` |
| Grupo não aplicado | Sessão antiga | Usuário deve fazer logout/login ou `newgrp backup` |

---

## Próximos passos

1. [06-servidor-na-internet.md](06-servidor-na-internet.md) — expor serviços com segurança (VPN ou port forwarding)
2. [04-pastas-e-servicos.md](04-pastas-e-servicos.md) — revisar compartilhamentos Samba e SFTP

[← Voltar ao índice](../UBUNTO_SERVER.md)
