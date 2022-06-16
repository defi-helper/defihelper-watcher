import React, { useState, useEffect } from 'react';
import { getContract, EventListener, getEventListener, Contract } from '../../api';

interface Event {
  contract: { id: string; network: number; address: string };
  listener: { id: string; name: string };
  events: Array<{ transactionHash: string }>;
  from: number;
  to: number;
}

export interface Props {
  contractId: string;
  eventListenerId: string;
}

export function EventListenerPage({ contractId, eventListenerId }: Props) {
  const [contract, setContract] = useState<Contract | Error | null>(null);
  const [eventListener, setEventListener] = useState<EventListener | Error | null>(null);
  const [socketConnected, setSocketConnected] = useState(false);
  const [events, setEvents] = useState<Event[]>([]);
  const ws = new WebSocket(`${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}`);

  useEffect(() => {
    getContract(contractId)
      .then((contract) => {
        setContract(contract);
        getEventListener(contractId, eventListenerId)
          .then((eventListener) => {
            setEventListener(eventListener);
          })
          .catch(() => setEventListener(new Error('Event listener not found')));
      })
      .catch(() => setContract(new Error('Contract not found')));

    ws.onopen = () => setSocketConnected(true);
    ws.onclose = () => setSocketConnected(false);
  }, []);

  useEffect(() => {
    if (!contract || contract instanceof Error) return;
    if (!eventListener || eventListener instanceof Error) return;
    if (socketConnected) {
      ws.onmessage = ({ data }) => {
        const newEvent: Event = JSON.parse(data);
        contract.id === newEvent.contract.id &&
          eventListener.id === newEvent.listener.id &&
          setEvents([JSON.parse(data), ...events.slice(0, 9)]);
      };
    } else {
      ws.onmessage = null;
    }
  }, [contract, eventListener, events, socketConnected]);

  if (contract === null || eventListener === null) {
    return <div className="container">Loading...</div>;
  }
  if (contract instanceof Error) {
    return <div className="container">{contract.message}</div>;
  }
  if (eventListener instanceof Error) {
    return <div className="container">{eventListener.message}</div>;
  }

  return (
    <div className="container">
      <div>
        <a href={`/`}>Main</a>
        {' > '}
        <a href={`/contract/${contractId}`}>{contract.name}</a>
      </div>
      <div>
        Socket:{' '}
        {socketConnected ? (
          <span style={{ color: 'green' }}>connected</span>
        ) : (
          <span style={{ color: 'red' }}>disconnected</span>
        )}
      </div>
      <div>
        {events.map(({ from, to, contract, listener, events }) => (
          <div key={`${contract.network}:${from}-${to}`}>
            <div>
              {contract.network}:{from}-{to}
            </div>
            <div>
              {contract.address} {listener.name}
            </div>
            <div>
              <ul>
                {events.map(({ transactionHash }, i) => (
                  <li key={i}>{transactionHash}</li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
