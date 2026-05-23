# Pastas compartilhadas, rede local e dispositivos móveis

Este guia descreve como criar pastas no servidor CasaOS, compartilhá-las na rede (Samba), acessá-las no **macOS**, **Windows**, **Android** e **iOS**, transferir arquivos remotamente e restringir um usuário a **uma única pasta**.

**Índice:** [CASAOS.md](../CASAOS.md) | Anterior: [02-usuarios-e-permissoes.md](02-usuarios-e-permissoes.md) | Próximo: [04-apps-recomendados.md](04-apps-recomendados.md)

---

## Objetivo

Configurar armazenamento em `/srv/casaos/`, expor compartilhamentos SMB na LAN e documentar o acesso passo a passo em cada tipo de dispositivo — com ênfase em **Android** e **iOS**.

---

## Pré-requisitos

- CasaOS instalado ([01-instalacao.md](01-instalacao.md))
- Usuários Linux criados ([02-usuarios-e-permissoes.md](02-usuarios-e-permissoes.md))
- Servidor e clientes na mesma rede Wi-Fi/LAN (para acesso SMB local)
- IP ou hostname do servidor (ex.: `192.168.1.100` ou `homeserver.local`)

---

## 1. Criar e organizar pastas

### 1.1 Estrutura sugerida

```
/srv/casaos/
├── compartilhado/     # Toda a família
├── fotos/             # Fotos e vídeos
├── convidado/         # Acesso restrito
└── privado/           # Administrador
```

### 1.2 Comandos

```bash
sudo mkdir -p /srv/casaos/{compartilhado,fotos,convidado,privado}
sudo chown -R $USER:$USER /srv/casaos/compartilhado /srv/casaos/fotos
sudo chown convidado:convidado /srv/casaos/convidado
sudo chmod 700 /srv/casaos/privado
```

### 1.3 App FILES no CasaOS

No painel web CasaOS, abrir **FILES** para navegar, criar subpastas e enviar arquivos pela interface. Os volumes Docker de apps podem ser mapeados para subpastas de `/srv/casaos/` na instalação de cada app ([04-apps-recomendados.md](04-apps-recomendados.md)).

---

## 2. Compartilhar na rede com Samba (SMB)

O protocolo **SMB/CIFS** é o mais compatível com Mac, Windows e apps móveis nativos.

### 2.1 Instalar Samba

```bash
sudo apt update
sudo apt install -y samba
```

### 2.2 Configurar compartilhamentos

Fazer backup e editar `/etc/samba/smb.conf`. Adicionar ao final:

```ini
[compartilhado]
   path = /srv/casaos/compartilhado
   browseable = yes
   read only = no
   guest ok = no
   valid users = familia

[fotos]
   path = /srv/casaos/fotos
   browseable = yes
   read only = no
   guest ok = no
   valid users = familia, fotos

[convidado]
   path = /srv/casaos/convidado
   browseable = yes
   read only = no
   guest ok = no
   valid users = convidado
```

### 2.3 Senhas Samba

```bash
sudo smbpasswd -a familia
sudo smbpasswd -a convidado
sudo smbpasswd -e familia
sudo smbpasswd -e convidado
```

### 2.4 Ativar e testar

```bash
sudo systemctl enable smbd nmbd
sudo systemctl restart smbd
sudo ufw allow samba
```

Teste local:

```bash
smbclient -L //localhost -U familia
```

---

## 3. Acesso no macOS (Finder)

1. Abrir **Finder**
2. Menu **Ir** → **Conectar ao Servidor** (ou `Cmd + K`)
3. Informar: `smb://192.168.1.100/compartilhado`  
   - Alternativa com mDNS: `smb://homeserver.local/compartilhado`
4. Clicar em **Conectar**
5. Modo **Registrado**; informar usuário `familia` e senha Samba
6. O volume monta na barra lateral
7. **Upload:** arrastar arquivos para a janela do Finder  
8. **Download:** arrastar da pasta do servidor para o Mac
9. Para reconectar ao ligar o Mac: **Preferências do Sistema** → **Usuários e Grupos** → **Itens de login** (ou marcar “Lembrar” na conexão)

---

## 4. Acesso no Windows (Explorador de Arquivos)

