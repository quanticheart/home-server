import {
  Button,
  Callout,
  Card,
  CardBody,
  CardHeader,
  CollapsibleSection,
  computeDAGLayout,
  Divider,
  Grid,
  H1,
  H2,
  H3,
  Link,
  Pill,
  Row,
  Stack,
  Stat,
  Table,
  Text,
  useCanvasState,
  useHostTheme,
} from "cursor/canvas";
import type { CSSProperties } from "react";

type TrackId = "ubuntu" | "casaos";

type Guide = {
  n: number;
  title: string;
  file: string;
  summary: string;
  href: string;
};

const GITHUB =
  "https://github.com/quanticheart/home-server/blob/main/documents";

const UBUNTU_GUIDES: Guide[] = [
  {
    n: 1,
    title: "Instalação",
    file: "ubuntu/01-instalacao.md",
    summary: "ISO, pendrive, particionamento",
    href: `${GITHUB}/ubuntu/01-instalacao.md`,
  },
  {
    n: 2,
    title: "Acesso remoto",
    file: "ubuntu/02-acesso-remoto.md",
    summary: "SSH no Mac e Windows",
    href: `${GITHUB}/ubuntu/02-acesso-remoto.md`,
  },
  {
    n: 3,
    title: "Armazenamento",
    file: "ubuntu/03-armazenamento-disco.md",
    summary: "LVM e redimensionar disco",
    href: `${GITHUB}/ubuntu/03-armazenamento-disco.md`,
  },
  {
    n: 4,
    title: "Pastas e serviços",
    file: "ubuntu/04-pastas-e-servicos.md",
    summary: "/srv, SMB, cenários de uso",
    href: `${GITHUB}/ubuntu/04-pastas-e-servicos.md`,
  },
  {
    n: 5,
    title: "Usuários",
    file: "ubuntu/05-usuarios-e-permissoes.md",
    summary: "Contas e pastas restritas",
    href: `${GITHUB}/ubuntu/05-usuarios-e-permissoes.md`,
  },
  {
    n: 6,
    title: "Internet",
    file: "ubuntu/06-servidor-na-internet.md",
    summary: "VPN, DDNS, port forward",
    href: `${GITHUB}/ubuntu/06-servidor-na-internet.md`,
  },
];

const CASAOS_GUIDES: Guide[] = [
  {
    n: 1,
    title: "Instalação",
    file: "casaos/01-instalacao.md",
    summary: "Script oficial e primeiro painel",
    href: `${GITHUB}/casaos/01-instalacao.md`,
  },
  {
    n: 2,
    title: "Usuários",
    file: "casaos/02-usuarios-e-permissoes.md",
    summary: "Painel vs Linux, smbpasswd",
    href: `${GITHUB}/casaos/02-usuarios-e-permissoes.md`,
  },
  {
    n: 3,
    title: "Pastas e rede",
    file: "casaos/03-pastas-rede-e-mobile.md",
    summary: "FILES, Samba, Mac, mobile",
    href: `${GITHUB}/casaos/03-pastas-rede-e-mobile.md`,
  },
  {
    n: 4,
    title: "Apps",
    file: "casaos/04-apps-recomendados.md",
    summary: "App Store e volumes Docker",
    href: `${GITHUB}/casaos/04-apps-recomendados.md`,
  },
  {
    n: 5,
    title: "Sem IP fixo",
    file: "casaos/05-acesso-sem-ip-fixo.md",
    summary: "mDNS, IP estático, Tailscale",
    href: `${GITHUB}/casaos/05-acesso-sem-ip-fixo.md`,
  },
  {
    n: 6,
    title: "Pela internet",
    file: "casaos/06-acesso-pela-internet.md",
    summary: "VPN, HTTPS, apps remotos",
    href: `${GITHUB}/casaos/06-acesso-pela-internet.md`,
  },
];

const PATHS: Record<
  TrackId,
  { nodes: { id: string }[]; edges: { from: string; to: string }[]; labels: Record<string, string> }
