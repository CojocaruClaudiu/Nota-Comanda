import * as React from "react";
import { Box, Button, Container, Stack, Typography } from "@mui/material";
import HomeRoundedIcon from "@mui/icons-material/HomeRounded";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import { Link as RouterLink, useLocation, useNavigate } from "react-router-dom";

export default function NotFound() {
  const { pathname } = useLocation();
  const navigate = useNavigate();

  return (
    <Container maxWidth="sm" sx={{ minHeight: "100vh", display: "grid", placeItems: "center" }}>
      <Stack spacing={2} alignItems="center" textAlign="center">
        <Box component="img" src="/LogoTopaz-1x1.png" alt="Topaz" sx={{ width: 96, opacity: 0.9, mb: 1 }} />
        <Typography variant="h4" fontWeight={800}>404 – Pagina nu a fost găsită</Typography>
        <Typography variant="body2" color="text.secondary">
          Nu există conținut la <code style={{ fontFamily: "monospace" }}>{pathname}</code>.
        </Typography>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} sx={{ pt: 1 }}>
          <Button
            onClick={() => navigate(-1)}
            startIcon={<ArrowBackRoundedIcon />}
            variant="outlined"
          >
            Înapoi
          </Button>
          <Button
            component={RouterLink}
            to="/"
            startIcon={<HomeRoundedIcon />}
            variant="contained"
          >
            Mergi la start
          </Button>
        </Stack>
      </Stack>
    </Container>
  );
}
