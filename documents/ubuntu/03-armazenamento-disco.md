# Armazenamento e redimensionamento de disco

Este guia explica como diagnosticar o uso do disco após a instalação e como expandir o armazenamento quando apenas parte da capacidade foi alocada — cenário frequente em instalações com LVM em que um disco de 500 GB exibe apenas ~100 GB disponíveis em `/`.

**Pré-requisitos:**

- Acesso SSH ou console local ao servidor ([02-acesso-remoto.md](02-acesso-remoto.md))
- Privilégios `sudo`
- Backup recomendado antes de alterações em partições

**Índice:** [UBUNTO_SERVER.md](../UBUNTO_SERVER.md) | Anterior: [02-acesso-remoto.md](02-acesso-remoto.md) | Próximo: [04-pastas-e-servicos.md](04-pastas-e-servicos.md)

---

## 1. Entender a situação

Após instalar o Ubuntu Server 24.04 com LVM em um disco de **500 GB**, é comum que `df -h` mostre algo próximo de:

```
/dev/mapper/ubuntu--vg-ubuntu--lv   98G   ...   /
```

Isso **não significa** que os outros ~400 GB foram perdidos. Em muitos casos, o espaço está **livre no volume group** `ubuntu-vg`, aguardando alocação ao volume lógico `ubuntu-lv`.

---

## 2. Diagnóstico

Antes de alterar partições ou volumes, é preciso **entender o layout atual do disco**. O objetivo desta etapa é responder: o espaço “faltante” está livre no LVM, em outra partição ou realmente indisponível?

Executar os comandos abaixo e **anotar a saída** — em caso de erro depois, esses dados ajudam a reverter ou pedir suporte.

### 2.1 Visão geral dos dispositivos

O comando `lsblk` lista discos e partições em árvore, como o “gerenciador de disco” em modo texto. Serve para ver se existe espaço **sem particionar** após o volume do Ubuntu.

```bash
lsblk
```

**O que observar:** tamanho total do disco (`sda`), partições filhas e onde cada uma está montada (`/` = sistema).

Exemplo típico (valores ilustrativos):

```
NAME                      SIZE  MOUNTPOINT
sda                       500G
├─sda1                      1G  /boot/efi
├─sda2                      2G  /boot
└─sda3                    497G
  └─ubuntu--vg-ubuntu--lv 100G  /
```

### 2.2 Volume group e volumes lógicos

Se a instalação usou **LVM** (comum no Ubuntu Server), o disco físico alimenta um *volume group* (`ubuntu-vg`) e dentro dele existem *logical volumes* (como `ubuntu-lv`). O espaço pode estar **alocado no grupo mas ainda não no volume** que monta `/`.

Estes três comandos respondem: “Quanto espaço livre existe no grupo LVM para eu usar?”

```bash
sudo pvs
sudo vgs
sudo lvs
```

**Resultado esperado:** em `vgs`, a coluna **VFree** com valor alto (ex.: ~400G) indica que dá para expandir sem criar nova partição.

Interpretação:

| Comando | O que mostra |
|---------|--------------|
| `pvs` | Physical volumes (discos/partições LVM) |
| `vgs` | Volume groups e **espaço livre (VFree)** no grupo |
| `lvs` | Logical volumes e tamanho de cada um |

Se `vgs` exibir **VFree** próximo de 400G, o espaço pode ser adicionado ao volume lógico existente.

### 2.3 Espaço montado

```bash
df -h
```

Confirma quanto espaço o sistema de arquivos em `/` reconhece atualmente.

---

## 3. Expandir volume LVM (caso mais comum)

**Problema que resolve:** o sistema instalou-se em ~100 GB, mas o disco tem 500 GB e o restante aparece como espaço livre no `ubuntu-vg`.

**Ideia do fluxo:** (1) aumentar o volume lógico que contém `/`; (2) fazer o sistema de arquivos **ext4** ocupar esse novo tamanho. São duas camadas — LVM e filesystem — por isso são dois passos.

Aplicar quando `vgs` mostra espaço livre no `ubuntu-vg` e `df -T /` indica **ext4**.

### 3.1 Estender o volume lógico

O `lvextend` **reserva** todo o espaço livre do grupo para o volume `ubuntu-lv`. Ainda não altera o que o `df -h` mostra — apenas prepara o “container”.

```bash
sudo lvextend -l +100%FREE /dev/ubuntu-vg/ubuntu-lv
```

**Se der certo:** mensagem indicando novo tamanho do LV. **Se falhar:** conferir caminho com `sudo lvs` (nomes variam entre instalações).

> O caminho exato pode variar. Confirmar com `sudo lvs` — em alguns sistemas aparece como `/dev/mapper/ubuntu--vg-ubuntu--lv`.

Alternativa usando o caminho do mapper:

```bash
sudo lvextend -l +100%FREE /dev/mapper/ubuntu--vg-ubuntu--lv
```

### 3.2 Redimensionar o sistema de arquivos

