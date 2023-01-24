import { Pagination } from '../../components/pagination';
import { Modal } from '../../components/modal';
import React, { useState, useEffect, useReducer } from 'react';
import {
  Contract,
  getContract,
  EventListener,
  getEventListenerList,
  deleteEventListener,
  createEventListener,
  updateEventListener,
  getEventListenerCount,
  getEventListener,
  getHistoryList,
  HistorySync,
  getHistoryCount,
  createHistorySync,
  deleteHistoricalSync,
  updateHistorySync,
} from '../../api';

interface HistoryEdit {
  id: string | null;
  syncHeight: string;
  endHeight: string;
  saveEvents: boolean;
}

function HistoryInterval({ history }: { history: HistorySync }) {
  if (history.endHeight === null) {
    return (
      <span>
        {history.syncHeight} ⟶ {history.sync.currentBlock}...
      </span>
    );
  }
  if (history.syncHeight > history.endHeight) {
    return (
      <span>
        {history.endHeight} ⟵ {history.syncHeight}
      </span>
    );
  }
  return (
    <span>
      {history.syncHeight} ⟶ {history.endHeight}
    </span>
  );
}

function HistoryProgress({ history }: { history: HistorySync }) {
  const end = history.endHeight ?? history.sync.currentBlock;
  const progress = Math.max(end, history.syncHeight) - Math.min(end, history.syncHeight);

  return (
    <span style={{ color: progress > 50 ? 'red' : 'green' }}>
      {history.endHeight !== null && progress === 0 ? '✓' : progress}
    </span>
  );
}

export interface Props {
  contractId: string;
  eventListenerId: string;
}

export function HistoryPage({ contractId, eventListenerId }: Props) {
  const [contract, setContract] = useState<Contract | Error | null>(null);
  const [eventListener, setEventListener] = useState<EventListener | Error | null>(null);
  const historiesLimit = 10;
  const [historiesPage, setHistoriesPage] = useState<number>(1);
  const [histories, setHistories] = useState<HistorySync[] | null>(null);
  const [historiesCount, setHistoriesCount] = useState<number>(0);
  const [historyEdit, setHistoryEdit] = useState<HistoryEdit | null>(null);

  const reloadHistoriesList = () => {
    setHistories(null);
    return Promise.all([
      getHistoryList(
        contractId,
        eventListenerId,
        historiesLimit,
        (historiesPage - 1) * historiesLimit,
      ).then(setHistories),
      getHistoryCount(contractId, eventListenerId).then(setHistoriesCount),
    ]);
  };

  const onSaveHistory = () => {
    if (!historyEdit) return;

    const data = {
      syncHeight: Number(historyEdit.syncHeight),
      endHeight: historyEdit.endHeight !== '' ? Number(historyEdit.endHeight) : null,
      saveEvents: historyEdit.saveEvents,
    };
    if (Number.isNaN(data.syncHeight)) return;
    if (data.endHeight !== null && Number.isNaN(data.endHeight)) return;

    const promise = historyEdit.id
      ? updateHistorySync(contractId, eventListenerId, historyEdit.id, data)
      : createHistorySync(contractId, eventListenerId, data);
    return promise.then(() => setHistoryEdit(null)).then(reloadHistoriesList);
  };

  const onDeleteHistory = (id: string) => {
    if (!confirm('Are you sure?')) return;

    return deleteHistoricalSync(contractId, eventListenerId, id).then(reloadHistoriesList);
  };

  useEffect(() => {
    getContract(contractId)
      .then(setContract)
      .then(() =>
        getEventListener(contractId, eventListenerId)
          .then(setEventListener)
          .then(reloadHistoriesList)
          .catch(() => setEventListener(new Error('Event listener not found'))),
      )
      .catch(() => setContract(new Error('Contract not found')));
  }, []);

  useEffect(() => {
    reloadHistoriesList();
  }, [historiesPage]);

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
        <h3>
          Histories of {eventListener.name} event in contract {contract.name} at network{' '}
          {contract.network}
        </h3>
        <table>
          <thead>
            <tr>
              <th>Interval</th>
              <th>Progress</th>
              <th>Save events</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {histories !== null ? (
              histories.map((history) => (
                <tr key={history.id}>
                  <td>
                    <HistoryInterval history={history} />
                  </td>
                  <td>
                    <HistoryProgress history={history} />
                  </td>
                  <td>{history.saveEvents ? 'yes' : 'no'}</td>
                  <td>
                    <div style={{ textAlign: 'right' }}>
                      <button
                        className="button"
                        onClick={() =>
                          setHistoryEdit({
                            id: history.id,
                            syncHeight: String(history.syncHeight),
                            endHeight: String(history.endHeight ?? ''),
                            saveEvents: history.saveEvents,
                          })
                        }
                      >
                        Update
                      </button>
                      <button
                        className="button button-outline"
                        onClick={() => onDeleteHistory(history.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6}>Loading...</td>
              </tr>
            )}
          </tbody>
        </table>
        <Pagination
          count={historiesCount}
          limit={historiesLimit}
          page={historiesPage}
          onPrev={setHistoriesPage}
          onNext={setHistoriesPage}
        />
        <div>
          <button
            onClick={() =>
              setHistoryEdit({ id: null, syncHeight: '0', endHeight: '', saveEvents: false })
            }
          >
            Add
          </button>
        </div>
      </div>
      <Modal
        size="tiny"
        header={<h3>Update history sync</h3>}
        isVisible={historyEdit !== null}
        onClose={() => setHistoryEdit(null)}
      >
        {historyEdit === null || (
          <div>
            <div>
              <label htmlFor="historical-height-start">Height start</label>
              <div>
                <input
                  id="historical-height-start"
                  type="input"
                  value={historyEdit.syncHeight}
                  onChange={(e) => setHistoryEdit({ ...historyEdit, syncHeight: e.target.value })}
                />
              </div>
              <label htmlFor="historical-height-end">Height end</label>
              <div>
                <input
                  id="historical-height-end"
                  type="input"
                  value={historyEdit.endHeight}
                  onChange={(e) => setHistoryEdit({ ...historyEdit, endHeight: e.target.value })}
                />
              </div>
              <label htmlFor="historical-save-events">Save events</label>
              <div>
                <input
                  id="historical-save-events"
                  type="checkbox"
                  checked={historyEdit.saveEvents}
                  onChange={(e) => setHistoryEdit({ ...historyEdit, saveEvents: e.target.checked })}
                />
              </div>
            </div>
            <button onClick={onSaveHistory}>Save</button>
          </div>
        )}
      </Modal>
    </div>
  );
}
