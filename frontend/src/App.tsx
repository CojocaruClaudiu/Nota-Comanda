import * as React from "react";
import { SnackbarProvider } from "notistack";
import { OrdersProvider } from "./modules/orders/OrderContext";
import { LandingPage } from "./modules/LandingPage";
import { ClientsTable } from "./modules/clients/ClientsTable";
import TeamPage from "./modules/team/teamPage";
import HolidayCalendarPage from "./modules/team/HolidayCalendarPage";
import FlotaPage from "./modules/auto/carPage";
import CarCalendarPage from "./modules/auto/carCalendarPage";
import OfferPage from "./modules/offer/OfferPage";
import { ErrorBoundary } from "./modules/ErrorBoundary";

import {
  createBrowserRouter,
  RouterProvider,
  Outlet,
  ScrollRestoration,
} from "react-router-dom";

import { Box } from "@mui/material";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import NotFound from "./modules/NotFound";

// Optional: a tiny app layout wrapper
function AppLayout() {
  return (
    <Box sx={{ height: "100vh", width: "100vw" }}>
      <ScrollRestoration />
      <Outlet />
    </Box>
  );
}

const router = createBrowserRouter(
  [
    {
      element: <AppLayout />,
      errorElement: <NotFound />, // catches 404s & route errors
      children: [
        { index: true, element: <LandingPage /> },
        { path: "clients", element: <ClientsTable /> },
        { path: "echipa", element: <TeamPage /> },
        { path: "calendar", element: <HolidayCalendarPage /> },
        { path: "flota-auto", element: <FlotaPage /> },
        { path: "calendar-auto", element: <CarCalendarPage /> },
        { path: "ofertare", element: <OfferPage /> },
        // you can add nested routes like "clients/*" later without extra 404 wiring
      ],
    },
  ],
  {
    // if the app lives under a subpath, set basename here:
    // basename: import.meta.env.BASE_URL
  }
);

export default function App() {
  return (
    <ErrorBoundary>
      <SnackbarProvider
        maxSnack={3}
        autoHideDuration={3000}
        preventDuplicate
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <LocalizationProvider dateAdapter={AdapterDayjs}>
          <OrdersProvider>
            <RouterProvider router={router} />
          </OrdersProvider>
        </LocalizationProvider>
      </SnackbarProvider>
    </ErrorBoundary>
  );
}
