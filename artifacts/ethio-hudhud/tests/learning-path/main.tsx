import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Route, Switch } from 'wouter';
import { AppProvider } from '@/lib/app';
import Learn from '@/pages/learn';
import Lesson from '@/pages/lesson';
import '@/index.css';

const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
createRoot(document.getElementById('root')!).render(
  <QueryClientProvider client={client}>
    <AppProvider>
      <Switch>
        <Route path="/lesson/:id" component={Lesson} />
        <Route component={Learn} />
      </Switch>
    </AppProvider>
  </QueryClientProvider>,
);
