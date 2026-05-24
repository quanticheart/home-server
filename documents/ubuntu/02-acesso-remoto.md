# Acesso remoto via SSH

Este guia descreve como conectar-se ao Ubuntu Server a partir de outro computador na mesma rede, usando SSH. São abordados macOS (Terminal) e Windows (PowerShell).

**Pré-requisitos:**

- Ubuntu Server instalado com **OpenSSH Server** habilitado ([01-instalacao.md](01-instalacao.md))
- Servidor e cliente na mesma rede local (LAN)
- Endereço IP do servidor (ex.: `192.168.1.100` — valor ilustrativo)

**Índice:** [UBUNTO_SERVER.md](../UBUNTO_SERVER.md) | Anterior: [01-instalacao.md](01-instalacao.md) | Próximo: [03-armazenamento-disco.md](03-armazenamento-disco.md)

---

## 1. Obter o endereço IP do servidor

**Por que isso vem primeiro:** o SSH conecta por **endereço IP** (ou hostname) na rede local. Sem o IP correto, o cliente não encontra o servidor.

No servidor (console local com monitor, ou sessão já aberta):

```bash
hostname -I
```

O comando pergunta ao sistema “quais IPs estou usando agora?”. O primeiro endereço listado em geral é o IPv4 na LAN (`192.168.x.x` ou `10.x.x.x`) — é esse valor que entra em `ssh usuario@192.168.1.100`.

Alternativas:

- Consultar a lista de dispositivos no painel do roteador
- Executar `ip a` e localizar a interface `eth0`, `enp*` ou `wlan0`

---

## 2. Acesso a partir do macOS (Terminal)

### 2.1 Abrir o Terminal

- **Aplicativos → Utilitários → Terminal**, ou
- Spotlight (`Cmd + Espaço`) → digitar `Terminal`

### 2.2 Conectar via SSH

**O que acontece:** o Mac abre um canal criptografado até o servidor. Tudo digitado depois roda **no Ubuntu**, não no Mac — ideal para administrar o servidor sem monitor dedicado.

Substituir `usuario` pelo nome criado na instalação do Ubuntu e `192.168.1.100` pelo IP da seção 1:

```bash
ssh usuario@192.168.1.100
```

Na **primeira** conexão, o SSH exibe o “fingerprint” do servidor — mecanismo de segurança para detectar servidor falso na rede. Após aceitar uma vez, o Mac lembra dessa máquina.

```
The authenticity of host '192.168.1.100' can't be established.
ED25519 key fingerprint is SHA256:...
Are you sure you want to continue connecting (yes/no)?
```

Digitar `yes` e pressionar Enter. Em seguida, informar a senha do usuário (os caracteres não são exibidos ao digitar — comportamento normal).

### 2.3 Autenticação por chave SSH (recomendado)

**Problema que resolve:** senhas digitadas repetidamente e risco de brute force na porta SSH. Com chave, só quem tem o arquivo privado no Mac autentica.

**Fluxo:** gerar par de chaves no Mac → copiar chave **pública** para o servidor → login passa a usar criptografia assimétrica.

No Mac, gerar chave (se ainda não existir):

```bash
ssh-keygen -t ed25519 -C "macbook-homeserver"
```

Aceitar o caminho padrão (`Enter`) e opcionalmente definir frase secreta na chave.

Copiar a chave pública para o servidor (pedirá senha **uma última vez**):

```bash
ssh-copy-id usuario@192.168.1.100
```

**Resultado esperado:** `ssh usuario@IP` conecta sem pedir senha do usuário (pode pedir frase da chave, se configurada).

### 2.4 Atalho com arquivo de configuração

Editar `~/.ssh/config` no Mac:

```
Host homeserver
    HostName 192.168.1.100
    User usuario
    IdentityFile ~/.ssh/id_ed25519
```

Conectar com:

```bash
ssh homeserver
```

---

## 3. Acesso a partir do Windows (PowerShell)

### 3.1 Verificar o cliente OpenSSH

O Windows 10 e 11 incluem cliente SSH. Abrir **PowerShell** ou **Windows Terminal** e executar:

```powershell
ssh -V
```

Se o comando não for reconhecido:

1. **Configurações → Aplicativos → Recursos opcionais**
2. Adicionar **Cliente OpenSSH**

### 3.2 Conectar via SSH

```powershell
ssh usuario@192.168.1.100
```

Aceitar o fingerprint na primeira conexão (`yes`) e informar a senha.

### 3.3 Copiar chave SSH (Windows)

Gerar chave no PowerShell:

```powershell
ssh-keygen -t ed25519
```

Copiar a chave manualmente ou com:

```powershell
type $env:USERPROFILE\.ssh\id_ed25519.pub | ssh usuario@192.168.1.100 "mkdir -p ~/.ssh && cat >> ~/.ssh/authorized_keys"
```

### 3.4 Alternativas no Windows

| Ferramenta | Uso |
|------------|-----|
| **Windows Terminal** | Interface moderna com abas; suporta SSH nativo |
| **PuTTY** | Cliente clássico; requer conversão de chave para formato `.ppk` se usar chaves |

---

## 4. Comandos úteis após conectar

```bash
# Informações do sistema
uname -a
lsb_release -a

# Espaço em disco
df -h

# Serviços em execução
systemctl list-units --type=service --state=running

# Encerrar sessão SSH
exit
```

---

## 5. Transferência rápida de arquivos (SCP)

**Do Mac/Windows para o servidor:**

```bash
scp arquivo.txt usuario@192.168.1.100:/tmp/
```

**Do servidor para o Mac/Windows:**

```bash
scp usuario@192.168.1.100:/tmp/arquivo.txt ./
```

Para pastas, usar `scp -r`. Detalhes em [04-pastas-e-servicos.md](04-pastas-e-servicos.md).

---

## 6. Problemas comuns

| Mensagem / sintoma | Causa provável | Solução |
|--------------------|----------------|---------|
| `Connection refused` | SSH não instalado ou parado | No servidor: `sudo apt install openssh-server` e `sudo systemctl enable --now ssh` |
| `Permission denied` | Usuário ou senha incorretos | Verificar credenciais; testar login local |
| `Connection timed out` | IP errado ou firewall | Confirmar IP; verificar `sudo ufw status` no servidor |
| `No route to host` | Cliente e servidor em redes diferentes | Conectar ambos à mesma LAN |
| Host key changed | IP reutilizado ou reinstalação | Remover entrada antiga em `~/.ssh/known_hosts` |

### Verificar SSH no servidor (console local)

```bash
sudo systemctl status ssh
sudo ss -tlnp | grep :22
```

### Firewall (UFW)

Se o UFW estiver ativo e bloquear conexões na LAN:

```bash
sudo ufw allow OpenSSH
sudo ufw status
```

---

## Próximos passos

1. [03-armazenamento-disco.md](03-armazenamento-disco.md) — ajustar tamanho do disco, se necessário
2. [04-pastas-e-servicos.md](04-pastas-e-servicos.md) — criar estrutura de pastas e enviar arquivos
3. [06-servidor-na-internet.md](06-servidor-na-internet.md) — acesso fora da rede local

[← Voltar ao índice](../UBUNTO_SERVER.md)
