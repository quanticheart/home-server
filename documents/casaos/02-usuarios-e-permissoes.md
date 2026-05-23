# Usuários e permissões no CasaOS

Este guia explica os **dois níveis de usuário** no ambiente CasaOS + Ubuntu e como configurar contas Linux com acesso restrito a pastas específicas em `/srv/casaos/`.

**Índice:** [CASAOS.md](../CASAOS.md) | Anterior: [01-instalacao.md](01-instalacao.md) | Próximo: [03-pastas-rede-e-mobile.md](03-pastas-rede-e-mobile.md)

---

## Objetivo

Separar a administração do painel web da administração de arquivos na rede, criar múltiplos usuários Linux e limitar cada um às pastas autorizadas.

---

## Pré-requisitos

- CasaOS instalado ([01-instalacao.md](01-instalacao.md))
- Pasta base `/srv/casaos/` criada
- Acesso `sudo` no servidor

---

## 1. Dois níveis de usuário

| Nível | O que controla | Onde é criado |
|-------|------------------|---------------|
| **Administrador CasaOS** | Apps, App Store, FILES (visão admin), Settings | Assistente na instalação do CasaOS |
| **Usuários Linux** | Login Samba, SFTP, SSH, dono de arquivos | Terminal Ubuntu (`adduser`) |

O administrador do painel **não substitui** usuários Linux para compartilhamento SMB no Mac, Windows ou apps móveis. Para cada pessoa ou finalidade na rede, criar um usuário Linux (ou um usuário por pasta).

---

## 2. Modelo sugerido

| Usuário Linux | Pasta principal | Painel CasaOS | Samba | SFTP |
|---------------|-----------------|---------------|-------|------|
| `admin` (conta Ubuntu) | Todo o sistema | Sim (admin) | Opcional | Sim |
| `familia` | `/srv/casaos/compartilhado` | Não | Sim | Opcional |
| `convidado` | `/srv/casaos/convidado` | Não | Sim (só essa pasta) | Opcional |
| `fotos` | `/srv/casaos/fotos` | Não | Sim | Opcional |

> Nomes ilustrativos. Adaptar ao ambiente real.

---

## 3. Criar usuários Linux

### 3.1 Usuário com login interativo

```bash
sudo adduser familia
```

Informar senha forte quando solicitado.

### 3.2 Usuário apenas para arquivos (sem shell)

```bash
sudo adduser --disabled-password --shell /usr/sbin/nologin arquivo_ro
sudo passwd arquivo_ro
```

---

## 4. Grupos e permissões POSIX

### 4.1 Criar grupos

```bash
sudo groupadd familia
sudo groupadd convidados
```

### 4.2 Adicionar usuários aos grupos

```bash
sudo usermod -aG familia familia
sudo usermod -aG convidados convidado
```

### 4.3 Permissões nas pastas

```bash
sudo mkdir -p /srv/casaos/{compartilhado,convidado,fotos,privado}

# Compartilhado — família
sudo chown root:familia /srv/casaos/compartilhado
sudo chmod 2770 /srv/casaos/compartilhado

# Convidado — apenas esse usuário
sudo chown convidado:convidado /srv/casaos/convidado
sudo chmod 750 /srv/casaos/convidado

# Privado — só admin Ubuntu
sudo chown root:root /srv/casaos/privado
sudo chmod 700 /srv/casaos/privado
```

O bit `setgid` (`2` em `2770`) faz novos arquivos herdarem o grupo da pasta.

### 4.4 Testar isolamento

```bash
sudo -u convidado ls /srv/casaos/compartilhado
```

Deve retornar **Permission denied** se o convidado não pertence ao grupo `familia`.

---

## 5. Senha Samba (obrigatória para SMB)

Usuários que acessam pastas via Windows/macOS/Android/iOS precisam de senha Samba vinculada à conta Linux:

```bash
sudo apt install -y samba
sudo smbpasswd -a familia
sudo smbpasswd -a convidado
```

Reiniciar Samba após configurar compartilhamentos em [03-pastas-rede-e-mobile.md](03-pastas-rede-e-mobile.md):

```bash
sudo systemctl restart smbd
```

---

## 6. SFTP com acesso restrito (chroot)

Para permitir apenas upload/download em uma pasta, sem shell no servidor.

### 6.1 Estrutura de diretórios

O diretório de chroot deve pertencer a `root` e não ser gravável pelo usuário:

```bash
sudo mkdir -p /srv/casaos/convidado/uploads
sudo chown root:root /srv/casaos/convidado
sudo chmod 755 /srv/casaos/convidado
sudo chown convidado:convidado /srv/casaos/convidado/uploads
```

### 6.2 Configurar SSH

Editar `/etc/ssh/sshd_config` e adicionar ao final:

```
Match User convidado
    ChrootDirectory /srv/casaos/convidado
    ForceCommand internal-sftp
    AllowTcpForwarding no
    X11Forwarding no
```

Validar e reiniciar:

```bash
sudo sshd -t
sudo systemctl restart ssh
```

### 6.3 Testar

```bash
sftp convidado@192.168.1.100
```

O usuário deve ver apenas o conteúdo dentro de `/srv/casaos/convidado` (raiz virtual `/`).

---

## 7. ACLs (controle fino opcional)

```bash
sudo apt install -y acl
sudo setfacl -R -m u:familia:rwx /srv/casaos/compartilhado
sudo setfacl -R -d -m u:familia:rwx /srv/casaos/compartilhado
```

---

## 8. O que não fazer

- **Não** adicionar `familia` ou `convidado` ao grupo `sudo`
- **Não** usar a mesma senha fraca no painel CasaOS e no Samba
- **Não** dar permissão `777` em pastas compartilhadas (risco de segurança)

---

## Problemas comuns

| Problema | Solução |
|----------|---------|
| Samba pede senha e rejeita | Executar `sudo smbpasswd -a usuario` |
| SFTP chroot falha | Chroot deve ser `root:root` com `755`; subpastas graváveis pelo usuário |
| Usuário vê pasta de outro | Revisar grupos com `groups usuario` e permissões com `ls -la` |

---

## Próximos passos

1. [03-pastas-rede-e-mobile.md](03-pastas-rede-e-mobile.md) — compartilhar pastas, Mac, Windows, Android e iOS
2. [04-apps-recomendados.md](04-apps-recomendados.md) — instalar Nextcloud e outros apps

[← Voltar ao hub CasaOS](../CASAOS.md)
