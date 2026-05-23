# Instalação do CasaOS no Ubuntu Server

Este guia descreve como instalar o CasaOS em um servidor que já executa **Ubuntu Server 24.04 LTS**, verificar o serviço e concluir o assistente inicial do painel web.

**Índice:** [CASAOS.md](../CASAOS.md) | Próximo: [02-usuarios-e-permissoes.md](02-usuarios-e-permissoes.md)

---

## Objetivo

Instalar o CasaOS via script oficial, acessar o painel na rede local e criar a conta administrativa do sistema.

---

## Pré-requisitos

| Item | Descrição |
|------|-----------|
| Ubuntu Server 24.04 | Instalado e atualizado — ver trilha [UBUNTO_SERVER.md](../UBUNTO_SERVER.md) e guias em [`ubuntu/`](../ubuntu/) se necessário |
| Rede LAN | Servidor com IP na rede local (ex.: `192.168.1.100`) |
| Usuário `sudo` | Conta criada na instalação do Ubuntu |
| Pendrive | Não necessário nesta etapa (Ubuntu já instalado) |

---

## 1. Preparar o sistema

Conectar via SSH ou console local e executar:

```bash
sudo apt update
sudo apt upgrade -y
```

Verificar conectividade e IP:

```bash
hostname -I
```

Anotar o endereço IPv4 exibido — será usado para acessar o painel (ex.: `192.168.1.100`).

---

## 2. Instalar o CasaOS

Executar o instalador oficial:

```bash
curl -fsSL https://get.casaos.io | sudo bash
```

O script em geral:

- Instala dependências (incluindo Docker, se necessário)
- Configura o serviço `casaos`
- Define pastas de dados do sistema

Aguardar até a mensagem de conclusão no terminal.

---

## 3. Verificar o serviço

```bash
sudo systemctl status casaos
```

Se o serviço não estiver ativo:

```bash
sudo systemctl enable casaos
sudo systemctl start casaos
```

Listar porta em uso (referência):

```bash
sudo ss -tlnp | grep -i casa
```

---

## 4. Firewall (UFW)

Se o firewall estiver ativo, liberar a porta do painel. Por padrão, muitas instalações usam a porta **80**:

```bash
sudo ufw allow 80/tcp
sudo ufw status
```

> A porta pode ser alterada depois em **Settings** no painel CasaOS. Após mudança, liberar a nova porta no UFW.

---

## 5. Primeiro acesso ao painel

Em um navegador na **mesma rede local** (Wi-Fi ou cabo):

| Tentativa | URL |
|-----------|-----|
| Por IP | `http://192.168.1.100` (substituir pelo IP real) |
| Por nome mDNS | `http://casaos.local` ou `http://homeserver.local` (se configurado — ver [05-acesso-sem-ip-fixo.md](05-acesso-sem-ip-fixo.md)) |

Conforme a [FAQ oficial do CasaOS](https://casaos.zimaspace.com/), se `casaos.local` não funcionar, utilizar o **IP do servidor** ou consultar a lista de dispositivos no roteador.

---

## 6. Assistente inicial

Na primeira visita ao painel:

1. Definir idioma (se solicitado)
2. Criar conta **administradora do CasaOS** (usuário e senha do painel — distinto dos usuários Linux)
3. Concluir o assistente de boas-vindas
4. Explorar **FILES**, **App Store** e **Settings**

> A conta do painel CasaOS controla apps e configurações web. Usuários para pastas na rede (Samba/SFTP) são criados no Linux — [02-usuarios-e-permissoes.md](02-usuarios-e-permissoes.md).

---

## 7. Confirmar instalação

No painel:

- **FILES** deve listar volumes e pastas do sistema
- **App Store** deve exibir aplicativos disponíveis
- **Settings** deve permitir alterar porta WebUI e outras opções

No terminal:

```bash
docker ps
```

Deve listar contêineres gerenciados pelo CasaOS (pode variar conforme apps instalados).

---

## 8. Criar pasta base para dados (recomendado)

```bash
sudo mkdir -p /srv/casaos/{compartilhado,fotos,privado}
sudo chown -R $USER:$USER /srv/casaos
```

Organização completa em [03-pastas-rede-e-mobile.md](03-pastas-rede-e-mobile.md).

---

## Problemas comuns

| Problema | Causa provável | Solução |
|----------|----------------|---------|
| `casaos.local` não abre | mDNS indisponível | Usar `http://IP` |
| Página não carrega | Serviço parado | `sudo systemctl start casaos` |
| Timeout | Firewall ou rede | `sudo ufw allow 80/tcp`; verificar cabo/Wi-Fi |
| Erro no script curl | Sem internet no servidor | Verificar DNS e gateway |
| Porta alterada e não acessa | UFW desatualizado | Liberar nova porta em Settings |

**Reinstalação:** consultar documentação no site oficial ou comunidade Discord do projeto antes de remover dados em `/var/lib/casaos`.

---

## Próximos passos

1. [02-usuarios-e-permissoes.md](02-usuarios-e-permissoes.md) — usuários do painel e do Linux
2. [03-pastas-rede-e-mobile.md](03-pastas-rede-e-mobile.md) — compartilhar pastas e acessar no celular

[← Voltar ao hub CasaOS](../CASAOS.md)
