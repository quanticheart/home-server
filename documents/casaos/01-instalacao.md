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

**Por que atualizar antes:** o instalador do CasaOS baixa pacotes e imagens Docker. Um sistema desatualizado pode falhar por dependências antigas ou conflitos de kernel.

Conectar via SSH ou console local. Os comandos abaixo atualizam a lista de pacotes e instalam correções de segurança pendentes.

```bash
sudo apt update
sudo apt upgrade -y
```

Para acessar o painel pelo navegador, é necessário saber o **IP do servidor na rede local**:

```bash
hostname -I
```

**Resultado esperado:** primeira linha com algo como `192.168.1.100`. Anotar esse valor — será usado em `http://192.168.1.100` até configurar hostname fixo ([05-acesso-sem-ip-fixo.md](05-acesso-sem-ip-fixo.md)).

---

## 2. Instalar o CasaOS

**O que este passo faz:** baixa e executa o script oficial da IceWhale. Ele prepara Docker (se ainda não existir), instala o serviço do painel e cria a estrutura de dados do CasaOS.

```bash
curl -fsSL https://get.casaos.io | sudo bash
```

Durante a execução, o script em geral:

- Instala dependências (incluindo Docker, se necessário)
- Registra o serviço `casaos` no systemd
- Define pastas de dados do sistema

Aguardar até a mensagem de conclusão no terminal — interromper no meio pode deixar instalação incompleta.

---

## 3. Verificar o serviço

**Por que verificar:** se o serviço `casaos` não estiver ativo, o navegador não abre o painel mesmo com IP correto.

```bash
sudo systemctl status casaos
```

**O que procurar:** linha `Active: active (running)` em verde. Se estiver `inactive` ou `failed`, usar os comandos abaixo em vez de insistir no navegador.

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

**Problema que resolve:** no Ubuntu, o UFW pode bloquear conexões de outros PCs na LAN. O painel CasaOS responde em HTTP (em geral porta **80**); sem liberar essa porta, o navegador dá timeout.

Se o firewall estiver ativo (`sudo ufw status` mostra `active`), execute:

```bash
sudo ufw allow 80/tcp
sudo ufw status
```

**Resultado esperado:** regra `80/tcp ALLOW` listada. Se o painel usar outra porta (Settings do CasaOS), liberar essa porta em vez de 80.

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
