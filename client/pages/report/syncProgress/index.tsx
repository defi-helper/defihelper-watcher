import React, { useState, useEffect } from 'react';
import { SyncProgressNetwork, syncProgressReport, SyncProgressReport } from '../../../api';

function Progress({ report: { blockNumber, progress } }: { report: SyncProgressNetwork }) {
  const minPercent = Math.floor((progress.min / blockNumber) * 100);
  const maxPercent = Math.floor((progress.max / blockNumber) * 100);
  return (
    <div>
      <div className="row">
        <div className="column">
          min: {progress.min}/{blockNumber} ({minPercent}%)
        </div>
        <div className="column">
          <div className="progress">
            <span
              className={minPercent > 90 ? 'blue' : 'red'}
              style={{
                width: `${minPercent}%`,
              }}
            ></span>
          </div>
        </div>
      </div>
      <div className="row">
        <div className="column">
          max: {progress.min}/{blockNumber} ({maxPercent}%)
        </div>
        <div className="column">
          <div className="progress">
            <span
              className={maxPercent > 90 ? 'blue' : 'red'}
              style={{
                width: `${maxPercent}%`,
              }}
            ></span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function SyncProgress() {
  const [report, setReport] = useState<SyncProgressReport | null>(null);

  useEffect(() => {
    syncProgressReport().then((report) => setReport(report));
  }, []);

  return (
    <div className="container">
      <div>
        <a href="/">Main</a>
      </div>
      <div>
        <h3>Sync progress:</h3>
        <table>
          <thead>
            <tr>
              <th>Network</th>
              <th>Contracts count</th>
              <th>Listeners count</th>
              <th>Progress</th>
            </tr>
          </thead>
          <tbody>
            {report !== null ? (
              report.map((report) => (
                <tr>
                  <td style={{ width: '10%' }}>
                    <a href={`/report/sync-progress/${report.network}`}>{report.network}</a>
                  </td>
                  <td style={{ width: '10%' }}>{report.contractsCount}</td>
                  <td style={{ width: '10%' }}>{report.listenersCount}</td>
                  <td style={{ width: '70%' }}>
                    <Progress report={report} />
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4}>Loading...</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
