// src/pages/LandingPage.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Box,
  Container,
  Stack,
  Button,
  Card,
  CardHeader,
  CardContent,
  Chip,
  Divider,
  Tooltip,
  TextField,
  InputAdornment,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import { useNavigate } from "react-router-dom";
import useNotistack from "./orders/hooks/useNotistack";

// Icons (refined set)
import Inventory2RoundedIcon from "@mui/icons-material/Inventory2Rounded";
import ConstructionRoundedIcon from "@mui/icons-material/ConstructionRounded";
import CategoryRoundedIcon from "@mui/icons-material/CategoryRounded";
import StoreRoundedIcon from "@mui/icons-material/StoreRounded";
import FactoryRoundedIcon from "@mui/icons-material/FactoryRounded";
import Groups2RoundedIcon from "@mui/icons-material/Groups2Rounded";
import PlaceRoundedIcon from "@mui/icons-material/PlaceRounded";
import FolderOpenRoundedIcon from "@mui/icons-material/FolderOpenRounded";
import EngineeringRoundedIcon from "@mui/icons-material/EngineeringRounded";
import CalendarMonthRoundedIcon from "@mui/icons-material/CalendarMonthRounded";
import WorkspacePremiumRoundedIcon from "@mui/icons-material/WorkspacePremiumRounded";
import ListAltRoundedIcon from "@mui/icons-material/ListAltRounded";
import DirectionsCarFilledRoundedIcon from "@mui/icons-material/DirectionsCarFilledRounded";
import SpeedRoundedIcon from "@mui/icons-material/SpeedRounded";
import RequestQuoteRoundedIcon from "@mui/icons-material/RequestQuoteRounded";
import SendRoundedIcon from "@mui/icons-material/SendRounded";
import ChevronRightRoundedIcon from "@mui/icons-material/ChevronRightRounded";
import AddCircleOutlineRoundedIcon from "@mui/icons-material/AddCircleOutlineRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import AccountBalanceWalletRoundedIcon from '@mui/icons-material/AccountBalanceWalletRounded';

// ---------- Types
type ActionItem = {
  label: string;
  icon?: React.ReactNode;
  variant?: "contained" | "outlined" | "text";
  to?: string;
  soonLabel?: string;
  minWidth?: number;
  keywords?: string[];
  tooltip?: string;
};

type BadgeColor = "primary" | "secondary" | "success" | "warning" | "info" | "error";

type SectionConfig = {
  id: string;
  icon: React.ReactElement;          // raw icon (we’ll badge it)
  badgeColor?: BadgeColor;           // visual cue per category
  title: string;
  subheader: string;
  actions: ActionItem[];
  chips?: { label: string; tooltip: string; soonLabel: string }[];
};

// ---------- Small UI atoms
const Kbd: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Box
    component="kbd"
    sx={(t) => ({
      px: 0.75,
      py: 0.25,
      border: `1px solid ${t.palette.divider}`,
      borderBottomWidth: 2,
      borderRadius: 1,
      fontSize: 12,
      lineHeight: 1,
      fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
      color: t.palette.text.secondary,
      backgroundColor: alpha(t.palette.text.primary, 0.04),
    })}
  >
    {children}
  </Box>
);

// Consistent section “badge”
const IconBadge: React.FC<{
  children: React.ReactElement;
  color?: BadgeColor;
  size?: number;
}> = ({ children, color = "primary", size = 40 }) => (
  <Box
    aria-hidden
    sx={(t) => ({
      width: size,
      height: size,
      borderRadius: "50%",
      display: "grid",
      placeItems: "center",
      bgcolor: alpha((t.palette as any)[color].main, 0.12),
      color: (t.palette as any)[color].main,
      boxShadow: `inset 0 0 0 1px ${alpha((t.palette as any)[color].main, 0.18)}`,
    })}
  >
    {React.cloneElement(children as React.ReactElement<any>, { sx: { fontSize: 22 } })}
  </Box>
);

// Normalize icon size in buttons
const withIconSize = (node: React.ReactNode, px = 20) =>
  React.isValidElement(node) ? React.cloneElement(node as React.ReactElement<any>, { sx: { fontSize: px } }) : node;

