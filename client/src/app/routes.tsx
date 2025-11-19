import { Route, Switch } from "wouter";
import HomeLanding from "@features/home/pages/HomeLanding";
import WrenPage from "@features/chat/pages/Wren";
import NotFound from "@/pages/not-found";

export function AppRoutes() {
  return (
    <Switch>
      <Route path="/">
        <HomeLanding />
      </Route>
      <Route path="/wren">
        <WrenPage />
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