> = {
  ubuntu: {
    nodes: [
      { id: "u1" },
      { id: "u2" },
      { id: "u3" },
      { id: "u4" },
      { id: "u5" },
      { id: "u6" },
    ],
    edges: [
      { from: "u1", to: "u2" },
      { from: "u2", to: "u3" },
      { from: "u3", to: "u4" },
      { from: "u4", to: "u5" },
      { from: "u5", to: "u6" },
    ],
    labels: {
      u1: "Ubuntu",
      u2: "SSH",
      u3: "Discos",
      u4: "/srv",
      u5: "Usuários",
      u6: "Remoto",
    },
  },
  casaos: {
    nodes: [
      { id: "c0" },
      { id: "c1" },
      { id: "c2" },
      { id: "c3" },
      { id: "c4" },
      { id: "c5" },
      { id: "c6" },
    ],
    edges: [
      { from: "c0", to: "c1" },
      { from: "c1", to: "c2" },
      { from: "c2", to: "c3" },
      { from: "c3", to: "c4" },
      { from: "c4", to: "c5" },
      { from: "c5", to: "c6" },
    ],
    labels: {
      c0: "Ubuntu",
      c1: "CasaOS",
      c2: "Usuários",
      c3: "FILES",
      c4: "Apps",
      c5: "mDNS",
      c6: "Internet",
    },
  },
};

const NODE_TO_STEP: Record<TrackId, Record<string, number>> = {
  ubuntu: { u1: 1, u2: 2, u3: 3, u4: 4, u5: 5, u6: 6 },
  casaos: { c0: 0, c1: 1, c2: 2, c3: 3, c4: 4, c5: 5, c6: 6 },
};

function LearningPath({
  track,
  activeStep,
}: {
  track: TrackId;
  activeStep: number;
}) {
  const theme = useHostTheme();
  const spec = PATHS[track];
  const layout = computeDAGLayout({
    nodes: spec.nodes,
    edges: spec.edges,
    direction: "horizontal",
    nodeWidth: 108,
    nodeHeight: 32,
    nodeGap: 28,
    rankGap: 40,
    padding: 16,
  });

  const stepMap = NODE_TO_STEP[track];

  return (
    <div style={{ overflowX: "auto", width: "100%" }}>
      <svg
        width={layout.width}
        height={layout.height}
        role="img"
        aria-label={`Trilha ${track}`}
        style={{ display: "block", minWidth: layout.width }}
      >
        {layout.edges.map((edge) => (
          <line
            key={`${edge.from}-${edge.to}`}
            x1={edge.sourceX}
            y1={edge.sourceY}
            x2={edge.targetX}
            y2={edge.targetY}
            stroke={theme.stroke.secondary}
            strokeWidth={1.5}
            strokeDasharray={edge.isBackEdge ? "4 3" : undefined}
          />
        ))}
        {layout.nodes.map((node) => {
          const step = stepMap[node.id] ?? 0;
          const isActive = step === activeStep;
          const isDone = step > 0 && step < activeStep;
          const fill = isActive
            ? theme.accent.control
            : isDone
              ? theme.fill.secondary
              : theme.fill.tertiary;
          const stroke = isActive
            ? theme.accent.primary
            : theme.stroke.tertiary;
          const textColor = isActive
            ? theme.text.onAccent
            : theme.text.primary;

          return (
            <g key={node.id}>
              <rect
                x={node.x}
                y={node.y}
                width={108}
                height={32}
                rx={6}
                fill={fill}
                stroke={stroke}
                strokeWidth={isActive ? 1.5 : 1}
              />
              <text
                x={node.x + 54}
                y={node.y + 20}
                textAnchor="middle"
                fill={textColor}
                fontSize={11}
                fontFamily="system-ui, sans-serif"
                fontWeight={isActive ? 600 : 400}
              >
                {spec.labels[node.id]}
              </text>
            </g>
          );
        })}
      </svg>
      <Text size="small" tone="tertiary">
        Fluxo recomendado · trilha {track === "ubuntu" ? "Ubuntu" : "CasaOS"} · passo
        destacado: {activeStep === 0 ? "pré-requisito" : activeStep}
      </Text>
    </div>
  );
}

