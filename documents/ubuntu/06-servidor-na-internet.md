# Servidor acessível pela internet

Este guia descreve como permitir acesso ao servidor Ubuntu a partir de fora da rede local. São apresentadas duas abordagens: **VPN** (recomendada como padrão mais seguro) e **port forwarding com DDNS** (acesso direto por domínio/IP público).

**Pré-requisitos:**

- Servidor funcionando na LAN com IP estável ou reservado no roteador
- Acesso administrativo ao roteador (para port forwarding)
- Compreensão dos riscos de expor serviços na internet

**Índice:** [UBUNTO_SERVER.md](../UBUNTO_SERVER.md) | Anterior: [05-usuarios-e-permissoes.md](05-usuarios-e-permissoes.md)

---

## 1. Preparação na rede local

### 1.1 IP reservado (DHCP reservation)

No painel do roteador, associar o endereço MAC do servidor a um IP fixo na LAN (ex.: `192.168.1.100`). Evita que o IP mude após reinicializações.

### 1.2 Hostname local (opcional)

```bash
sudo hostnamectl set-hostname homeserver
```

Alguns roteadores permitem acesso por `http://homeserver.local` na LAN.

### 1.3 Atualizações e firewall base

```bash
sudo apt update && sudo apt upgrade -y
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow OpenSSH
sudo ufw enable
sudo ufw status
```

---

## 2. Opção A — VPN (recomendada)

A VPN cria um túnel criptografado entre dispositivos autorizados e o servidor, **sem expor SSH, Samba ou painéis diretamente** na internet pública.

### 2.1 Tailscale (mais simples)

**No servidor:**

```bash
curl -fsSL https://tailscale.com/install.sh | sh
sudo tailscale up
```

Seguir o link de autenticação exibido no terminal para associar a conta Tailscale.

**Em dispositivos remotos (Mac, Windows, celular):**

1. Instalar o cliente Tailscale
2. Entrar na mesma conta
3. Conectar via IP Tailscale (ex.: `100.x.x.x`) ou hostname MagicDNS

**SSH via Tailscale:**

```bash
ssh usuario@100.x.x.x
```

| Vantagem | Desvantagem |
|----------|-------------|
| Sem configurar port forwarding | Requer app/cliente em cada dispositivo |
| Criptografia automática | Dependência do serviço Tailscale |
| Funciona atrás de CGNAT | — |

### 2.2 WireGuard (mais controle)

**No servidor:**

```bash
sudo apt install -y wireguard
```

