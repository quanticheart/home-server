# Apps recomendados no CasaOS

Este guia lista aplicativos úteis na App Store do CasaOS, como instalá-los e como apontar volumes de dados para `/srv/casaos/`.

**Índice:** [CASAOS.md](../CASAOS.md) | Anterior: [03-pastas-rede-e-mobile.md](03-pastas-rede-e-mobile.md) | Próximo: [05-acesso-sem-ip-fixo.md](05-acesso-sem-ip-fixo.md)

---

## Objetivo

Escolher e instalar apps Docker pelo painel CasaOS para arquivos, mídia, sincronização e segurança — com foco em uso doméstico.

---

## Pré-requisitos

- CasaOS instalado e painel acessível ([01-instalacao.md](01-instalacao.md))
- Espaço em disco adequado
- Pastas em `/srv/casaos/` criadas ([03-pastas-rede-e-mobile.md](03-pastas-rede-e-mobile.md))

---

## 1. Formas de instalar apps

| Método | Quando usar |
|--------|-------------|
| **App Store** | Apps verificados pela comunidade; instalação em um clique |
| **Custom Install** | App no Docker Hub sem entrada na loja; importar comando `docker run` |
| **Import Appfile** | Compartilhar configuração exportada com outra instalação |

### Custom Install (resumo)

1. Buscar imagem em https://hub.docker.com/
2. Copiar comando `docker run` da documentação do app
3. No CasaOS: **App Store** → **Custom Install** → **Import**
4. Colar o comando; ajustar portas e volumes
5. Mapear volume para `/srv/casaos/nome-do-app`
6. Instalar

Conforme a [FAQ do CasaOS](https://casaos.zimaspace.com/), apps com interface web e imagem Docker podem ser instalados dessa forma.

---

## 2. Apps recomendados por categoria

| Categoria | App | Finalidade |
|-----------|-----|------------|
| **Arquivos / nuvem** | **Nextcloud** | Sincronização, apps mobile, compartilhamento — excelente fora de casa |
| **Arquivos** | **Filebrowser** | Navegador de arquivos leve via web |
| **Mídia** | **Jellyfin** | Biblioteca de filmes e séries (open-source) |
| **Mídia** | **Plex** | Alternativa com ecossistema maduro (alguns recursos pagos) |
| **Fotos** | **PhotoPrism** | Galeria com reconhecimento automático |
| **Sync** | **Syncthing** | Sincronização P2P entre PCs e celulares |
| **Proxy / HTTPS** | **Nginx Proxy Manager** | Certificados SSL e domínios para apps web |
| **Senhas** | **Vaultwarden** | Bitwarden auto-hospedado |
| **Downloads** | **qBittorrent** | Torrents centralizados no servidor |
| **DNS / privacidade** | **AdGuard Home** ou **Pi-hole** | Bloqueio de anúncios na rede LAN |
| **Backup** | **Duplicati** | Backups agendados para nuvem ou disco externo |

> A disponibilidade exata na App Store pode variar conforme a versão do CasaOS. Buscar pelo nome na loja.

---

## 3. Por que instalar cada um (uso doméstico)

### Nextcloud

- Apps oficiais para **Android** e **iOS**
- Acesso fora de casa com HTTPS (com [06-acesso-pela-internet.md](06-acesso-pela-internet.md))
- Substitui ou complementa SMB para celulares

### Jellyfin / Plex

- Streaming na TV, celular e navegador
- Biblioteca em `/srv/casaos/media/`

### Syncthing

- Pastas sincronizadas automaticamente sem “montar rede”
- Útil para documentos entre notebook e servidor

### Nginx Proxy Manager

- Um domínio por app (`nextcloud.meuserver.duckdns.org`)
- Certificado Let's Encrypt automático

### Vaultwarden

- Senhas centralizadas na rede caseira

### AdGuard Home / Pi-hole

- Bloqueio de anúncios em todos os dispositivos da LAN

---

## 4. Configurar volumes em `/srv/casaos/`

Antes de instalar, criar pasta dedicada:

```bash
sudo mkdir -p /srv/casaos/{nextcloud,jellyfin,syncthing,media}
sudo chown -R $USER:$USER /srv/casaos/nextcloud /srv/casaos/media
```

Na tela de instalação do app no CasaOS:

| Campo | Exemplo |
|-------|---------|
| Volume / Path | `/srv/casaos/nextcloud` |
| Porta host | Conforme app (ex.: 8080) |

Evitar gravar dados grandes apenas em volumes Docker internos sem mapeamento — facilita backup e acesso via FILES.

---

## 5. Exemplo: instalar Nextcloud pela App Store

1. Abrir painel CasaOS → **App Store**
2. Buscar **Nextcloud**
3. Clicar em **Install**
4. Definir volume: `/srv/casaos/nextcloud`
5. Definir porta HTTP (ex.: `8080`)
6. Aguardar contêiner ficar **Running**
7. Acessar `http://192.168.1.100:8080` e concluir assistente Nextcloud
8. Instalar app Nextcloud no celular e apontar para essa URL

---

## 6. Atualização de apps

O CasaOS em geral instala versões estáveis; **não há auto-update global** por padrão. Para atualizar:

- Usar botão de update no card do app, se disponível
- Ou instalar **Watchtower** (app Docker) para atualizações automáticas de contêineres — avaliar risco em ambiente de produção

---

## Problemas comuns

| Problema | Solução |
|----------|---------|
| App não inicia | Verificar logs no painel; conflito de porta |
| Sem espaço em disco | `df -h`; expandir disco ou mover volume |
| App inacessível na LAN | UFW: `sudo ufw allow PORTA/tcp` |
| Permissão negada no volume | `chown` na pasta em `/srv/casaos/` |

---

## Próximos passos

1. [05-acesso-sem-ip-fixo.md](05-acesso-sem-ip-fixo.md) — hostname estável sem depender do IP
2. [06-acesso-pela-internet.md](06-acesso-pela-internet.md) — expor apps com segurança

[← Voltar ao hub CasaOS](../CASAOS.md)