1. Abrir **Explorador de Arquivos**
2. Na barra de endereço, digitar: `\\192.168.1.100\compartilhado`
3. Pressionar Enter
4. Informar usuário `familia` e senha Samba (domínio pode ficar em branco ou usar `192.168.1.100\familia`)
5. Marcar **Lembrar credenciais** se desejado
6. **Upload:** copiar/colar arquivos na janela  
7. **Download:** copiar para `Downloads` ou outra pasta local
8. **Mapear unidade de rede (opcional):** botão direito em **Este computador** → **Mapear unidade de rede** → escolher letra (ex.: `Z:`) → pasta `\\192.168.1.100\compartilhado` → **Conectar usando credenciais diferentes** → informar `familia`

---

## 5. Transferência remota (SCP, rsync, SFTP)

Útil para administradores ou quando SMB não está disponível.

### 5.1 SCP — arquivo único

**Enviar para o servidor:**

```bash
scp documento.pdf familia@192.168.1.100:/srv/casaos/compartilhado/
```

**Baixar do servidor:**

```bash
scp familia@192.168.1.100:/srv/casaos/compartilhado/documento.pdf ~/Downloads/
```

### 5.2 rsync — pasta inteira

```bash
rsync -avz --progress ~/Fotos/ familia@192.168.1.100:/srv/casaos/fotos/
```

### 5.3 SFTP — FileZilla / Cyberduck

| Campo | Valor |
|-------|-------|
| Protocolo | SFTP |
| Host | `192.168.1.100` |
| Porta | `22` |
| Usuário | `familia` (ou `convidado` com chroot) |
| Senha | Senha Linux |

Arrastar arquivos entre painéis local e remoto.

---

## 6. Usuário com acesso somente a uma pasta

Exemplo: `convidado` acessa **apenas** `/srv/casaos/convidado`.

### Passo a passo

1. Criar usuário: `sudo adduser convidado`
2. Ajustar dono: `sudo chown -R convidado:convidado /srv/casaos/convidado`
3. **Não** adicionar `convidado` ao grupo `familia`
4. No `smb.conf`, share `[convidado]` com `valid users = convidado` e `path` apontando somente para essa pasta
5. `sudo smbpasswd -a convidado`
6. Reiniciar: `sudo systemctl restart smbd`
7. **Teste no Mac:** conectar a `smb://IP/convidado` com usuário `convidado` — não deve aparecer `compartilhado`
8. **Teste negativo:** `sudo -u convidado ls /srv/casaos/compartilhado` → Permission denied

Para SFTP restrito, ver [02-usuarios-e-permissoes.md](02-usuarios-e-permissoes.md) (chroot).

---

## 7. Android — acesso à pasta compartilhada

> **Requisito:** telefone na mesma rede Wi-Fi que o servidor (para SMB direto). Fora de casa, usar [06-acesso-pela-internet.md](06-acesso-pela-internet.md) (VPN ou Nextcloud).

### 7.1 Método A — SMB com Solid Explorer (recomendado)

