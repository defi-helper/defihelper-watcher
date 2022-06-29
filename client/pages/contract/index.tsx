import { Pagination } from '../../components/pagination';
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
} from '../../api';
import { Modal } from '../../components/modal';

interface EventListenerCreateState {
  name: string;
}

type EventListenerAction = { type: 'setName'; value: string };

type OnCreateListener = (eventListenerState: EventListenerCreateState) => any;

function EventListenerCreateForm(props: {
  contract: Contract;
  state: EventListenerCreateState;
  error: string;
  onSave: OnCreateListener;
}) {
  const events = (props.contract.abi ?? [])
    .filter(({ type }) => type === 'event')
    .map(({ name }) => name);
  const [eventListenerState, eventListenerDispatcher] = useReducer(
    (state: EventListenerCreateState, action: EventListenerAction) => {
      switch (action.type) {
        case 'setName':
          return { ...state, name: action.value };
        default:
          return state;
      }
    },
    props.state,
  );

  return (
    <form action="#">
      <fieldset>
        <label htmlFor="listener-name">Name</label>
        <select
          id="listener-name"
          value={eventListenerState.name}
          onChange={(e) =>
            eventListenerDispatcher({
              type: 'setName',
              value: e.target.value,
            })
          }
        >
          {events.map((event) => (
            <option key={event} value={event}>
              {event}
            </option>
          ))}
        </select>
        <div style={{ color: 'red' }}>{props.error}</div>
        <button onClick={() => props.onSave(eventListenerState)}>Save</button>
      </fieldset>
    </form>
  );
}

type OnUpdateListener = (
  eventListener: EventListener,
  config: Parameters<typeof updateEventListener>[2],
) => any;

function EventListenerUpdateForm(props: {
  contract: Contract;
  state: EventListener;
  error: string;
  onSave: OnUpdateListener;
}) {
  const [promptly, setPromptly] = useState<boolean>(props.state.promptlyId !== null);
  const [historical, setHistorical] = useState<boolean>(props.state.historicalId !== null);
  const [syncHeight, setSyncHeight] = useState<number>(
    props.state.historicalId !== null ? props.state.sync.syncHeight : 0,
  );
  const [saveEvents, setSaveEvents] = useState<boolean>(
    props.state.historicalId !== null ? props.state.sync.saveEvents : false,
  );

  return (
    <form action="#">
      <fieldset>
        <div>
          <label htmlFor="listener-name">Name</label>
          <div>{props.state.name}</div>
        </div>
        <div>
          <label htmlFor="listener-name">Promptly sync</label>
          <div>
            <input
              type="checkbox"
              checked={promptly}
              onChange={(e) => setPromptly(e.target.checked)}
            />
          </div>
        </div>
        <div>
          <label htmlFor="listener-name">Historical sync</label>
          <div>
            <input
              type="checkbox"
              checked={historical}
              onChange={(e) => setHistorical(e.target.checked)}
            />
          </div>
        </div>
        {historical && (
          <div>
            <label htmlFor="listener-name">Sync height</label>
            <div>
              <input
                type="input"
                value={String(syncHeight)}
                onChange={(e) => setSyncHeight(Number(e.target.value))}
              />
            </div>
            <label htmlFor="listener-name">Save events</label>
            <div>
              <input
                type="checkbox"
                checked={saveEvents}
                onChange={(e) => setSaveEvents(e.target.checked)}
              />
            </div>
          </div>
        )}
        <div style={{ color: 'red' }}>{props.error}</div>
        <button
          onClick={() =>
            props.onSave(props.state, {
              promptly: promptly ? {} : null,
              historical: historical ? { syncHeight, saveEvents } : null,
            })
          }
        >
          Save
        </button>
      </fieldset>
    </form>
  );
}

function EventListenerComponent({
  contract,
  eventListener,
  onUpdate,
  onDelete,
}: {
  contract: Contract;
  eventListener: EventListener;
  onUpdate: (listener: EventListener) => any;
  onDelete: (listener: EventListener) => any;
}) {
  const { sync } = eventListener;
  return (
    <tr>
      <td>
        <a href={`/contract/${contract.id}/event-listener/${eventListener.id}`}>
          {eventListener.name}
        </a>
      </td>
      <td>
        <div className="progress">
          <span
            className={sync.progress >= 90 ? 'green' : 'red'}
            style={{
              width: `${sync.progress}%`,
            }}
          ></span>
        </div>
        <div>
          {sync.syncHeight}/{sync.currentBlock}
        </div>
      </td>
      <td>
        <div style={{ textAlign: 'right' }}>
          <button className="button" onClick={() => onUpdate(eventListener)}>
            Update
          </button>
          <button className="button button-outline" onClick={() => onDelete(eventListener)}>
            Delete
          </button>
        </div>
      </td>
    </tr>
  );
}

