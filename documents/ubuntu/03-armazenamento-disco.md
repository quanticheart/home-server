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

Executar os comandos abaixo e registrar a saída antes de qualquer alteração.

### 2.1 Visão geral dos dispositivos

```bash
lsblk
```

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

```bash
sudo pvs
sudo vgs
sudo lvs
```

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

Aplicar quando `vgs` mostra espaço livre no `ubuntu-vg` e o sistema de arquivos em `/` é **ext4** (padrão na instalação Ubuntu).

### 3.1 Estender o volume lógico

```bash
sudo lvextend -l +100%FREE /dev/ubuntu-vg/ubuntu-lv
```

> O caminho exato pode variar. Confirmar com `sudo lvs` — em alguns sistemas aparece como `/dev/mapper/ubuntu--vg-ubuntu--lv`.

Alternativa usando o caminho do mapper:

```bash
sudo lvextend -l +100%FREE /dev/mapper/ubuntu--vg-ubuntu--lv
```

### 3.2 Redimensionar o sistema de arquivos

Para ext4:

```bash
sudo resize2fs /dev/ubuntu-vg/ubuntu-lv
```

### 3.3 Confirmar

```bash
df -h /
sudo lvs
```

O tamanho de `/` deve refletir a capacidade expandida (próximo de 500 GB menos partições de boot/EFI).

---

## 4. Criar um segundo volume para dados (`/srv`)

Quando se deseja **separar** sistema operacional e dados em vez de expandir apenas `/`:

### 4.1 Criar volume lógico

```bash
# Ver espaço livre
sudo vgs

# Criar LV de 400G (ajustar tamanho conforme necessidade)
sudo lvcreate -L 400G -n data-lv ubuntu-vg
```

### 4.2 Formatar e montar

```bash
sudo mkfs.ext4 /dev/ubuntu-vg/data-lv
sudo mkdir -p /srv
sudo mount /dev/ubuntu-vg/data-lv /srv
```

### 4.3 Montagem automática no boot

Obter UUID:

```bash
sudo blkid /dev/ubuntu-vg/data-lv
```

Adicionar linha em `/etc/fstab` (exemplo):

```
UUID=xxxx-xxxx  /srv  ext4  defaults  0  2
```

Testar antes de reiniciar:

```bash
sudo umount /srv
sudo mount -a
df -h /srv
```

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
