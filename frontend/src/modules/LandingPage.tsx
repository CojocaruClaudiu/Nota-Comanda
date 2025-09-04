// src/pages/LandingPage.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Box,
  Container,
  Typography,
  Stack,
  Button,
  Grid,
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

// Icons
import Inventory2RoundedIcon from "@mui/icons-material/Inventory2Rounded";
import HandymanRoundedIcon from "@mui/icons-material/HandymanRounded";
import BuildCircleRoundedIcon from "@mui/icons-material/BuildCircleRounded";
import PeopleAltRoundedIcon from "@mui/icons-material/PeopleAltRounded";
import LocationOnRoundedIcon from "@mui/icons-material/LocationOnRounded";
import WorkOutlineRoundedIcon from "@mui/icons-material/WorkOutlineRounded";
import ChevronRightRoundedIcon from "@mui/icons-material/ChevronRightRounded";
import AddCircleOutlineRoundedIcon from "@mui/icons-material/AddCircleOutlineRounded";
import DirectionsCarFilledRoundedIcon from "@mui/icons-material/DirectionsCarFilledRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";

// ---------- Types
type ActionItem = {
  label: string;
  icon?: React.ReactNode;
  variant?: "contained" | "outlined" | "text";
  to?: string;             // route to navigate to
  soonLabel?: string;      // if present, triggers "în curând"
  minWidth?: number;
  keywords?: string[];     // for command search
};

