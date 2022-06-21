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

interface EventListenerState {
  id?: string;
  name: string;
}

type EventListenerAction =
  | { type: 'setName'; value: string }
  | { type: 'setSyncHeight'; value: number };

function EventListenerForm(props: {
  contract: Contract;
  state: EventListenerState;
  error: string;
  onSave: (eventListenerState: EventListenerState) => any;
}) {
  const events = (props.contract.abi ?? [])
    .filter(({ type }) => type === 'event')
    .map(({ name }) => name);
  const [eventListenerState, eventListenerDispatcher] = useReducer(
    (state: EventListenerState, action: EventListenerAction) => {
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
  const [eventListenerForm, setEventListenerForm] = useState<EventListenerState | null>(null);
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

  const onSave = async (state: EventListenerState) => {
    if (contract === null || contract instanceof Error) return;

    setAddModalError('');
    try {
      if (state.id !== undefined) {
        await updateEventListener(contract.id, state.id, state.name);
      } else {
        await createEventListener(contract.id, state.name);
      }
      setEventListenerForm(null);
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
                onUpdate={(eventListener) => setEventListenerForm(eventListener)}
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
              setEventListenerForm({
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
        <Modal
          header={<h3>Add event listener</h3>}
          isVisible={eventListenerForm !== null}
          onClose={() => setEventListenerForm(null)}
        >
          {eventListenerForm === null || (
            <EventListenerForm
              contract={contract}
              state={eventListenerForm}
              onSave={onSave}
              error={addModalError}
            />
          )}
        </Modal>
      )}
    </div>
  );
}