Gerar chaves e configurar `/etc/wireguard/wg0.conf` conforme [documentação oficial do Ubuntu](https://documentation.ubuntu.com/server/how-to/security/wireguard-vpn/).

**Conceito:**

- Servidor escuta em porta UDP (ex.: 51820)
- Cada cliente possui par de chaves e IP interno da VPN (ex.: `10.0.0.2`)
- Port forwarding no roteador apenas para UDP 51820, se acesso de fora for necessário

| Vantagem | Desvantagem |
|----------|-------------|
| Controle total, sem terceiros | Configuração manual mais trabalhosa |
| Alto desempenho | Exige gerenciar chaves por cliente |

---

## 3. Opção B — Port forwarding e DDNS

Expõe serviços selecionados na internet através do IP público do roteador. **Maior superfície de ataque** — aplicar apenas com hardening adequado.

### 3.1 IP público e CGNAT

Verificar se o IP visto em https://ifconfig.me coincide com o WAN do roteador. Se o provedor utilizar **CGNAT**, port forwarding externo pode não funcionar — nesse caso, VPN (Tailscale) é a alternativa viável.

### 3.2 DDNS (DNS dinâmico)

Quando o IP público muda periodicamente, um serviço DDNS associa um hostname ao IP atual.

| Serviço | URL |
|---------|-----|
| DuckDNS | https://www.duckdns.org/ |
| No-IP | https://www.noip.com/ |

Exemplo DuckDNS: criar subdomínio `meuserver.duckdns.org` e configurar atualização via script no servidor ou integração do roteador.

### 3.3 Port forwarding no roteador

No painel do roteador (NAT / Virtual Server / Port Forwarding):

| Serviço | Porta externa | IP interno | Porta interna | Nota |
|---------|---------------|------------|---------------|------|
| HTTPS (reverse proxy) | 443 | 192.168.1.100 | 443 | Expor site com TLS |
| SSH | **Evitar 22** | — | — | Preferir VPN; se necessário, porta alta (ex. 2222) |
| Minecraft | 25565 | 192.168.1.100 | 25565 | Apenas se necessário publicamente |
| Samba | **Não expor** | — | — | Risco crítico na WAN |

### 3.4 Firewall no servidor

Liberar apenas portas necessárias:

```bash
sudo ufw allow 443/tcp
# Exemplo SSH em porta alternativa — apenas se indispensável
# sudo ufw allow 2222/tcp
sudo ufw reload
```

### 3.5 Reverse proxy com HTTPS (sites e painéis)

Instalar Nginx e Certbot para TLS com Let's Encrypt:

```bash
sudo apt install -y nginx certbot python3-certbot-nginx
sudo certbot --nginx -d meuserver.duckdns.org
```

O Certbot configura redirecionamento HTTP → HTTPS automaticamente.

---

## 4. Comparação das abordagens

| Critério | VPN (Tailscale/WireGuard) | Port forwarding + DDNS |
|----------|---------------------------|-------------------------|
| Segurança | Alta — serviços não expostos diretamente | Média a baixa — depende de configuração |
| Facilidade | Alta (Tailscale) | Média |
| Acesso SSH seguro | Sim, via IP da VPN | Requer porta aberta ou jump host |
| CasaOS / site público | Possível via VPN; público requer proxy | Site público natural com domínio |
| Funciona com CGNAT | Sim (Tailscale) | Nem sempre |
| Manutenção | Baixa | Média (certificados, DDNS, regras) |

**Recomendação geral:** utilizar **VPN** para administração (SSH, SFTP, Samba) e **port forwarding + HTTPS** apenas para serviços que precisam ser públicos (site, servidor de jogo com jogadores externos).

---

## 5. Checklist de segurança mínima

Antes de expor qualquer serviço na internet:

- [ ] Autenticação SSH por **chave pública**; desabilitar senha se possível
- [ ] Desabilitar login SSH como root: `PermitRootLogin no` em `/etc/ssh/sshd_config`
- [ ] **UFW** ativo com regras mínimas
- [ ] `sudo apt update && sudo apt upgrade` regulares; considerar `unattended-upgrades`
- [ ] **Não expor** Samba (445), MariaDB (3306) ou painéis sem autenticação forte
- [ ] Instalar **fail2ban** para SSH exposto:

```bash
sudo apt install -y fail2ban
sudo systemctl enable --now fail2ban
```

- [ ] Usuários de serviço sem sudo ([05-usuarios-e-permissoes.md](05-usuarios-e-permissoes.md))
- [ ] Senhas fortes ou chaves em todos os serviços expostos
- [ ] Monitorar logs: `sudo journalctl -u ssh -f`

---

## 6. Cenários práticos

### 6.1 Administrar o servidor de qualquer lugar (VPN)

1. Instalar Tailscale no servidor e nos dispositivos pessoais
2. Conectar via `ssh usuario@<ip-tailscale>`
3. Usar SFTP/rsync normalmente — como se estivesse na LAN

### 6.2 Site PHP acessível publicamente

1. Configurar site em `/srv/web` ([04-pastas-e-servicos.md](04-pastas-e-servicos.md))
2. Nginx + Certbot com domínio DDNS
3. Port forward 443 → servidor
4. Manter sistema e PHP atualizados

### 6.3 Backup acessível apenas para usuários autorizados

1. **Não** expor Samba na WAN
2. Acesso externo via VPN + SFTP chroot (`backupuser`)
3. Ou Nextcloud atrás de HTTPS com 2FA

### 6.4 Servidor de jogo público

1. Port forward da porta do jogo (ex.: 25565)
2. `ufw allow` correspondente
3. Manter servidor de jogo atualizado; considerar whitelist se suportado

### 6.5 CasaOS e pastas compartilhadas

Detalhes específicos do painel CasaOS, apps mobile e pastas Samba remotas: trilha **[CASAOS.md](../CASAOS.md)** → [casaos/06-acesso-pela-internet.md](../casaos/06-acesso-pela-internet.md).

---

## 7. Problemas comuns

| Problema | Causa | Solução |
|----------|-------|---------|
| Port forward não funciona | CGNAT ou regra incorreta | Testar com VPN; revisar IP interno e porta |
| DDNS não atualiza | Script parado | Verificar cron ou integração do roteador |
| Certbot falha | Porta 80 bloqueada | `ufw allow 80`; conferir DNS apontando para IP público |
| SSH exposto sob ataque | Porta 22 aberta | Migrar para VPN; fail2ban; chaves SSH |
| CasaOS lento de fora | Link upload limitado | Normal em conexões residenciais |

---

## Referências

- [Ubuntu Server — Security](https://documentation.ubuntu.com/server/how-to/security/)
- [Tailscale documentation](https://tailscale.com/kb/)
- [Let's Encrypt](https://letsencrypt.org/)

[← Voltar ao índice](../UBUNTO_SERVER.md) | [README do repositório](../../README.md)