function GuideList({
  guides,
  activeStep,
  onSelect,
}: {
  guides: Guide[];
  activeStep: number;
  onSelect: (n: number) => void;
}) {
  return (
    <Stack gap={6}>
      {guides.map((g) => {
        const selected = g.n === activeStep;
        return (
          <Row key={g.n} gap={10} style={{ alignItems: "flex-start" }}>
            <Button
              variant={selected ? "primary" : "secondary"}
              onClick={() => onSelect(g.n)}
              style={{ minWidth: 32, padding: "4px 8px" }}
            >
              {String(g.n)}
            </Button>
            <Stack gap={2} style={{ flex: 1, minWidth: 0 }}>
              <Row gap={8} style={{ alignItems: "center", flexWrap: "wrap" }}>
                <Text weight={selected ? "semibold" : "regular"}>{g.title}</Text>
                <Text size="small" tone="tertiary">
                  {g.summary}
                </Text>
              </Row>
              <Link href={g.href}>{g.file}</Link>
            </Stack>
          </Row>
        );
      })}
    </Stack>
  );
}

export default function HomeServerHub() {
  const theme = useHostTheme();
  const [track, setTrack] = useCanvasState<TrackId>("track", "casaos");
  const [step, setStep] = useCanvasState<number>("step", 1);

  const guides = track === "ubuntu" ? UBUNTU_GUIDES : CASAOS_GUIDES;
  const hubHref =
    track === "ubuntu"
      ? `${GITHUB}/UBUNTO_SERVER.md`
      : `${GITHUB}/CASAOS.md`;
  const hubLabel = track === "ubuntu" ? "UBUNTO_SERVER.md" : "CASAOS.md";

  const accentBar: CSSProperties = {
    width: 3,
    alignSelf: "stretch",
    borderRadius: 2,
    background: theme.accent.primary,
    flexShrink: 0,
  };

  return (
    <Stack gap={24}>
      <Stack gap={8}>
        <Row gap={10} style={{ alignItems: "center", flexWrap: "wrap" }}>
          <H1>Home Server</H1>
          <Pill tone="neutral">Documentação</Pill>
          <Pill tone="info">Ubuntu 24.04 LTS</Pill>
        </Row>
        <Text tone="secondary">
          Hub de navegação do repositório — servidor caseiro, NAS na LAN e trilha
          CasaOS sobre Ubuntu Server.
        </Text>
        <Row gap={8} style={{ flexWrap: "wrap" }}>
          <Link href="https://github.com/quanticheart/home-server">Repositório GitHub</Link>
          <Text tone="tertiary">·</Text>
          <Link href="https://casaos.zimaspace.com/">CasaOS oficial</Link>
          <Text tone="tertiary">·</Text>
          <Link href="https://documentation.ubuntu.com/server/">Ubuntu Server docs</Link>
        </Row>
      </Stack>

      <Grid columns={4} gap={12}>
        <Stat value="2" label="Trilhas" />
        <Stat value="12" label="Guias numerados" />
        <Stat value="3" label="Protocolos LAN" tone="success" />
        <Stat value="24.04" label="Ubuntu de referência" />
      </Grid>

      <Callout tone="info" title="Por onde começar">
        <Stack gap={6}>
          <Text>
            Ainda não tem Ubuntu no hardware? Trilha{" "}
            <Text weight="semibold">Ubuntu</Text>, guia 1.
          </Text>
          <Text>
            Ubuntu pronto e quer painel + FILES + Samba? Trilha{" "}
            <Text weight="semibold">CasaOS</Text> — guia 1 após o Ubuntu instalado.
          </Text>
        </Stack>
      </Callout>

      <Row gap={8} style={{ flexWrap: "wrap" }}>
        <Button
          variant={track === "ubuntu" ? "primary" : "secondary"}
          onClick={() => {
            setTrack("ubuntu");
            setStep(1);
          }}
        >
          Trilha Ubuntu
        </Button>
        <Button
          variant={track === "casaos" ? "primary" : "secondary"}
          onClick={() => {
            setTrack("casaos");
            setStep(1);
          }}
        >
          Trilha CasaOS
        </Button>
      </Row>

      <Row gap={20} style={{ alignItems: "flex-start", flexWrap: "wrap" }}>
        <Stack gap={16} style={{ flex: "1 1 320px", minWidth: 280 }}>
          <Row gap={10}>
            <div style={accentBar} />
            <Stack gap={4}>
              <H2>{track === "ubuntu" ? "Ubuntu Server" : "CasaOS"}</H2>
              <Text size="small" tone="secondary">
                Clique no número do guia para destacar o passo no fluxo.
              </Text>
              <Link href={hubHref}>{hubLabel}</Link>
            </Stack>
          </Row>

          <LearningPath track={track} activeStep={step} />

          <GuideList
            guides={guides}
            activeStep={step}
            onSelect={setStep}
          />
        </Stack>

        <Stack gap={16} style={{ flex: "1 1 260px", minWidth: 240 }}>
          <H3>Arquitetura na LAN</H3>
          <Card variant="borderless">
            <CardBody>
              <Stack gap={12}>
                <Row gap={8} style={{ alignItems: "center" }}>
                  <Text weight="semibold">Clientes</Text>
                  <Text size="small" tone="tertiary">
                    PC · Mac · celular
                  </Text>
                </Row>
                <Text size="small" tone="tertiary">
                  SMB · SFTP · HTTPS
                </Text>
                <Divider />
                <Text weight="semibold">Roteador</Text>
                <Divider />
                <Text weight="semibold">Ubuntu Server</Text>
                <Text size="small" tone="secondary">
                  SSH · /srv · opcional CasaOS
                </Text>
                <Divider />
                <Text weight="semibold">Discos</Text>
                <Text size="small" tone="tertiary">
                  /DATA (FILES) · /srv/casaos (Docker)
                </Text>
              </Stack>
            </CardBody>
          </Card>

          <H3>Protocolos</H3>
          <Table
            headers={["Protocolo", "Uso"]}
            rows={[
              ["SMB/CIFS", "Pastas de rede Win/Mac"],
              ["SFTP", "SSH seguro, scripts"],
              ["HTTPS", "CasaOS, Nextcloud"],
            ]}
          />
        </Stack>
      </Row>

      <Divider />

      <CollapsibleSection title="O que é NAS neste projeto?" count={2}>
        <Text tone="secondary">
          NAS é armazenamento na rede — backup, fotos e mídia na LAN. Este repositório
          documenta um servidor Ubuntu completo; o papel NAS aparece em pastas
          compartilhadas e no CasaOS FILES, não só em appliance dedicado.
        </Text>
        <CollapsibleSection title="CasaOS vs terminal" count={2}>
          <Text>
            FILES cria pastas em /DATA e compartilha Samba pela UI. Senha e
            valid users exigem smbpasswd e edição de smb.casa.conf — ver guia 03.
          </Text>
        </CollapsibleSection>
      </CollapsibleSection>

      <Card>
        <CardHeader trailing={<Pill tone="neutral">Metodologia</Pill>}>
          Como os guias são escritos
        </CardHeader>
        <CardBody>
          <Table
            headers={["Etapa", "Conteúdo"]}
            rows={[
              ["1", "Problema ou objetivo"],
              ["2", "Por que este fluxo"],
              ["3", "Comandos ou passos na UI"],
              ["4", "Resultado esperado"],
            ]}
          />
        </CardBody>
      </Card>

      <Text size="small" tone="tertiary">
        Dashboard home-server-hub · repositório quanticheart/home-server
      </Text>
    </Stack>
  );
}
