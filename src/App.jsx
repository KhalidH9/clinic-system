import React, { Suspense } from 'react';
import AppRouter from './router/AppRouter';
import { logger } from './lib/logger';

const App = () => {
  logger.info('App mounted');   // one-shot log, useful for cold-start tracing

  return (
    <Suspense fallback={<div className="p-8 text-center">Loading…</div>}>
      {/* TanStack Router v1 or React-Router v6. */}
      <AppRouter />
    </Suspense>
  );
};

export default App;