1. Instalar [Solid Explorer](https://play.google.com/store/apps/details?id=pl.solidexplorer2) (ou similar: MiXplorer, X-plore)
2. Abrir o app → menu **≡** → **Armazenamento na nuvem** ou **Rede**
3. Toque em **+** → **LAN** → **SMB**
4. **Servidor / Host:** `192.168.1.100` (ou `homeserver.local`)
5. **Pasta compartilhada / Share:** `compartilhado`
6. **Usuário:** `familia`
7. **Senha:** senha definida com `smbpasswd`
8. Salvar e abrir a conexão
9. **Upload:** selecionar arquivo no celular → **Compartilhar** → Solid Explorer → pasta do servidor, ou copiar/colar dentro do app
10. **Download:** selecionar arquivo no servidor → copiar para **Downloads** ou SD
11. Opcional: criar atalho na tela inicial do Solid Explorer para acesso rápido

### 7.2 Método B — Arquivos do Google + app auxiliar

O app **Arquivos** do Google não suporta SMB nativamente em todas as versões. Usar **Solid Explorer** ou **Cx File Explorer** conforme método A.

### 7.3 Método C — Nextcloud (após instalar no CasaOS)

1. Instalar Nextcloud pela App Store do CasaOS ([04-apps-recomendados.md](04-apps-recomendados.md))
2. Instalar app **Nextcloud** na Play Store
3. Abrir app → **Iniciar sessão**
4. **URL do servidor:** `http://192.168.1.100` (ou domínio configurado)
5. Informar usuário e senha do Nextcloud
6. Ativar sincronização das pastas desejadas
7. Upload: botão **+** no app; Download: arquivos disponíveis offline conforme configuração

### 7.4 Método D — Syncthing

1. Instalar Syncthing via CasaOS
2. Instalar app **Syncthing** no Android
3. Parear dispositivos (QR code)
4. Escolher pastas para sincronização bidirecional automática

---

## 8. iOS e iPadOS — acesso à pasta compartilhada

> **Requisito:** iPhone/iPad na mesma rede Wi-Fi que o servidor (SMB). Fora de casa, ver seção 9 e [06-acesso-pela-internet.md](06-acesso-pela-internet.md).

### 8.1 Método A — App Arquivos (SMB nativo)

1. Abrir o app **Arquivos**
2. Aba **Navegar** → toque em **⋯** (três pontos) no canto superior
3. Toque em **Conectar ao Servidor**
4. No campo servidor, digitar: `smb://192.168.1.100`  
   - Com mDNS: `smb://homeserver.local`
5. Toque em **Conectar**
6. Selecionar **Registrado**
7. **Nome:** `familia` (usuário Samba)
8. **Senha:** senha Samba
9. Escolher o volume **compartilhado** (ou `fotos`, `convidado`)
10. A pasta aparece em **Navegar** → nome do servidor
11. **Upload:** em outro app (Fotos, Safari), toque **Compartilhar** → **Salvar em Arquivos** → selecionar pasta do servidor  
12. **Upload alternativo:** em Arquivos, abrir pasta do servidor → **⋯** → **Copiar** / arrastar de **No meu iPhone**
13. **Download:** selecionar arquivo no servidor → **Compartilhar** → salvar em **No meu iPhone** ou iCloud Drive
14. Para desconectar: **⋯** na pasta do servidor → **Desconectar**

### 8.2 Método B — Nextcloud (iOS)

1. Instalar Nextcloud no CasaOS
2. Instalar app **Nextcloud** na App Store
3. **URL do servidor:** `http://192.168.1.100`
4. Login e senha Nextcloud
5. Ativar **Disponível offline** nos arquivos importantes
6. Upload via botão **+** no app

### 8.3 Método C — SFTP (apps de terceiros)

Apps como **FE File Explorer** ou **Secure ShellFish**:

1. Adicionar conexão **SFTP**
2. Host: `192.168.1.100`, porta `22`, usuário `familia`
3. Navegar até `/srv/casaos/compartilhado` (caminho real no servidor)
4. Upload/download dentro do app

---

## 9. Tabela resumo — LAN vs fora de casa

| Dispositivo | Na rede de casa (LAN) | Fora de casa (internet) |
|-------------|------------------------|-------------------------|
| **Mac** | Finder `smb://IP/compartilhado` | Tailscale + mesmo SMB, ou Nextcloud |
| **Windows** | `\\IP\compartilhado` | Tailscale + SMB, ou Nextcloud |
| **Android** | Solid Explorer SMB | App Nextcloud ou Tailscale + SMB |
| **iOS** | Arquivos → Conectar ao servidor SMB | App Nextcloud ou Tailscale + SMB |

Detalhes de acesso pela internet: [06-acesso-pela-internet.md](06-acesso-pela-internet.md).

---

## 10. Problemas comuns

| Problema | Solução |
|----------|---------|
| Android/iOS não encontra servidor | Confirmar mesmo Wi-Fi; desativar VPN no celular temporariamente |
| Credenciais rejeitadas | `sudo smbpasswd -a usuario`; verificar usuário em `valid users` |
| iOS não mostra SMB | Usar `smb://IP` sem barra final; rede convidado isolada no roteador impede acesso |
| Pasta vazia no Mac mas arquivos existem | Verificar permissões `ls -la /srv/casaos/compartilhado` |
| Firewall bloqueia | `sudo ufw allow samba` |
| Conexão cai após reboot do servidor | Configurar IP estável ou mDNS — [05-acesso-sem-ip-fixo.md](05-acesso-sem-ip-fixo.md) |

---

## Próximos passos

1. [04-apps-recomendados.md](04-apps-recomendados.md) — Nextcloud, Jellyfin e outros
2. [05-acesso-sem-ip-fixo.md](05-acesso-sem-ip-fixo.md) — não depender do IP após reinício
3. [06-acesso-pela-internet.md](06-acesso-pela-internet.md) — acesso remoto seguro

[← Voltar ao hub CasaOS](../CASAOS.md)
