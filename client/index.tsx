import React from 'react';
import ReactDOM from 'react-dom';
import { ContractListPage, ContractPage, EventListenerPage, HistoryPage, Report } from './pages';

function Router() {
  if (location.pathname === '/') {
    return <ContractListPage />;
  }

  const contractRoute = location.pathname.match(/^\/contract\/([0-9a-z\-]+)$/i);
  if (contractRoute !== null) {
    return <ContractPage contractId={contractRoute[1]} />;
  }

  const eventListenerRoute = location.pathname.match(
    /^\/contract\/([0-9a-z\-]+)\/event-listener\/([0-9a-z\-]+)$/i,
  );
  if (eventListenerRoute !== null) {
    return (
      <EventListenerPage
        contractId={eventListenerRoute[1]}
        eventListenerId={eventListenerRoute[2]}
      />
    );
  }

  const historyRoute = location.pathname.match(
    /^\/contract\/([0-9a-z\-]+)\/event-listener\/([0-9a-z\-]+)\/history$/i,
  );
  if (historyRoute !== null) {
    return <HistoryPage contractId={historyRoute[1]} eventListenerId={historyRoute[2]} />;
  }

  const syncProgressNetworkRoute = location.pathname.match(
    /^\/report\/sync-progress\/([0-9a-z\-]+)$/i,
  );
  if (syncProgressNetworkRoute !== null) {
    return <Report.SyncProgressNetwork network={syncProgressNetworkRoute[1]} />;
  }

  if (/^\/report\/sync-progress$/i.test(location.pathname)) {
    return <Report.SyncProgress />;
  }

  return <div>Page not found</div>;
}

ReactDOM.render(
  <React.StrictMode>
    <Router />
  </React.StrictMode>,
  document.querySelector('#page'),
);
