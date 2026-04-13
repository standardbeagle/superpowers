import { LocationProvider, Router, Route } from "preact-iso";
import { Shell } from "./layout/Shell";
import { ScreenView } from "./screens/ScreenView";

export function App() {
  return (
    <LocationProvider>
      <Shell>
        <Router>
          <Route path="/" component={Home} />
          <Route path="/screen/:id" component={ScreenView} />
          <Route default component={NotFound} />
        </Router>
      </Shell>
    </LocationProvider>
  );
}

function Home() {
  return <p>Pick a screen from the sidebar.</p>;
}

function NotFound() {
  return <p>Not found.</p>;
}
