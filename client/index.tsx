import React from "react";
import ReactDOM from "react-dom";
import { ContractListPage, ContractPage, EventListenerPage } from "./pages";

function App() {
  if (location.pathname === "/") {
    return <ContractListPage />;
  }

  const contractRoute = location.pathname.match(/^\/contract\/([0-9a-z\-]+)$/i);
  if (contractRoute !== null) {
    return <ContractPage contractId={contractRoute[1]} />;
  }

  const eventListenerRoute = location.pathname.match(
    /^\/contract\/([0-9a-z\-]+)\/event-listener\/([0-9a-z\-]+)$/i
  );
  if (eventListenerRoute !== null) {
    return (
      <EventListenerPage
        contractId={eventListenerRoute[1]}
        eventListenerId={eventListenerRoute[2]}
      />
    );
  }

  return <div>Page not found</div>;
}

ReactDOM.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
  document.querySelector("#page")
);
