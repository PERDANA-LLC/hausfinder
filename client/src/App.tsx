import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import PropertyDetail from "./pages/PropertyDetail";
import Search from "./pages/Search";
import CreateListing from "./pages/CreateListing";
import EditListing from "./pages/EditListing";
import Dashboard from "./pages/Dashboard";
import Favorites from "./pages/Favorites";
import MapView from "./pages/MapView";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/property/:id" component={PropertyDetail} />
      <Route path="/search" component={Search} />
      <Route path="/list-property" component={CreateListing} />
      <Route path="/edit-property/:id" component={EditListing} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/favorites" component={Favorites} />
      <Route path="/map" component={MapView} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark" switchable>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
