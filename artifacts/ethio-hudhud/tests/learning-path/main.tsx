import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Route, Switch } from 'wouter';
import { AppProvider } from '@/lib/app';
import Learn from '@/pages/learn';
import Lesson from '@/pages/lesson';
import Dashboard from '@/pages/dashboard';
import Premium from '@/pages/premium';
import Account from '@/pages/account';
import { ClerkQueryClientCacheInvalidator } from '@/components/clerk-query-cache-invalidator';
import './styles.css';

const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
createRoot(document.getElementById('root')!).render(
  <QueryClientProvider client={client}>
    <AppProvider>
      <ClerkQueryClientCacheInvalidator />
      <Switch>
        <Route path="/account" component={Account} />
        <Route path="/premium" component={Premium} />
        <Route path="/dashboard" component={Dashboard} />
        <Route path="/lesson/:id" component={Lesson} />
        <Route component={Learn} />
      </Switch>
    </AppProvider>
  </QueryClientProvider>,
);
