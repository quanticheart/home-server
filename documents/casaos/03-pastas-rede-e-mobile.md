# Pastas compartilhadas, rede local e dispositivos móveis

Este guia descreve como criar pastas no CasaOS, **compartilhá-las na rede** para Mac, Windows, Android e iOS, transferir arquivos e restringir o acesso por usuário.

**Índice:** [CASAOS.md](../CASAOS.md) | Anterior: [02-usuarios-e-permissoes.md](02-usuarios-e-permissoes.md) | Próximo: [04-apps-recomendados.md](04-apps-recomendados.md)

---

## Objetivo

Configurar armazenamento no servidor, expor pastas na rede local (protocolo SMB) e acessá-las em cada tipo de dispositivo — com atenção especial a **Android** e **iOS**.

---

## De onde vem este guia?

Este documento combina **duas camadas** que costumam aparecer juntas na prática:

| Camada | O que é | Quando usar |
|--------|---------|-------------|
| **CasaOS (app FILES)** | Interface web do CasaOS para criar pastas e ativar **compartilhamento Samba** com poucos cliques | Fluxo **recomendado** para começar |
| **Ubuntu (terminal)** | Usuários Linux, `smbpasswd`, edição de `/etc/samba/smb.casa.conf` | Quando for preciso **senha obrigatória**, vários usuários ou pastas fora do padrão do CasaOS |

O CasaOS **já integra Samba**: ao compartilhar uma pasta pelo FILES, o sistema grava a configuração em `/etc/samba/smb.casa.conf` e reinicia o serviço. Não é necessário instalar Samba “do zero” na mão para o caso básico — mas **proteger com usuário e senha** ainda envolve passos no Ubuntu, porque o compartilhamento pela interface costuma vir **aberto na rede local** por padrão (acesso convidado).

