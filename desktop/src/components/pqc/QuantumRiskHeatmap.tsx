import React from 'react';
import type { CryptoComponent } from '../../types/pqc';

type Exposure = 'resistant' | 'review' | 'shor';

const families = [
  { key: 'RSA', matches: (name: string) => /\brsa\b/i.test(name) },
  { key: 'ECC', matches: (name: string) => /\b(?:ecdh|ecdsa|ed25519|curve25519)\b/i.test(name) },
  { key: 'DH', matches: (name: string) => /diffie[ -]?hellman/i.test(name) },
  { key: 'TLS', matches: (_name: string, item: CryptoComponent) => /\btls\b/i.test(`${item.usage} ${item.purpose ?? ''}`) },
  { key: 'AES', matches: (name: string) => /\baes\b/i.test(name) },
  { key: 'Hashes', matches: (name: string) => /\b(?:sha\d*|sha-\d+|hmac|pbkdf2|hkdf)\b/i.test(name) },
];

const exposures: { key: Exposure; title: string; className: string }[] = [
  { key: 'resistant', title: 'Quantum resistant', className: 'heatmap-resistant' },
  { key: 'review', title: 'Review / hybrid', className: 'heatmap-review' },
  { key: 'shor', title: 'Shor vulnerable', className: 'heatmap-shor' },
];

function getExposure(item: CryptoComponent): Exposure {
  if (item.quantumVulnerable) return 'shor';
  if (item.risk === 'MEDIUM') return 'review';
  return 'resistant';
}

export const QuantumRiskHeatmap: React.FC<{ data: CryptoComponent[] }> = ({ data }) => (
  <section className="quantum-risk-heatmap" aria-labelledby="quantum-risk-heatmap-title">
    <div className="quantum-risk-heading">
      <div>
        <span className="quantum-risk-kicker">EXPOSURE BY CRYPTOGRAPHIC FAMILY</span>
        <h2 id="quantum-risk-heatmap-title">Quantum Risk Heatmap</h2>
        <p>Classification is derived from each inventory item’s quantum vulnerability and risk fields.</p>
      </div>
      <div className="quantum-risk-legend" aria-label="Exposure classifications">
        {exposures.map((exposure) => (
          <span key={exposure.key} className={`quantum-risk-legend-item ${exposure.className}`}>
            <i aria-hidden="true" />{exposure.title}
          </span>
        ))}
      </div>
    </div>

    <div className="quantum-risk-grid" role="table" aria-label="Quantum exposure by cryptographic family">
      <div className="quantum-risk-row quantum-risk-header" role="row">
        <span role="columnheader">Family</span>
        {exposures.map((exposure) => <span key={exposure.key} role="columnheader">{exposure.title}</span>)}
      </div>
      {families.map((family) => {
        const items = data.filter((item) => family.matches(item.algorithm, item));
        return (
          <div className="quantum-risk-row" role="row" key={family.key}>
            <strong role="rowheader">{family.key}</strong>
            {exposures.map((exposure) => {
              const count = items.filter((item) => getExposure(item) === exposure.key).length;
              return (
                <span className={`quantum-risk-cell ${items.length ? exposure.className : 'heatmap-unavailable'}`} role="cell" key={exposure.key}>
                  {items.length ? <><i aria-hidden="true" />{count}</> : 'Unavailable'}
                </span>
              );
            })}
          </div>
        );
      })}
    </div>
    <p className="quantum-risk-footnote">Review / hybrid represents non-vulnerable assets with Medium risk. TLS includes assets whose recorded usage or purpose references TLS and may overlap a primitive family.</p>
  </section>
);

export default QuantumRiskHeatmap;
