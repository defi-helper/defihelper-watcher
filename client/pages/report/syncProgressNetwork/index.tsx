import React, { useState, useEffect } from 'react';
import dayjs from 'dayjs';
import { Pagination } from '../../../components/pagination';
import { syncProgressNetworkReport, EventListener } from '../../../api';

export interface Params {
  network: string;
}

export function SyncProgressNetwork({ network }: Params) {
  const eventListenersLimit = 20;
  const [eventListenersPage, setEventListenersPage] = useState<number>(1);
  const [eventListeners, setEventListeners] = useState<EventListener[]>([]);
  const [eventListenersCount, setEventListenersCount] = useState<number>(0);

  useEffect(() => {
    syncProgressNetworkReport(
      network,
      eventListenersLimit,
      (eventListenersPage - 1) * eventListenersLimit,
    ).then(({ list, count }) => {
      setEventListeners(list);
      setEventListenersCount(count);
    });
  }, []);

  return (
    <div className="container">
      <div>
        <a href="/">Main</a>
        {' > '}
        <a href="/report/sync-progress">Sync progress</a>
      </div>
      <div>
        <h3>Sync progress network {network}:</h3>
        <table>
          <thead>
            <tr>
              <td>Contract</td>
              <td>Name</td>
              <td>Progress</td>
              <td>Sync At</td>
              <td>Created At</td>
            </tr>
          </thead>
          <tbody>
            {eventListeners.map(({ id, name, contract, contractName, sync, syncAt, createdAt }) => (
              <tr>
                <td style={{ width: '30%' }}>
                  <a href={`/contract/${contract}`}>{contractName}</a>
                </td>
                <td style={{ width: '10%' }}>
                  <a href={`/contract/${contract}/event-listener/${id}`}>{name}</a>
                </td>
                <td style={{ width: '30%' }}>
                  <div className="progress">
                    <span
                      className={sync.progress >= 90 ? 'green' : 'red'}
                      style={{
                        width: `${sync.progress}%`,
                      }}
                    ></span>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    {sync.syncHeight}/{sync.currentBlock}
                  </div>
                </td>
                <td style={{ width: '15%' }}>
                  {syncAt && dayjs(syncAt).format('DD.MM.YYYY HH:mm')}
                </td>
                <td style={{ width: '15%' }}>{dayjs(createdAt).format('DD.MM.YYYY HH:mm')}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <Pagination
          count={eventListenersCount}
          limit={eventListenersLimit}
          page={eventListenersPage}
          onPrev={setEventListenersPage}
          onNext={setEventListenersPage}
        />
      </div>
    </div>
  );
}