type SectionConfig = {
  id: string;
  icon: React.ReactNode;
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
      icon: <PeopleAltRoundedIcon />,
      variant: "contained",
      to: "/clients",
      minWidth: 200,
      keywords: ["clienti", "clients", "customer", "proiecte"],
    },
    {
      label: "Echipă",
      icon: <HandymanRoundedIcon />,
      variant: "outlined",
      to: "/echipa",
      minWidth: 160,
      keywords: ["echipa", "team", "angajati", "hr", "manopera"],
    },
    {
      label: "Flotă auto",
      icon: <DirectionsCarFilledRoundedIcon />,
      variant: "outlined",
      to: "/flota-auto",
      minWidth: 160,
      keywords: ["auto", "flota", "masini", "vehicule"],
    },
    {
      label: "Adăugare rapidă",
      icon: <AddCircleOutlineRoundedIcon />,
      variant: "text",
      soonLabel: "Adăugare rapidă proiect",
      minWidth: 180,
      keywords: ["adauga", "quick add", "proiect"],
    },
  ];

  // Sections (scalable, single source of truth)
  const sections: SectionConfig[] = [
    {
      id: "proiecte",
      icon: <WorkOutlineRoundedIcon color="primary" />,
      title: "Proiecte",
      subheader: "Datele de bază ale proiectelor, clienți și locații.",
      actions: [
        {
          label: "Clienți",
          icon: <PeopleAltRoundedIcon />,
          variant: "contained",
          to: "/clients",
          minWidth: 160,
          keywords: ["clienti", "clients", "customer", "proiecte"],
        },
        {
          label: "Locații Clienți",
          icon: <LocationOnRoundedIcon />,
          variant: "outlined",
          soonLabel: "Locații Clienți",
          minWidth: 160,
          keywords: ["locatii", "adrese", "site", "santiere"],
        },
        {
          label: "Proiecte",
          icon: <WorkOutlineRoundedIcon />,
          variant: "outlined",
          soonLabel: "Proiecte",
          minWidth: 160,
          keywords: ["projects", "proiecte"],
        },
      ],
    },
    {
      id: "inventar",
      icon: <Inventory2RoundedIcon color="primary" />,
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
          icon: <BuildCircleRoundedIcon />,
          variant: "outlined",
          soonLabel: "Consumabile",
          minWidth: 160,
          keywords: ["consumabile", "consum", "norme"],
        },
        {
          label: "Scule & Echipamente",
          icon: <HandymanRoundedIcon />,
          variant: "outlined",
          soonLabel: "Scule & Echipamente",
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
      icon: <HandymanRoundedIcon color="primary" />,
      title: "Manoperă",
      subheader: "Echipe, calificări și linii de manoperă.",
      actions: [
        { label: "Echipă", variant: "contained", to: "/echipa", minWidth: 140, keywords: ["echipa", "team", "hr"] },
        { label: "Calendar concedii", variant: "contained", to: "/calendar", minWidth: 200, keywords: ["calendar", "concedii"] },
        { label: "Calificări", variant: "outlined", soonLabel: "Calificări", minWidth: 160, keywords: ["calificari", "certificari"] },
        { label: "Linii Manoperă", variant: "outlined", soonLabel: "Linii Manoperă", minWidth: 180, keywords: ["manopera", "linii"] },
      ],
    },
    {
      id: "auto",
      icon: <DirectionsCarFilledRoundedIcon color="primary" />,
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
        { label: "Adaugă mașină", variant: "outlined", soonLabel: "Adaugă mașină", minWidth: 160, keywords: ["adauga", "masina"] },
        { label: "Status mașini", variant: "outlined", soonLabel: "Status mașini", minWidth: 160, keywords: ["status", "revizii"] },
        {
          label: "Calendar expirări auto",
          icon: <DirectionsCarFilledRoundedIcon />,
          variant: "contained",
          to: "/calendar-auto",
          minWidth: 200,
          keywords: ["calendar", "itp", "rca", "rovigneta"],
        },
      ],
    },
    {
      id: "ofertare",
      icon: <WorkOutlineRoundedIcon color="primary" />,
      title: "Ofertare",
      subheader: "Creează și trimite oferte către clienți.",
      actions: [
        {
          label: "Ofertare",
          icon: <WorkOutlineRoundedIcon />,
          variant: "contained",
          to: "/ofertare",
          minWidth: 180,
          keywords: ["ofertare", "oferta", "oferta noua", "clienti", "send offer"],
        },
        {
          label: "Trimite ofertă",
          icon: <AddCircleOutlineRoundedIcon />,
          variant: "outlined",
          soonLabel: "Trimite ofertă către client",
          minWidth: 180,
          keywords: ["trimite", "send", "email", "client"],
        },
      ],
    },
  ];

  // ---------- Command Bar (filter)
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const allActions = useMemo(() => {
    const arr: (ActionItem & { sectionId: string })[] = [];
    sections.forEach((s) =>
      s.actions.forEach((a) => arr.push({ ...a, sectionId: s.id }))
    );
    quickActions.forEach((a) => arr.push({ ...a, sectionId: "quick" }));
    return arr;
  }, [sections, quickActions]);

  const normalized = (s: string) =>
    s.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");

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
    return quickActions.filter((a) =>
      normalized([a.label, ...(a.keywords ?? [])].join(" ")).includes(nq)
    );
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
        minHeight: "100vh",
        bgcolor: "background.default",
        position: "relative",
        overflow: "hidden",
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
            radial-gradient(900px 480px at 110% 10%, ${alpha(theme.palette.secondary.main, 0.10)}, transparent 60%)
          `,
          filter: "blur(2px)",
          pointerEvents: "none",
        })}
      />

      {/* HERO */}
      <Box
        sx={(theme) => ({
          py: { xs: 5, md: 8 },
          background: `linear-gradient(180deg, ${alpha(theme.palette.background.paper, 0.7)}, transparent)`,
          borderBottom: `1px solid ${theme.palette.divider}`,
        })}
      >
        <Container maxWidth="lg">
          <Stack spacing={2} alignItems="center" textAlign="center">
            <Chip label="Topaz • Admin" variant="outlined" sx={{ fontWeight: 600, borderRadius: 2 }} />
            <Typography variant="h3" fontWeight={800} lineHeight={1.1}>
              Bine ați venit 👋
            </Typography>
            <Typography variant="subtitle1" color="text.secondary">
              Gestionați rapid operațiunile companiei dintr-un singur loc.
            </Typography>

            {/* Command Bar */}
            <Box sx={{ width: "100%", maxWidth: 720, mt: 1.5 }}>
              <TextField
                inputRef={inputRef}
                fullWidth
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Caută acțiuni, ex: „clienți”, „auto”, „calendar”…"
                aria-label="Căutare acțiuni"
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
            <Grid container spacing={1.5} sx={{ pt: 1, maxWidth: 920 }}>
              {filteredQuick.map((a) => (
                <Grid key={a.label} item xs={12} sm="auto">
                  <Button
                    aria-label={a.label}
                    variant={a.variant ?? "contained"}
                    size="large"
                    onClick={go(a.to, a.soonLabel)}
                    startIcon={a.icon}
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
                      transition: "transform 0.2s",
                      "&:hover": { transform: "translateY(-1px)" },
                    })}
                  >
                    {a.label}
                  </Button>
                </Grid>
              ))}
            </Grid>
          </Stack>
        </Container>
      </Box>

      {/* CONTENT */}
      <Container maxWidth="lg" sx={{ py: { xs: 3, md: 5 } }}>
        {query.trim() && filteredSections.length === 0 && filteredQuick.length === 0 ? (
          <Box
            role="status"
            sx={{
              textAlign: "center",
              color: "text.secondary",
              py: 6,
              border: (t) => `1px dashed ${t.palette.divider}`,
              borderRadius: 3,
            }}
          >
            Nicio potrivire pentru „{query}”.
          </Box>
        ) : (
          // --- Multi-column layout for sections
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "1fr",
                md: "repeat(2, minmax(0, 1fr))",
                xl: "repeat(3, minmax(0, 1fr))",
              },
              gap: { xs: 2, md: 3 },
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
                  borderRadius: 3,
                  transition: "box-shadow 0.2s, transform 0.12s",
                  "&:hover": { boxShadow: 6 },
                }}
              >
                <CardHeader
                  avatar={sec.icon}
                  titleTypographyProps={{ id: `section-title-${sec.id}`, variant: "h6", fontWeight: 700 }}
                  title={sec.title}
                  subheader={sec.subheader}
                  sx={{ py: 1.25, px: 2.25 }}
                />
                <Divider />
                <CardContent sx={{ pt: 2, pb: 2.25 }}>
                  <Grid container spacing={1.5}>
                    {sec.actions.map((btn) => (
                      <Grid item xs={12} sm={6} md={6} lg={6} key={btn.label}>
                        <Button
                          fullWidth
                          variant={btn.variant ?? "outlined"}
                          startIcon={btn.icon}
                          onClick={go(btn.to, btn.soonLabel)}
                          aria-label={btn.label}
                          sx={(theme) => ({
                            minWidth: btn.minWidth ?? 140,
                            justifyContent: "flex-start",
                            px: 2,
                            py: 1.1,
                            textTransform: "none",
                            fontWeight: 600,
                            borderRadius: 2,
                            "&:focus-visible": {
                              outline: `2px solid ${alpha(theme.palette.primary.main, 0.5)}`,
                              outlineOffset: 2,
                            },
                          })}
                        >
                          {btn.label}
                        </Button>
                      </Grid>
                    ))}
                  </Grid>

                  {sec.chips && sec.chips.length > 0 && (
                    <Stack direction="row" spacing={1} sx={{ mt: 2 }} flexWrap="wrap">
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

        {/* Footer */}
        <Box sx={{ height: 24 }} />
        <Box sx={{ textAlign: "center", color: "text.secondary", py: 2, fontSize: 13 }}>
          © {new Date().getFullYear()} Topaz Admin. Toate drepturile rezervate.
        </Box>
      </Container>
    </Box>
  );
};
