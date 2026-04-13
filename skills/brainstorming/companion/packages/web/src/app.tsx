import { LocationProvider, Router, Route } from "preact-iso";
import { Shell } from "./layout/Shell";
import { ScreenView } from "./screens/ScreenView";
import { DemoView } from "./screens/DemoView";
import { DecisionView } from "./screens/DecisionView";
import { DocsView } from "./screens/DocsView";
import { HelpView } from "./screens/HelpView";

export function App() {
  return (
    <LocationProvider>
      <Shell>
        <Router>
          <Route path="/" component={Home} />
          <Route path="/screen/:id" component={ScreenView} />
          <Route path="/demo/:id" component={DemoView} />
          <Route path="/decisions/:id" component={DecisionView} />
          <Route path="/docs/:path*" component={DocsView} />
          <Route path="/help" component={HelpView} />
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
