import React, { useState, useEffect, useReducer } from 'react';
import {
  Contract,
  createContract,
  deleteContract,
  getContractList,
  getCountractCount,
  updateContract,
} from '../../api';
import { useDebounce } from 'use-debounce';
import { Modal } from '../../components/modal';
import { NetworkSelector } from '../../components/network-selector';
import { Pagination } from '../../components/pagination';

const networks = {
  1: 'Ethereum',
  56: 'Binance Smart Chain',
  137: 'Polygon',
  1285: 'Moonriver',
  43114: 'Avalanche',
};

interface ContractState {
  id?: string;
  name: string;
  network: number;
  address: string;
  startHeight: number;
  abi: string;
}

type ContractAction =
  | { type: 'setName'; value: string }
  | { type: 'setNetwork'; value: number }
  | { type: 'setAddress'; value: string }
  | { type: 'setStartHeight'; value: number }
  | { type: 'setAbi'; value: string };

function ContractForm(props: {
  state: ContractState;
  error: string;
  onSave: (newContract: ContractState) => any;
}) {
  const [contractState, contractDispatcher] = useReducer(
    (state: ContractState, action: ContractAction) => {
      switch (action.type) {
        case 'setName':
          return { ...state, name: action.value };
        case 'setNetwork':
          return { ...state, network: action.value };
        case 'setAddress':
          return { ...state, address: action.value };
        case 'setStartHeight':
          return { ...state, startHeight: action.value };
        case 'setAbi':
          return { ...state, abi: action.value };
        default:
          return state;
      }
    },
    props.state,
  );

  return (
    <form action="#">
      <fieldset>
        <label htmlFor="contract-name">Name</label>
        <input
          id="contract-name"
          type="text"
          placeholder="Contract name..."
          value={contractState.name}
          onChange={(e) =>
            contractDispatcher({
              type: 'setName',
              value: e.target.value,
            })
          }
        />
        <label htmlFor="contract-network">Network</label>
        <NetworkSelector
          id="contract-network"
          value={contractState.network}
          onChange={(network) => contractDispatcher({ type: 'setNetwork', value: network })}
          options={networks}
        />
        <label htmlFor="contract-address">Address</label>
        <input
          id="contract-address"
          type="text"
          placeholder="Contract address..."
          value={contractState.address}
          onChange={(e) =>
            contractDispatcher({
              type: 'setAddress',
              value: e.target.value,
            })
          }
        />
        <label htmlFor="contract-height">Start height</label>
        <input
          id="contract-height"
          type="text"
          placeholder="Contract start height..."
          value={contractState.startHeight}
          onChange={(e) =>
            contractDispatcher({
              type: 'setStartHeight',
              value: parseInt(e.target.value, 10),
            })
          }
        />
        <label htmlFor="contract-abi">ABI</label>
        <textarea
          id="contract-abi"
          placeholder="Contract ABI..."
          value={contractState.abi}
          onChange={(e) => contractDispatcher({ type: 'setAbi', value: e.target.value })}
        ></textarea>
        <div style={{ color: 'red' }}>{props.error}</div>
        <button onClick={() => props.onSave(contractState)}>Save</button>
      </fieldset>
    </form>
  );
}

export function ContractListPage() {
  const [network, setNetwork] = useState<number>(0);
  const [address, setAddress] = useState<string>('');
  const [name, setName] = useState<string>('');
  const [addressDebounce] = useDebounce(address, 500);
  const [nameDebounce] = useDebounce(name, 500);
  const contractsLimit = 10;
  const [contractsPage, setContractsPage] = useState<number>(1);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [contractsCount, setContractsCount] = useState<number>(0);
  const [contractForm, setContractForm] = useState<ContractState | null>(null);
  const [addModalError, setAddModalError] = useState<string>('');

  const onReloadContractList = () => {
    const filter = {
      network: network !== 0 ? network : undefined,
      address: address !== '' ? address : undefined,
      name: name !== '' ? name : undefined,
    };
    getContractList(filter, contractsLimit, (contractsPage - 1) * contractsLimit).then(
      setContracts,
    );
    getCountractCount(filter).then(setContractsCount);
  };

  const onDelete = async (contract: Contract) => {
    if (!confirm('Are you sure?')) return;

    await deleteContract(contract.id);
    onReloadContractList();
  };

  const onSave = async (state: ContractState) => {
    setAddModalError('');
    try {
      if (state.id !== undefined) {
        await updateContract(
          state.id,
          state.name,
          state.network,
          state.address,
          state.startHeight,
          state.abi,
        );
      } else {
        await createContract(
          state.name,
          state.network,
          state.address,
          state.startHeight,
          state.abi,
        );
      }
      setContractForm(null);
      onReloadContractList();
    } catch (e) {
      setAddModalError(e.response.data);
    }
  };

  useEffect(() => {
    onReloadContractList();
  }, []);

  useEffect(() => {
    onReloadContractList();
  }, [contractsPage, network, addressDebounce, nameDebounce]);

  return (
    <div className="container">
      <div>
        <h3>Contracts:</h3>
        <div className="row">
          <div className="column">
            <NetworkSelector
              value={network}
              onChange={setNetwork}
              options={{
                0: 'All',
                ...networks,
              }}
            />
          </div>
          <div className="column">
            <input
              placeholder="address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
          </div>
          <div className="column">
            <input placeholder="search" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
        </div>
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Network</th>
              <th>Address</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {contracts.map((contract) => (
              <tr key={contract.id}>
                <td>
                  <a href={`/contract/${contract.id}`}>{contract.name}</a>
                </td>
                <td>
                  <a href="#" onClick={() => setNetwork(contract.network)}>
                    {contract.network}
                  </a>
                </td>
                <td>{contract.address}</td>
                <td>
                  <div>
                    <button
                      className="button"
                      onClick={() =>
                        setContractForm({
                          ...contract,
                          abi: JSON.stringify(contract.abi, null, 4),
                        })
                      }
                    >
                      Update
                    </button>
                    <button className="button button-outline" onClick={() => onDelete(contract)}>
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <Pagination
          count={contractsCount}
          limit={contractsLimit}
          page={contractsPage}
          onPrev={setContractsPage}
          onNext={setContractsPage}
        />
        <div className="row">
          <div className="column">
            <button
              onClick={() =>
                setContractForm({
                  name: '',
                  network: 1,
                  address: '',
                  startHeight: 0,
                  abi: '',
                })
              }
            >
              Add
            </button>
          </div>
          <div className="column" style={{ textAlign: 'right' }}>
            <a href="report/sync-progress">Progress</a>
          </div>
        </div>
      </div>
      <Modal
        header={<h3>Add contract</h3>}
        isVisible={contractForm !== null}
        onClose={() => setContractForm(null)}
      >
        {contractForm === null || (
          <ContractForm state={contractForm} onSave={onSave} error={addModalError} />
        )}
      </Modal>
    </div>
  );
}