Referências úteis: [site CasaOS](https://casaos.zimaspace.com/), discussões da comunidade no [GitHub IceWhaleTech/CasaOS](https://github.com/IceWhaleTech/CasaOS) (Samba e FILES).

---

## Pré-requisitos

- CasaOS instalado ([01-instalacao.md](01-instalacao.md))
- Servidor e clientes na **mesma rede Wi-Fi/LAN**
- IP ou hostname do servidor (ex.: `192.168.1.100` ou `homeserver.local` — ver [05-acesso-sem-ip-fixo.md](05-acesso-sem-ip-fixo.md))
- Para acesso com senha: usuário Linux criado ([02-usuarios-e-permissoes.md](02-usuarios-e-permissoes.md))

---

## 1. Onde ficam os arquivos no CasaOS

Ao abrir **FILES** no painel, a área principal costuma ser a pasta **`/DATA`** no servidor (padrão do CasaOS). Dentro dela podem existir subpastas como `Documents`, `Photos`, `Downloads` — ou **pastas novas** criadas pelo próprio app.

| Caminho | Uso |
|---------|-----|
| `/DATA/MinhaPasta` | Pastas criadas pelo FILES (fluxo normal) |
| `/srv/casaos/...` | Layout alternativo via terminal — só se tiver criado manualmente |

> **Importante:** o nome que aparece na rede (ex.: `MinhaPasta`) é o **nome do compartilhamento Samba**, em geral igual ao nome da pasta no FILES. Anotar esse nome para conectar no Mac, Windows ou celular.

---

## 2. Caminho recomendado — criar pasta e compartilhar pelo FILES

**Problema que resolve:** ter uma pasta na rede local sem editar arquivos de configuração na mão.

**O que o CasaOS faz nos bastidores:** ao ativar o compartilhamento, o CasaOS registra o share no banco interno, gera entradas em `/etc/samba/smb.casa.conf` e recarrega o Samba.

### 2.1 Criar a pasta no FILES

1. Abrir o painel CasaOS no navegador (ex.: `http://192.168.1.100`)
2. Entrar no app **FILES**
3. Navegar até **DATA** (ou outro volume listado à esquerda)
4. Criar pasta: menu **+** / **New Folder** / botão de nova pasta (o rótulo pode variar conforme a versão)
5. Dar um nome claro — ex.: `compartilhado`, `fotos`, `convidado`

**Resultado esperado:** a pasta aparece na árvore do FILES e no disco em `/DATA/compartilhado` (ou nome escolhido).

### 2.2 Ativar compartilhamento Samba na pasta

1. No FILES, localizar a pasta criada
2. Abrir o menu da pasta (clique direito ou ícone **⋯**)
3. Escolher opção do tipo **Share**, **Share via Samba** ou **Manage Samba** / **Gerenciar Samba**
4. Confirmar a criação do compartilhamento na interface

**Resultado esperado:**

- A pasta passa a aparecer na seção de compartilhamentos do CasaOS (em algumas versões: **Shared** / **Compartilhados**)
- No Windows, algo como `\\192.168.1.100\compartilhado`
- No Mac, `smb://192.168.1.100/compartilhado`

### 2.3 Testar na rede local

| Sistema | Como testar |
|---------|-------------|
| **Windows** | Explorador → `\\IP_DA_MAQUINA\nome_da_pasta` |
| **Mac** | Finder → Ir → Conectar ao Servidor → `smb://IP/nome_da_pasta` |

Se abrir **sem pedir senha**, o share está no modo **convidado** (padrão comum do CasaOS). Qualquer dispositivo na mesma rede pode ler e gravar — conveniente em casa, **arriscado** se a rede não for confiável. A seção 3 explica como exigir usuário e senha.

### 2.4 Enviar arquivos pelo próprio FILES

Para uso só pelo navegador (sem montar pasta no sistema operacional):

- Arrastar arquivos para a pasta no FILES, ou
- Usar upload pelo botão do app

Isso **não substitui** o SMB no celular — para Android/iOS na LAN, seguir as seções 7 e 8.

---

## 3. Proteger o compartilhamento (senha e usuário)

**Problema que resolve:** o compartilhamento criado pelo FILES costuma permitir acesso **anônimo na LAN** (`guest ok = Yes` em `/etc/samba/smb.casa.conf`). Para exigir login — recomendado mesmo em casa — é preciso ajustar Samba no Ubuntu.

**Fluxo resumido:** (1) ter usuário Linux → (2) definir senha Samba → (3) editar o share gerado pelo CasaOS → (4) reiniciar Samba.

### 3.1 Usuário Linux e senha Samba

O Samba autentica com **contas do Ubuntu**, não com a senha do painel web do CasaOS (salvo se for a mesma conta de sistema).

```bash
# Exemplo: usuário dedicado (ver 02-usuarios-e-permissoes.md)
sudo adduser familia
sudo smbpasswd -a familia
```

O comando `smbpasswd` cria a credencial de **rede** usada pelo Windows, Mac e celular. Repetir para cada pessoa (`convidado`, etc.).

### 3.2 Ajustar o share que o CasaOS criou

O CasaOS grava shares em **`/etc/samba/smb.casa.conf`**. Fazer backup antes de editar:

```bash
sudo cp /etc/samba/smb.casa.conf /etc/samba/smb.casa.conf.bak
sudo nano /etc/samba/smb.casa.conf
```

Localizar o bloco da pasta (ex.: `[compartilhado]`) e alterar conforme o exemplo:

```ini
[compartilhado]
   comment = CasaOS share compartilhado
   path = /DATA/compartilhado
   browseable = yes
   read only = no
   guest ok = no
   valid users = familia
```

| Parâmetro | Significado |
|-----------|-------------|
| `guest ok = no` | Exige autenticação — desliga acesso anônimo |
| `valid users = familia` | Só o usuário `familia` (ajustar nome) |
| `path` | Deve apontar para o caminho real da pasta (conferir no FILES ou com `ls /DATA`) |

> Se o CasaOS criar um **novo** share pela interface depois da edição manual, pode **reescrever** trechos deste arquivo. Manter o `.bak` e repetir o ajuste de `guest ok` quando necessário.

### 3.3 Aplicar e testar

```bash
sudo systemctl restart smbd
sudo ufw allow samba
```

Tentar de novo no Mac ou Windows: agora deve pedir **usuário** e **senha Samba**.

**Resultado esperado:** sem credenciais corretas, a conexão é recusada.

---

## 4. Caminho alternativo — terminal Ubuntu (avançado)

**Quando usar este caminho em vez do FILES:**

- Quiser tudo em `/srv/casaos/` em vez de `/DATA`
- Precisar definir donos, grupos e permissões **antes** de compartilhar
- Montar disco extra só para dados

**O que este bloco faz:** cria pastas e permissões no Linux; o compartilhamento na rede ainda pode ser feito pelo FILES (apontando para essa pasta, se ela aparecer no app) ou configurando `smb.conf` manualmente.

```bash
sudo mkdir -p /srv/casaos/{compartilhado,fotos,convidado}
sudo chown -R $USER:$USER /srv/casaos/compartilhado /srv/casaos/fotos
sudo chown convidado:convidado /srv/casaos/convidado
```

Para expor `/srv/casaos/compartilhado` só pela linha de comando (sem FILES), adicionar bloco em `/etc/samba/smb.conf` ou `smb.casa.conf` — mesmo formato da seção 3.2, mudando `path`.

---

## 5. Acesso no macOS (Finder)

**Contexto:** após o share existir (seção 2 ou 3), o Mac monta a pasta como volume de rede.

1. Abrir **Finder**
2. **Ir** → **Conectar ao Servidor** (`Cmd + K`)
3. Digitar: `smb://192.168.1.100/compartilhado` (ajustar IP e **nome do share**)
   - Com mDNS: `smb://homeserver.local/compartilhado`
4. **Conectar** → modo **Registrado** se o share exige senha
5. Informar usuário Linux e senha Samba (`familia` no exemplo)
6. **Upload:** arrastar arquivos para a janela do Finder
7. **Download:** arrastar do volume do servidor para o Mac

---

## 6. Acesso no Windows (Explorador de Arquivos)

1. Abrir **Explorador de Arquivos**
2. Na barra de endereço: `\\192.168.1.100\compartilhado`
3. Enter → informar usuário e senha Samba se solicitado
4. **Mapear unidade (opcional):** Este computador → Mapear unidade de rede → `\\IP\compartilhado`

---

## 7. Transferência via SSH (SCP, rsync, SFTP)

**Quando usar:** scripts, administração, ou quando SMB não funciona na rede.

O caminho no disco continua sendo `/DATA/nome_da_pasta` (CasaOS) ou `/srv/casaos/...` (manual).

```bash
# Enviar arquivo
scp foto.jpg familia@192.168.1.100:/DATA/compartilhado/

# Sincronizar pasta
rsync -avz ~/Fotos/ familia@192.168.1.100:/DATA/fotos/
```

FileZilla/Cyberduck: protocolo **SFTP**, host = IP, usuário = conta Linux.

---

## 8. Usuário com acesso somente a uma pasta

**Problema que resolve:** `convidado` só enxerga a pasta dele, não `compartilhado` nem `fotos`.

**Estratégia:**

1. Criar pasta `convidado` no FILES (ou em `/DATA/convidado`)
2. Criar usuário Linux `convidado` ([02-usuarios-e-permissoes.md](02-usuarios-e-permissoes.md))
3. Compartilhar **só** essa pasta pelo FILES **ou** um bloco `[convidado]` em `smb.casa.conf` com `valid users = convidado` e `path = /DATA/convidado`
4. `sudo smbpasswd -a convidado`
5. **Não** usar o mesmo usuário em outros shares

**Teste:** conectar com `convidado` — deve ver apenas o share `convidado`; `compartilhado` não deve autenticar ou não deve aparecer para esse usuário.

---

## 9. Android — acesso à pasta compartilhada

> **Requisito:** mesmo Wi-Fi que o servidor. Fora de casa: [06-acesso-pela-internet.md](06-acesso-pela-internet.md).

### 9.1 SMB com Solid Explorer (recomendado)

1. Instalar [Solid Explorer](https://play.google.com/store/apps/details?id=pl.solidexplorer2)
2. Menu **≡** → **Armazenamento na nuvem** / **Rede** → **+** → **LAN** → **SMB**
3. **Host:** `192.168.1.100` (ou `homeserver.local`)
4. **Share:** nome exato do compartilhamento (ex.: `compartilhado`) — o mesmo criado no FILES
5. **Usuário / senha:** conta Linux + senha Samba (se `guest ok = no`; se guest estiver ativo, alguns apps conectam sem senha — ver seção 3)
6. Upload/download dentro do app

### 9.2 Nextcloud ou Syncthing

Alternativas com apps dedicados — ver [04-apps-recomendados.md](04-apps-recomendados.md) e seção 9 do guia antigo (mesma lógica).

---

## 10. iOS / iPadOS — app Arquivos (SMB)

1. App **Arquivos** → **Navegar** → **⋯** → **Conectar ao Servidor**
2. `smb://192.168.1.100` ou `smb://homeserver.local`
3. **Registrado** + usuário/senha Samba (se share protegido)
4. Escolher o volume com o nome do share (`compartilhado`, etc.)
5. **Upload:** Compartilhar arquivo → **Salvar em Arquivos** → pasta do servidor

---

## 11. Resumo — qual caminho seguir?

1. Criar pasta no **FILES** (`/DATA`)
2. Menu da pasta → **Share via Samba**
3. Testar no Mac ou Windows (`smb://IP/nome`)
4. **Quer senha?** → `smbpasswd` + editar `smb.casa.conf` (seção 3)
5. Conectar **Android** e **iOS** (seções 9 e 10)

| Etapa | CasaOS FILES | Terminal Ubuntu |
|-------|--------------|-----------------|
| Criar pasta | Sim | Opcional (`mkdir`) |
| Ativar share SMB | Sim (menu da pasta) | Editar `smb.casa.conf` |
| Exigir senha | Ajuste manual em `smb.casa.conf` | `smbpasswd` + `guest ok = no` |
| Mac / Windows / mobile | Mesmos passos após share existir | Mesmos passos |

---

## 12. Problemas comuns

| Problema | Causa provável | Solução |
|----------|----------------|---------|
| Não aparece opção Share no FILES | Versão do CasaOS ou pasta em volume não local | Atualizar CasaOS; criar pasta em **DATA** |
| Conecta sem senha e qualquer um entra | Padrão `guest ok = Yes` | Seção 3 — `guest ok = no` + `valid users` |
| Senha não aceita | Sem `smbpasswd` | `sudo smbpasswd -a usuario` |
| Share sumiu após editar config | CasaOS recriou `smb.casa.conf` | Backup `.bak`; reeditar ou compartilhar de novo e ajustar |
| Caminho errado no `smb.casa.conf` | Pasta em `/DATA` mas path antigo | Conferir com FILES ou `ls /DATA` |
| Android/iOS não acha servidor | Wi-Fi diferente ou guest isolado | Mesma rede; desativar VPN no celular |
| Firewall | UFW bloqueando | `sudo ufw allow samba` |

---

## Próximos passos

1. [04-apps-recomendados.md](04-apps-recomendados.md) — Nextcloud, Jellyfin (acesso por app além de SMB)
2. [05-acesso-sem-ip-fixo.md](05-acesso-sem-ip-fixo.md) — `homeserver.local` em vez de IP
3. [06-acesso-pela-internet.md](06-acesso-pela-internet.md) — acesso fora de casa

[← Voltar ao hub CasaOS](../CASAOS.md)
