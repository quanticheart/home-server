# Acesso ao CasaOS sem depender do IP

Este guia descreve como acessar o painel CasaOS e compartilhamentos de arquivos **sem precisar redigitar o IP** após cada reinício do servidor — especialmente quando **não há acesso ao roteador** para reservar IP fixo (DHCP reservation).

**Índice:** [CASAOS.md](../CASAOS.md) | Anterior: [04-apps-recomendados.md](04-apps-recomendados.md) | Próximo: [06-acesso-pela-internet.md](06-acesso-pela-internet.md)

---

## Objetivo

Manter URLs e caminhos SMB estáveis na rede local (`homeserver.local`) ou via VPN, evitando que Mac, Windows, Android e iOS percam a conexão quando o DHCP atribui um IP novo ao servidor.

---

## Pré-requisitos

- CasaOS instalado ([01-instalacao.md](01-instalacao.md))
- Clientes na mesma LAN (para mDNS/SMB local)

---

## 1. Por que o IP muda

Em redes domésticas, o roteador atribui IPs via **DHCP**. Após reiniciar o servidor, o endereço pode mudar (ex.: de `192.168.1.100` para `192.168.1.105`). Bookmarks, apps móveis e unidades de rede mapeadas deixam de funcionar.

| Solução | Precisa do roteador? | Estável na LAN |
|---------|----------------------|----------------|
| Reserva DHCP no roteador | Sim | Sim |
| IP estático no servidor (Netplan) | Não* | Sim |
| mDNS (`hostname.local`) | Não | Sim** |
| Tailscale MagicDNS | Não | Sim (via VPN) |

\* Desde que o IP escolhido não conflite com outro dispositivo.  
\*\* Requer suporte mDNS nos clientes (Mac, iOS e muitos Android/Linux).

---

## 2. mDNS — `homeserver.local` (recomendado sem roteador)

O **mDNS** (Bonjour/Avahi) permite resolver `http://homeserver.local` em vez de um IP numérico.

### 2.1 Instalar Avahi no Ubuntu

```bash
sudo apt update
sudo apt install -y avahi-daemon
sudo systemctl enable --now avahi-daemon
```

### 2.2 Definir hostname

```bash
sudo hostnamectl set-hostname homeserver
```

Reiniciar ou aguardar alguns minutos.

### 2.3 Testar

No Mac ou Linux na mesma LAN:

```bash
ping homeserver.local
```

No navegador:

- Painel CasaOS: `http://homeserver.local` (ou porta configurada, ex.: `http://homeserver.local:8080`)
- SMB no Mac: `smb://homeserver.local/compartilhado`

### 2.4 Sobre `casaos.local`

A [FAQ do CasaOS](https://casaos.zimaspace.com/) informa que `casaos.local` pode não funcionar em todos os ambientes. Se falhar, usar **`homeserver.local`** (hostname do Ubuntu) ou o IP temporário até o mDNS responder.

---

## 3. IP estático no próprio servidor (Netplan)

Quando mDNS não for confiável em todos os dispositivos, fixar o IP **no servidor** sem alterar o roteador.

### 3.1 Identificar interface

```bash
ip a
```

Anotar interface (ex.: `enp3s0`, `eth0`) e gateway atual (em geral `192.168.1.1`).

### 3.2 Exemplo Netplan

Editar `/etc/netplan/00-installer-config.yaml` (nome pode variar):

```yaml
network:
  version: 2
  ethernets:
    enp3s0:
      dhcp4: no
      addresses:
        - 192.168.1.100/24
      routes:
        - to: default
          via: 192.168.1.1
      nameservers:
        addresses:
          - 192.168.1.1
          - 8.8.8.8
```

Aplicar:

```bash
sudo netplan try
sudo netplan apply
```

> **Atenção:** escolher um IP fora da faixa DHCP do roteador ou um IP que o roteador não distribua a outros aparelhos, para evitar conflito.

### 3.3 Atualizar favoritos

Usar sempre `192.168.1.100` nos atalhos — o valor não muda após reboot.

---

## 4. Tailscale MagicDNS (LAN + remoto)

O [Tailscale](https://tailscale.com/) cria uma rede privada com hostnames estáveis (`homeserver.tailnet-name.ts.net`).

### 4.1 Instalar no servidor

```bash
curl -fsSL https://tailscale.com/install.sh | sh
sudo tailscale up
```

Autenticar pelo link exibido.

### 4.2 Nos dispositivos (Mac, Windows, Android, iOS)

Instalar app Tailscale e entrar na mesma conta.

### 4.3 Acessar CasaOS

- Painel: `http://100.x.x.x` (IP Tailscale do servidor) ou hostname MagicDNS
- SMB: `smb://100.x.x.x/compartilhado` com credenciais Samba

Funciona na LAN e fora de casa — ver [06-acesso-pela-internet.md](06-acesso-pela-internet.md).

---

## 5. DDNS no servidor (complementar)

Útil para acesso **pela internet** com domínio público, menos para SMB na LAN.

- Registrar em https://www.duckdns.org/
- Script de atualização no cron do Ubuntu
- Acesso: `http://meuserver.duckdns.org`

Combinar com Nginx Proxy Manager e HTTPS para apps web — não para SMB direto na WAN.

---

## 6. Reserva DHCP (quando houver acesso ao roteador)

Se no futuro houver acesso ao painel do roteador:

1. Anotar MAC do servidor: `ip link show`
2. Criar **DHCP reservation** / IP reservado para esse MAC
3. Manter o mesmo IP sempre

---

## 7. Atualizar dispositivos após mudança

| Dispositivo | O que atualizar |
|-------------|-----------------|
| Mac | Finder → novo `smb://homeserver.local/...` |
| Windows | Remapear `\\homeserver.local\compartilhado` |
| Android | Solid Explorer → editar host |
| iOS | Arquivos → desconectar → conectar com novo endereço |

---

## Problemas comuns

| Problema | Solução |
|----------|---------|
| `.local` não resolve no Windows | Instalar Bonjour Print Services ou usar IP estático |
| Conflito de IP | Escolher outro IP no Netplan |
| CasaOS em porta não padrão | Incluir porta na URL: `http://homeserver.local:8080` |
| Android não resolve mDNS | Usar app que suporte mDNS ou IP estático |

---

## Próximos passos

1. [06-acesso-pela-internet.md](06-acesso-pela-internet.md) — acesso fora da rede de casa
2. [03-pastas-rede-e-mobile.md](03-pastas-rede-e-mobile.md) — reconectar apps móveis com novo hostname

[← Voltar ao hub CasaOS](../CASAOS.md)
