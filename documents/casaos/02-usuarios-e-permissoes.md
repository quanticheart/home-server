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

**Por que criar usuários Linux separados:** o Samba, SFTP e permissões de pasta no Ubuntu usam contas do **sistema operacional**, não a conta do painel CasaOS. Cada pessoa (ou função) na rede deve ter um usuário Linux para autenticar e para definir **quais pastas** pode ler ou gravar.

### 3.1 Usuário com login interativo

Use este fluxo para quem acessará pastas pela rede (Mac, Windows, celular) ou eventualmente por SSH.

```bash
sudo adduser familia
```

O assistente cria a pasta `/home/familia` e pede senha. Essa senha Linux será reutilizada depois no **Samba** (`smbpasswd`) para acesso às pastas compartilhadas.

**Resultado esperado:** usuário listado em `cat /etc/passwd | grep familia`.

### 3.2 Usuário apenas para arquivos (sem shell)

Para contas que **só** enviam ou baixam arquivos (SFTP), sem poder abrir terminal no servidor — reduz risco se a senha vazar.

```bash
sudo adduser --disabled-password --shell /usr/sbin/nologin arquivo_ro
sudo passwd arquivo_ro
```

**O que muda:** `nologin` impede sessão SSH interativa; SFTP ainda pode ser configurado com chroot na seção 6.

---

## 4. Grupos e permissões POSIX

**Problema que resolve:** várias pessoas precisam gravar na mesma pasta (`compartilhado`), mas **não** devem acessar `privado` ou `convidado` de outro usuário.

**Como funciona:** no Linux, cada arquivo tem dono, grupo e permissões (`rwx`). Grupos permitem que **vários usuários** compartilhem acesso sem dar acesso ao sistema inteiro.

### 4.1 Criar grupos

Grupos são “etiquetas” de permissão — ex.: todos da família no grupo `familia`.

```bash
sudo groupadd familia
sudo groupadd convidados
```

### 4.2 Adicionar usuários aos grupos

Vincula a conta Linux ao grupo para herdar permissões das pastas configuradas para esse grupo.

```bash
sudo usermod -aG familia familia
sudo usermod -aG convidados convidado
```

> Novas sessões SSH/Samba passam a enxergar o grupo; em caso de dúvida, desconectar e conectar de novo.

### 4.3 Permissões nas pastas

Os comandos abaixo definem **quem é dono** de cada pasta e se o grupo pode ler/gravar. Rode-os após criar a estrutura em `/srv/casaos/`.

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

**Problema que resolve:** o Windows, Mac e apps móveis usam o protocolo **SMB** para “pastas de rede”. O Samba exige uma senha de rede ligada ao usuário Linux — a senha do Ubuntu **não** é ativada automaticamente para SMB.

**Fluxo:** instalar o serviço Samba → registrar senha por usuário → (depois) definir compartilhamentos no `smb.conf` no guia de pastas.

```bash
sudo apt install -y samba
sudo smbpasswd -a familia
sudo smbpasswd -a convidado
```

Cada `smbpasswd -a` pede uma senha de rede; pode ser igual à do Linux, mas o ideal é senhas fortes e distintas para serviços críticos.

Após configurar os compartilhamentos em [03-pastas-rede-e-mobile.md](03-pastas-rede-e-mobile.md), reinicie o Samba para aplicar alterações:

```bash
sudo systemctl restart smbd
```

**Resultado esperado:** ao conectar de outro PC com `familia` + senha Samba, a pasta compartilhada abre sem “acesso negado”.

---

## 6. SFTP com acesso restrito (chroot)

**Problema que resolve:** permitir que alguém envie arquivos pela internet (SFTP) **sem** poder navegar pelo servidor, instalar nada ou ver `/srv/casaos/compartilhado`.

**Como funciona:** o SSH “prende” o usuário dentro de uma pasta (chroot). Ele só vê o que está abaixo desse diretório — útil para `convidado` ou prestadores de serviço.

### 6.1 Estrutura de diretórios

O OpenSSH exige que a **raiz do chroot** pertença ao `root` e não seja gravável pelo usuário; a subpasta `uploads` sim pode ser dele.

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

**Quando usar:** um usuário precisa de acesso a subpasta específica sem entrar no grupo da pasta pai — cenário mais raro que grupos POSIX.

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