Agora o **sistema de arquivos** dentro do volume precisa crescer. O `resize2fs` faz isso online (sem desmontar `/` em ext4), para que pastas e apps passem a enxergar o espaço novo.

```bash
sudo resize2fs /dev/ubuntu-vg/ubuntu-lv
```

**Resultado esperado:** progresso de redimensionamento e conclusão sem erro.

### 3.3 Confirmar

Estes comandos verificam se o espaço está visível para o dia a dia (instalar apps, copiar arquivos):

```bash
df -h /
sudo lvs
```

O tamanho de `/` deve refletir a capacidade expandida (próximo de 500 GB menos partições de boot/EFI). Se `df` ainda mostrar ~100 GB, repetir o diagnóstico da seção 2 — pode não ser caso LVM ou o caminho do LV está incorreto.

---

## 4. Criar um segundo volume para dados (`/srv`)

**Problema que resolve:** manter o sistema em uma partição/LV menor e dedicar outro volume só a dados (sites, backup, mídia). Facilita backup, migração e evita encher `/` com arquivos grandes.

**Quando escolher este fluxo em vez da seção 3:** preferência por separar SO e dados, ou já expandiu `/` e ainda há VFree para um segundo volume.

### 4.1 Criar volume lógico

Primeiro confirma-se quanto espaço ainda existe no grupo; em seguida cria-se um volume lógico **novo** (não confundir com expandir `ubuntu-lv`).

```bash
# Ver espaço livre no grupo LVM
sudo vgs

# Criar LV de 400G (ajustar tamanho conforme necessidade)
sudo lvcreate -L 400G -n data-lv ubuntu-vg
```

**Resultado esperado:** `data-lv` listado em `sudo lvs`, com tamanho definido.

### 4.2 Formatar e montar

Novo volume precisa de sistema de arquivos antes de guardar dados. `mkfs.ext4` formata; `mount` associa temporariamente a `/srv` (reinício desmonta até configurar fstab).

```bash
sudo mkfs.ext4 /dev/ubuntu-vg/data-lv
sudo mkdir -p /srv
sudo mount /dev/ubuntu-vg/data-lv /srv
```

**Resultado esperado:** `df -h /srv` mostra o tamanho do `data-lv`.

### 4.3 Montagem automática no boot

**Problema que resolve:** sem entrada no `fstab`, após reboot `/srv` fica vazio e serviços quebram.

O UUID identifica o volume de forma estável (não muda como `/dev/ubuntu-vg/data-lv` em alguns casos de renomeação).

```bash
sudo blkid /dev/ubuntu-vg/data-lv
```

Copiar o UUID exibido e adicionar linha em `/etc/fstab` (exemplo):

```
UUID=xxxx-xxxx  /srv  ext4  defaults  0  2
```

O comando `mount -a` testa o fstab **sem reiniciar** — se houver erro de sintaxe, corrigir antes do reboot.

```bash
sudo umount /srv
sudo mount -a
df -h /srv
```

**Resultado esperado:** `/srv` montado com o tamanho correto; nenhuma mensagem de erro em `mount -a`.

Estrutura de subpastas em [04-pastas-e-servicos.md](04-pastas-e-servicos.md).

---

## 5. Espaço não alocado fora do LVM

Se `lsblk` mostrar espaço **não particionado** após a partição LVM:

1. Criar nova partição com `fdisk` ou `parted`
2. Inicializar como PV: `sudo pvcreate /dev/sdaX`
3. Estender VG: `sudo vgextend ubuntu-vg /dev/sdaX`
4. Seguir seção 3 ou 4 conforme o objetivo

> Operações em partições são destrutivas se mal executadas. Manter backup e conferir o dispositivo (`/dev/sda`, etc.) antes de cada comando.

---

## 6. Quando não expandir `/`

| Situação | Abordagem |
|----------|-----------|
| Dual-boot com outro sistema operacional | Manter partições separadas; não consumir espaço do outro SO |
| Disco secundário dedicado a dados | Montar disco inteiro em `/srv` ou `/mnt/data` |
| RAID ou ZFS | Seguir documentação específica do stack de armazenamento |

---

## 7. Problemas comuns

| Problema | Causa | Ação |
|----------|-------|------|
| `lvextend`: volume group cheio | Sem VFree no `vgs` | Verificar espaço não particionado com `lsblk` |
| `resize2fs` falha | Sistema de arquivos não ext4 | Identificar com `df -T`; usar ferramenta adequada (ex.: `xfs_growfs` para XFS) |
| Espaço não aparece após reboot | Entrada incorreta no `fstab` | Corrigir `/etc/fstab`; boot com recovery se necessário |
| `Insufficient free space` | VFree menor que o esperado | Revisar `sudo vgs` e snapshots LVM (`sudo lvs -a`) |

---

## Próximos passos

1. [04-pastas-e-servicos.md](04-pastas-e-servicos.md) — criar `web`, `games`, `casaos` e `backup` em `/srv`
2. [01-instalacao.md](01-instalacao.md) — evitar o problema em novas instalações (layout customizado)

[← Voltar ao índice](../UBUNTO_SERVER.md)