// ---------- Component
export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const { infoNotistack } = useNotistack();
  const soon = (label: string) => infoNotistack(`${label} — în curând`);

  const go = (to?: string, soonLabel?: string) => () => {
    if (to) navigate(to);
    else if (soonLabel) soon(soonLabel);
  };

  // Quick actions (promoted)
  const quickActions: ActionItem[] = [
    {
      label: "Deschide Clienți",
      icon: <Groups2RoundedIcon />,
      variant: "contained",
      to: "/clients",
      minWidth: 200,
      keywords: ["clienti", "clients", "customer", "proiecte"],
      tooltip: "C",
    },
    {
      label: "Registru de casă",
      icon: <AccountBalanceWalletRoundedIcon />,
      variant: "contained",
      to: "/cash-ledger",
      minWidth: 200,
      keywords: ["cash", "casa", "registru", "bani"],
      tooltip: "R",
    },
    {
      label: "Echipă",
      icon: <EngineeringRoundedIcon />,
      variant: "outlined",
      to: "/echipa",
      minWidth: 160,
      keywords: ["echipa", "team", "angajati", "hr", "manopera"],
      tooltip: "E",
    },
    {
      label: "Flotă auto",
      icon: <DirectionsCarFilledRoundedIcon />,
      variant: "outlined",
      to: "/flota-auto",
      minWidth: 160,
      keywords: ["auto", "flota", "masini", "vehicule"],
      tooltip: "F",
    },
    {
      label: "Adăugare rapidă",
      icon: <AddCircleOutlineRoundedIcon />,
      variant: "text",
      soonLabel: "Adăugare rapidă proiect",
      minWidth: 180,
      keywords: ["adauga", "quick add", "proiect"],
      tooltip: "A",
    },
  ];

  // Sections (single source of truth)
  const sections: SectionConfig[] = [
    {
      id: "aprovizionare",
      icon: <StoreRoundedIcon />,
      badgeColor: "info",
      title: "Aprovizionare",
      subheader: "Gestionați furnizori și producători.",
      actions: [
        {
          label: "Furnizori",
          icon: <StoreRoundedIcon />,
          variant: "contained",
          to: "/suppliers",
          minWidth: 160,
          keywords: ["furnizori", "suppliers"],
        },
        {
          label: "Producători",
          icon: <FactoryRoundedIcon />,
          variant: "contained",
          to: "/producers",
          minWidth: 160,
          keywords: ["producatori", "manufacturers"],
        },
        {
          label: "Recepții",
          icon: <Inventory2RoundedIcon />,
          variant: "outlined",
          to: "/receptii",
          minWidth: 160,
          keywords: ["receptii", "receptie", "intrari", "aprovizionare"],
        },
        {
          label: "Comenzi",
          icon: <ListAltRoundedIcon />,
          variant: "contained",
          to: "/orders",
          minWidth: 160,
          keywords: ["comenzi", "order", "achizitii", "purchase"],
        },
        
      ],
    },
    {
      id: "proiecte",
      icon: <FolderOpenRoundedIcon />,
      badgeColor: "primary",
      title: "Proiecte",
      subheader: "Datele de bază ale proiectelor, clienți și locații.",
      actions: [
        {
          label: "Clienți",
          icon: <Groups2RoundedIcon />,
          variant: "contained",
          to: "/clients",
          minWidth: 160,
          keywords: ["clienti", "clients", "customer", "proiecte"],
        },
        {
          label: "Locații Clienți",
          icon: <PlaceRoundedIcon />,
          variant: "contained",
          to: "/client-locations",
          minWidth: 160,
          keywords: ["locatii", "adrese", "site", "santiere"],
        },
        {
          label: "Proiecte",
          icon: <FolderOpenRoundedIcon />,
          variant: "contained",
            to: "/projects",
          minWidth: 160,
          keywords: ["projects", "proiecte"],
        },
      ],
    },
    {
      id: "operatii",
      icon: <CategoryRoundedIcon />,
      badgeColor: "success",
      title: "Operații",
      subheader: "Definește categoriile și operațiile.",
      actions: [
        {
          label: "Categorii operații",
          icon: <CategoryRoundedIcon />,
          variant: "contained",
          to: "/operatii",
          minWidth: 200,
          keywords: ["operatii", "categorii", "operations", "categories"],
        },
      ],
    },
    {
      id: "inventar",
      icon: <Inventory2RoundedIcon />,
      badgeColor: "warning",
      title: "Materiale & Consumabile & Scule/Echipamente",
      subheader: "Gestionați stocuri, mișcări și consumuri.",
      actions: [
        {
          label: "Materiale",
          icon: <Inventory2RoundedIcon />,
          variant: "outlined",
          soonLabel: "Materiale",
          minWidth: 160,
          keywords: ["materiale", "inventar", "stoc"],
        },
        {
          label: "Consumabile",
          icon: <CategoryRoundedIcon />,
          variant: "outlined",
          soonLabel: "Consumabile",
          minWidth: 160,
          keywords: ["consumabile", "consum", "norme"],
        },
        {
          label: "Scule & Echipamente",
          icon: <ConstructionRoundedIcon />,
          variant: "contained",
          to: "/equipment",
          minWidth: 220,
          keywords: ["scule", "echipamente", "tooling"],
        },
      ],
      chips: [
        { label: "Stocuri", tooltip: "Status stoc", soonLabel: "Stocuri" },
        { label: "Mișcări", tooltip: "Intrări / ieșiri", soonLabel: "Mișcări" },
        { label: "Norme", tooltip: "Norme de consum", soonLabel: "Norme" },
      ],
    },
    {
      id: "manopera",
      icon: <EngineeringRoundedIcon />,
      badgeColor: "success",
      title: "Manoperă",
      subheader: "Echipe, calificări și linii de manoperă.",
      actions: [
        {
          label: "Echipă",
          icon: <EngineeringRoundedIcon />,
          variant: "contained",
          to: "/echipa",
          minWidth: 140,
          keywords: ["echipa", "team", "hr"],
        },
        {
          label: "Calendar concedii",
          icon: <CalendarMonthRoundedIcon />,
          variant: "contained",
          to: "/calendar",
          minWidth: 200,
          keywords: ["calendar", "concedii"],
        },
        {
          label: "Calificări",
          icon: <WorkspacePremiumRoundedIcon />,
          variant: "contained",
          to: "/qualifications",
          minWidth: 160,
          keywords: ["calificari", "certificari"],
        },
        {
          label: "Linii Manoperă",
          icon: <ListAltRoundedIcon />,
          variant: "outlined",
          soonLabel: "Linii Manoperă",
          minWidth: 180,
          keywords: ["manopera", "linii"],
        },
      ],
    },
    {
      id: "auto",
      icon: <DirectionsCarFilledRoundedIcon />,
      badgeColor: "info",
      title: "Auto",
      subheader: "Gestionați flota auto, status și operațiuni.",
      actions: [
        {
          label: "Flotă auto",
          icon: <DirectionsCarFilledRoundedIcon />,
          variant: "contained",
          to: "/flota-auto",
          minWidth: 160,
          keywords: ["auto", "flota", "masini"],
        },
        {
          label: "Status mașini",
          icon: <SpeedRoundedIcon />,
          variant: "outlined",
          soonLabel: "Status mașini",
          minWidth: 160,
          keywords: ["status", "revizii"],
        },
        {
          label: "Calendar expirări auto",
          icon: <CalendarMonthRoundedIcon />,
          variant: "contained",
          to: "/calendar-auto",
          minWidth: 200,
          keywords: ["calendar", "itp", "rca", "rovigneta"],
        },
      ],
    },
    {
      id: "ofertare",
      icon: <RequestQuoteRoundedIcon />,
      badgeColor: "secondary",
      title: "Ofertare",
      subheader: "Creează și trimite oferte către clienți.",
      actions: [
        {
          label: "Ofertare",
          icon: <RequestQuoteRoundedIcon />,
          variant: "contained",
          to: "/ofertare",
          minWidth: 180,
          keywords: ["ofertare", "oferta", "oferta noua", "clienti", "send offer"],
        },
        {
          label: "Trimite ofertă",
          icon: <SendRoundedIcon />,
          variant: "outlined",
          soonLabel: "Trimite ofertă către client",
          minWidth: 180,
          keywords: ["trimite", "send", "email", "client"],
        },
      ],
    },
    {
      id: 'financiar',
      icon: <AccountBalanceWalletRoundedIcon />,
      badgeColor: 'secondary',
      title: 'Financiar',
      subheader: 'Flux de numerar și registru de casă.',
      actions: [
        {
          label: 'Registru de casă',
          icon: <AccountBalanceWalletRoundedIcon />,
          variant: 'contained',
          to: '/cash-ledger',
          minWidth: 180,
          keywords: ['cash','casa','registru','numerar']
        }
      ]
    },
  ];

  // ---------- Command Bar (filter)
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const normalized = (s: string) => s.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");

  const filteredSections = useMemo(() => {
    if (!query.trim()) return sections;
    const nq = normalized(query);
    return sections
      .map((sec) => ({
        ...sec,
        actions: sec.actions.filter((a) => {
          const hay = [a.label, ...(a.keywords ?? [])].join(" ");
          return normalized(hay).includes(nq);
        }),
      }))
      .filter((sec) => sec.actions.length > 0);
  }, [sections, query]);

  const filteredQuick = useMemo(() => {
    if (!query.trim()) return quickActions;
    const nq = normalized(query);
    return quickActions.filter((a) => normalized([a.label, ...(a.keywords ?? [])].join(" ")).includes(nq));
  }, [quickActions, query]);

  // ---------- Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      const typing = tag === "input" || tag === "textarea" || (e.target as HTMLElement)?.isContentEditable;

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        return;
      }
      if (!typing && e.key === "/") {
        e.preventDefault();
        inputRef.current?.focus();
        return;
      }

      if (!typing) {
        const key = e.key.toLowerCase();
        if (key === "c") navigate("/clients");
        if (key === "e") navigate("/echipa");
        if (key === "f") navigate("/flota-auto");
        if (key === "a") soon("Adăugare rapidă proiect");
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [navigate]);

  return (
    <Box
      sx={{
        height: "100%",                 // fill Outlet area below TopBar
        display: "grid",
        gridTemplateRows: "auto 1fr",   // Hero + Content
        bgcolor: "background.default",
        position: "relative",
        overflow: "hidden",             // page itself doesn't scroll
      }}
    >
      {/* Soft background */}
      <Box
        aria-hidden
        sx={(theme) => ({
          position: "absolute",
          inset: 0,
          background: `
            radial-gradient(1100px 520px at -10% -10%, ${alpha(theme.palette.primary.main, 0.12)}, transparent 60%),
            radial-gradient(900px 480px at 110% 10%, ${alpha(theme.palette.secondary.main, 0.1)}, transparent 60%)
          `,
          filter: "blur(2px)",
          pointerEvents: "none",
        })}
      />

      {/* HERO (compact) */}
      <Box
        sx={(theme) => ({
          py: { xs: 3, md: 4 },
          background: `linear-gradient(180deg, ${alpha(theme.palette.background.paper, 0.7)}, transparent)`,
          borderBottom: `1px solid ${theme.palette.divider}`,
        })}
      >
        <Container maxWidth="xl">
          <Stack spacing={1.5} alignItems="center" textAlign="center">
          

            {/* Command Bar */}
            <Box sx={{ width: "100%", maxWidth: 720 }}>
              <TextField
                inputRef={inputRef}
                fullWidth
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder='Caută acțiuni, ex: „clienți”, „auto”, „calendar”…'
                aria-label="Căutare acțiuni"
                size="small"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchRoundedIcon />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Kbd>Ctrl</Kbd>
                        <Kbd>K</Kbd>
                      </Stack>
                    </InputAdornment>
                  ),
                }}
              />
            </Box>

            {/* Quick Actions */}
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: (t) => t.spacing(1.25), pt: 0.5, maxWidth: 960, justifyContent: "center" }}>
              {filteredQuick.map((a) => (
                <Box key={a.label}>
                  <Tooltip title={a.tooltip ?? ""} arrow placement="top">
                    <Button
                      aria-label={a.label}
                      variant={a.variant ?? "contained"}
                      size="medium"
                      onClick={go(a.to, a.soonLabel)}
                      startIcon={withIconSize(a.icon)}
                      endIcon={!a.icon ? <ChevronRightRoundedIcon /> : undefined}
                      sx={(theme) => ({
                        minWidth: a.minWidth ?? 160,
                        ...(a.variant === "contained"
                          ? {
                              background: `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                              color: "white",
                              boxShadow: 2,
                              "&:hover": { boxShadow: 4 },
                            }
                          : a.variant === "outlined"
                          ? {
                              borderColor: theme.palette.secondary.main,
                              color: theme.palette.secondary.main,
                              "&:hover": { borderColor: theme.palette.primary.main },
                            }
                          : { color: theme.palette.primary.main }),
                        textTransform: "none",
                        fontWeight: 700,
                        borderRadius: 2,
                      })}
                    >
                      {a.label}
                    </Button>
                  </Tooltip>
                </Box>
              ))}
            </Box>
          </Stack>
        </Container>
      </Box>

      {/* CONTENT (flex column with internal scroll + sticky footer) */}
      <Container
        maxWidth="xl"
        sx={{
          height: "100%",
          minHeight: 0,                 // IMPORTANT inside CSS grid
          py: { xs: 2, md: 3 },
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* Scroll area */}
        <Box
          sx={{
            flex: 1,
            minHeight: 0,
            overflowY: "auto",          // only this area scrolls if needed
            pr: { md: 0.5 },            // tiny gutter so scrollbar doesn't cover content
          }}
        >
          {query.trim() && filteredSections.length === 0 && filteredQuick.length === 0 ? (
            <Box
              role="status"
              sx={{
                textAlign: "center",
                color: "text.secondary",
                py: 4,
                border: (t) => `1px dashed ${t.palette.divider}`,
                borderRadius: 3,
              }}
            >
              Nicio potrivire pentru „{query}”.
            </Box>
          ) : (
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: {
                  xs: "1fr",
                  md: "repeat(3, minmax(0, 1fr))",
                  lg: "repeat(4, minmax(0, 1fr))",
                  xl: "repeat(5, minmax(0, 1fr))", // all tiles in one row @ xl
                },
                gap: { xs: 2, md: 3 },
                alignItems: "start",
              }}
            >
              {filteredSections.map((sec) => (
                <Card
                  key={sec.id}
                  component="section"
                  role="region"
                  aria-labelledby={`section-title-${sec.id}`}
                  elevation={1}
                  sx={{
                    height: "100%",
                    borderRadius: 3,
                    transition: "box-shadow 0.2s, transform 0.12s",
                    "&:hover": { boxShadow: 6 },
                  }}
                >
                  <CardHeader
                    avatar={<IconBadge color={sec.badgeColor}>{sec.icon}</IconBadge>}
                    titleTypographyProps={{ id: `section-title-${sec.id}`, variant: "subtitle1", fontWeight: 800 }}
                    title={sec.title}
                    subheader={sec.subheader}
                    sx={{ py: 1.25, px: 2 }}
                  />
                  <Divider />
                  <CardContent sx={{ pt: 1.5, pb: 1.75 }}>
                    <Stack spacing={1.25}>
                      {sec.actions.map((btn) => (
                        <Box key={btn.label}>
                          <Button
                            fullWidth
                            variant={btn.variant ?? "outlined"}
                            startIcon={withIconSize(btn.icon)}
                            onClick={go(btn.to, btn.soonLabel)}
                            aria-label={btn.label}
                            sx={(theme) => ({
                              justifyContent: "flex-start",
                              px: 2,
                              py: 1.05,
                              textTransform: "none",
                              fontWeight: 600,
                              borderRadius: 2,
                              minWidth: btn.minWidth ?? 140,
                              "&:focus-visible": {
                                outline: `2px solid ${alpha(theme.palette.primary.main, 0.5)}`,
                                outlineOffset: 2,
                              },
                            })}
                          >
                            {btn.label}
                          </Button>
                        </Box>
                      ))}
                    </Stack>

                    {sec.chips && sec.chips.length > 0 && (
                      <Stack direction="row" spacing={1} sx={{ mt: 1.5 }} flexWrap="wrap">
                        {sec.chips.map((c) => (
                          <Tooltip key={c.label} title={c.tooltip}>
                            <Chip
                              label={c.label}
                              size="small"
                              variant="outlined"
                              onClick={() => soon(c.soonLabel)}
                              sx={{ cursor: "pointer", mr: 0.5, mb: 0.5 }}
                            />
                          </Tooltip>
                        ))}
                      </Stack>
                    )}
                  </CardContent>
                </Card>
              ))}
            </Box>
          )}
        </Box>

        {/* Footer (always visible) */}
        <Box
          sx={{
            textAlign: "center",
            color: "text.secondary",
            py: 1,
            fontSize: 12,
            borderTop: (t) => `1px solid ${t.palette.divider}`,
            mt: 1,
            backgroundColor: "background.default",
          }}
        >
          © {new Date().getFullYear()} Topaz Admin. Toate drepturile rezervate.
        </Box>
      </Container>
    </Box>
  );
};
