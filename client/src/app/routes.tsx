import { Route, Switch } from "wouter";
import HomePage from "@features/chat/pages/Home";
import NotFound from "@/pages/not-found";

export function AppRoutes() {
  return (
    <Switch>
      <Route path="/">
        <HomePage />
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