export interface Props {
  contractId: string;
}

export function ContractPage({ contractId }: Props) {
  const [name, setName] = useState<string>('0');
  const [contract, setContract] = useState<Contract | Error | null>(null);
  const eventListenersLimit = 10;
  const [eventListenersPage, setEventListenersPage] = useState<number>(1);
  const [eventListeners, setEventListeners] = useState<EventListener[]>([]);
  const [eventListenersCount, setEventListenersCount] = useState<number>(0);
  const [eventListenerCreateForm, setEventListenerCreateForm] =
    useState<EventListenerCreateState | null>(null);
  const [eventListenerUpdateForm, setEventListenerUpdateForm] = useState<EventListener | null>(
    null,
  );
  const [addModalError, setAddModalError] = useState<string>('');

  const onReloadEventListenerList = () => {
    const filter = {
      name: name !== '0' ? name : undefined,
    };
    getEventListenerList(
      contractId,
      filter,
      eventListenersLimit,
      (eventListenersPage - 1) * eventListenersLimit,
    ).then(setEventListeners);
    getEventListenerCount(contractId, filter).then(setEventListenersCount);
  };

  const onDelete = async (eventListener: EventListener) => {
    if (contract === null || contract instanceof Error) return;
    if (!confirm('Are you sure?')) return;

    await deleteEventListener(contract.id, eventListener.id);
    onReloadEventListenerList();
  };

  const onCreate = async (state: EventListenerCreateState) => {
    if (contract === null || contract instanceof Error) return;

    setAddModalError('');
    try {
      await createEventListener(contract.id, state.name);
      setEventListenerCreateForm(null);
      onReloadEventListenerList();
    } catch (e: any) {
      setAddModalError(e.response.data);
    }
  };

  const onUpdate: OnUpdateListener = async (listener, config) => {
    if (contract === null || contract instanceof Error) return;

    setAddModalError('');
    try {
      await updateEventListener(contract.id, listener.id, config);
      setEventListenerUpdateForm(null);
      onReloadEventListenerList();
    } catch (e: any) {
      setAddModalError(e.response.data);
    }
  };

  useEffect(() => {
    getContract(contractId)
      .then((contract) => {
        setContract(contract);
        onReloadEventListenerList();
      })
      .catch(() => setContract(new Error('Contract not found')));
  }, []);

  useEffect(() => {
    if (contract === null || contract instanceof Error) return;
    onReloadEventListenerList();
  }, [eventListenersPage, name]);

  if (contract === null) {
    return <div className="container">Loading...</div>;
  }
  if (contract instanceof Error) {
    return <div className="container">{contract.message}</div>;
  }

  const eventNames = (contract.abi ?? [])
    .filter(({ type }) => type === 'event')
    .map(({ name }) => name);

  return (
    <div className="container">
      <div>
        <a href="/">Main</a>
      </div>
      <div>
        <h3>
          Listeners of {contract.name} at network {contract.network}
        </h3>
        <div className="row">
          <div className="column">
            <select onChange={(e) => setName(e.target.value)} value={name}>
              <option value="">All</option>
              {eventNames.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Progress</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {eventListeners.map((eventListener) => (
              <EventListenerComponent
                eventListener={eventListener}
                contract={contract}
                key={eventListener.id}
                onUpdate={(eventListener) => setEventListenerUpdateForm(eventListener)}
                onDelete={onDelete}
              />
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
        <div>
          <button
            onClick={() =>
              setEventListenerCreateForm({
                name: (
                  (contract.abi ?? []).find(({ type }) => type === 'event') ?? {
                    name: '',
                  }
                ).name,
              })
            }
          >
            Add
          </button>
        </div>
      </div>
      {!contract || (
        <div>
          <Modal
            header={<h3>Add event listener</h3>}
            isVisible={eventListenerCreateForm !== null}
            onClose={() => setEventListenerCreateForm(null)}
          >
            {eventListenerCreateForm === null || (
              <EventListenerCreateForm
                contract={contract}
                state={eventListenerCreateForm}
                onSave={onCreate}
                error={addModalError}
              />
            )}
          </Modal>
          <Modal
            header={<h3>Update event listener</h3>}
            isVisible={eventListenerUpdateForm !== null}
            onClose={() => setEventListenerUpdateForm(null)}
          >
            {eventListenerUpdateForm === null || (
              <EventListenerUpdateForm
                contract={contract}
                state={eventListenerUpdateForm}
                onSave={onUpdate}
                error={addModalError}
              />
            )}
          </Modal>
        </div>
      )}
    </div>
  );
}
