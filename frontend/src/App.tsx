// App.tsx
import { SnackbarProvider } from "notistack";
import { RouterProvider, createBrowserRouter, Outlet, ScrollRestoration } from "react-router-dom";
import { Box } from "@mui/material";
import TopBar from "./modules/topBar/TopBar";

import { AuthProvider } from "./auth/AuthContext";
import LoginPage from "./auth/LoginPage";
import { RequireAuth } from "./auth/RequireAuth";
import { RequireRole } from "./auth/RequireRole";

import { LandingPage } from "./modules/LandingPage";
import { ClientsTable } from "./modules/clients/ClientsTable";
import TeamPage from "./modules/team/teamPage.improved";
import HolidayCalendarPage from "./modules/team/HolidayCalendarPage";
import LeavePolicyPage from "./modules/team/LeavePolicyPage";
import FlotaPage from "./modules/auto/carPage";
import CarCalendarPage from "./modules/auto/carCalendarPage";
import OfferPage from "./modules/offer/OfferPage";
import NotFound from "./modules/NotFound";
import SettingsPage from "./modules/settings/SettingsPage";
import ProfilePage from "./modules/profile/ProfilePage";
import SuppliersPage from "./modules/suppliers/SuppliersPage";
import ProjectsPage from "./modules/projects/ProjectsPage";
import OperationCategoriesPage from "./modules/operatii/OperationCategoriesPage";
import ClientLocationsPage from "./modules/projects/clientLocations/ClientLocationsPage";
import EquipmentPage from "./modules/equipment/EquipmentPage";
import QualificationsTreePage from "./modules/qualifications/QualificationsTreePage";
import MaterialsPage from "./modules/materials/MaterialsPage";
import ProducersPage from "./modules/producers/ProducersPage";
import RegistruReceptiiPage from "./modules/receptions/ReceptionsPage";
import OrdersPage from "./modules/orders/OrdersPage";
import CashLedgerPage from "./modules/cash/CashLedgerPage";
import ExchangeRatesPage from "./modules/exchangeRates/ExchangeRatesPage";

function AppLayout() {
  return (
    <Box
      sx={{
        height: "100dvh",
        width: "100vw",
        display: "grid",
        gridTemplateRows: "auto 1fr",  // TopBar + content
        overflow: "hidden",
      }}
    >
      <TopBar />
      <Box sx={{ minHeight: 0, overflow: "hidden" }}>
        <ScrollRestoration />
        <Outlet />
      </Box>
    </Box>
  );
}


const router = createBrowserRouter([
  // --- LOGIN route is OUTSIDE the AppLayout
  { path: "/login", element: <LoginPage /> },

  {
    element: <AppLayout />,
    errorElement: <NotFound />,
    children: [
      {
        index: true,
        element: (
          <RequireAuth>
            <LandingPage />
          </RequireAuth>
        ),
      },
      {
        path: "clients",
        element: (
          <RequireAuth>
            <ClientsTable />
          </RequireAuth>
        ),
      },
      {
        path: "echipa",
        element: (
          <RequireAuth>
            <TeamPage />
          </RequireAuth>
        ),
      },
      {
        path: "calendar",
        element: (
          <RequireAuth>
            <HolidayCalendarPage />
          </RequireAuth>
        ),
      },
      {
        path: "leave-policy",
        element: (
          <RequireAuth>
            <RequireRole roles={["ADMIN", "MANAGER"]}>
              <LeavePolicyPage />
            </RequireRole>
          </RequireAuth>
        ),
      },
      {
        path: "flota-auto",
        element: (
          <RequireAuth>
            <FlotaPage />
          </RequireAuth>
        ),
      },
      {
        path: "calendar-auto",
        element: (
          <RequireAuth>
            <CarCalendarPage />
          </RequireAuth>
        ),
      },
      {
        path: "ofertare",
        element: (
          <RequireAuth>
            <RequireRole roles={["ADMIN", "MANAGER"]}>
              <OfferPage />
            </RequireRole>
          </RequireAuth>
        ),
      },
      {
        path: "suppliers",
        element: (
          <RequireAuth>
            <SuppliersPage />
          </RequireAuth>
        ),
      },
      {
        path: "producers",
        element: (
          <RequireAuth>
            <ProducersPage />
          </RequireAuth>
        ),
      },
      {
        path: "registru-receptii",
        element: (
          <RequireAuth>
            <RegistruReceptiiPage />
          </RequireAuth>
        ),
      },
      {
        path: "orders",
        element: (
          <RequireAuth>
            <OrdersPage />
          </RequireAuth>
        ),
      },
      {
        path: "projects",
        element: (
          <RequireAuth>
            <ProjectsPage />
          </RequireAuth>
        ),
      },
      {
        path: "operatii",
        element: (
          <RequireAuth>
            <OperationCategoriesPage />
          </RequireAuth>
        ),
      },
      {
        path: "equipment",
        element: (
          <RequireAuth>
            <EquipmentPage />
          </RequireAuth>
        ),
      },
      {
        path: "qualifications",
        element: (
          <RequireAuth>
            <QualificationsTreePage />
          </RequireAuth>
        ),
      },
      {
        path: "materials",
        element: (
          <RequireAuth>
            <MaterialsPage />
          </RequireAuth>
        ),
      },
      {
        path: "client-locations",
        element: (
          <RequireAuth>
            <ClientLocationsPage />
          </RequireAuth>
        ),
      },
      {
        path: "cash-ledger",
        element: (
          <RequireAuth>
            <CashLedgerPage />
          </RequireAuth>
        )
      },
      {
        path: "exchange-rates",
        element: (
          <RequireAuth>
            <ExchangeRatesPage />
          </RequireAuth>
        ),
      },
      {
        path: "setari",
        element: (
          <RequireAuth>
            <SettingsPage />
          </RequireAuth>
        ),
      },
      {
        path: "profil",
        element: (
          <RequireAuth>
            <ProfilePage />
          </RequireAuth>
        ),
      }
    ],
  },
]);

export default function App() {
  return (
    <SnackbarProvider
      maxSnack={3}
      autoHideDuration={3000}
      anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
    >
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </SnackbarProvider>
  );
}
