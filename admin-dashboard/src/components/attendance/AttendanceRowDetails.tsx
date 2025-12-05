import React from 'react';
import type { AttendanceEvent } from '../../types/attendance';

interface AttendanceRowDetailsProps {
  event: AttendanceEvent;
}

export const AttendanceRowDetails: React.FC<AttendanceRowDetailsProps> = ({ event }) => {
  return (
    <div style={{ padding: '16px', backgroundColor: '#fafafa', border: '1px solid #e0e0e0' }}>
      <h4 style={{ marginTop: 0 }}>Event Details</h4>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        {/* Biometric Data */}
        <div>
          <h5>Biometric Verification</h5>
          <table style={{ width: '100%', fontSize: '14px' }}>
            <tbody>
              {event.F3 !== undefined && (
                <tr>
                  <td style={{ padding: '4px', fontWeight: 'bold' }}>Face Match Score (F3):</td>
                  <td style={{ padding: '4px' }}>
                    <span style={{ color: event.F3 >= 0.8 ? 'green' : event.F3 >= 0.6 ? 'orange' : 'red' }}>
                      {event.F3.toFixed(3)}
                    </span>
                  </td>
                </tr>
              )}
              {event.FP2 !== undefined && (
                <tr>
                  <td style={{ padding: '4px', fontWeight: 'bold' }}>Fingerprint Score (FP2):</td>
                  <td style={{ padding: '4px' }}>
                    <span style={{ color: event.FP2 >= 0.8 ? 'green' : event.FP2 >= 0.6 ? 'orange' : 'red' }}>
                      {event.FP2.toFixed(3)}
                    </span>
                  </td>
                </tr>
              )}
              {event.F4 !== undefined && (
                <tr>
                  <td style={{ padding: '4px', fontWeight: 'bold' }}>Face Quality (F4):</td>
                  <td style={{ padding: '4px' }}>{event.F4.toFixed(3)}</td>
                </tr>
              )}
              {event.L2 !== undefined && (
                <tr>
                  <td style={{ padding: '4px', fontWeight: 'bold' }}>Liveness Score (L2):</td>
                  <td style={{ padding: '4px' }}>{event.L2.toFixed(3)}</td>
                </tr>
              )}
              {event.S2 !== undefined && (
                <tr>
                  <td style={{ padding: '4px', fontWeight: 'bold' }}>Quality Score (S2):</td>
                  <td style={{ padding: '4px' }}>{event.S2.toFixed(3)}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Break Data */}
        <div>
          <h5>Break Information</h5>
          {event.B1 || event.B2 !== undefined || event.B3 !== undefined ? (
            <table style={{ width: '100%', fontSize: '14px' }}>
              <tbody>
                {event.B1 && (
                  <tr>
                    <td style={{ padding: '4px', fontWeight: 'bold' }}>Break Type (B1):</td>
                    <td style={{ padding: '4px' }}>{event.B1}</td>
                  </tr>
                )}
                {event.B2 !== undefined && (
                  <tr>
                    <td style={{ padding: '4px', fontWeight: 'bold' }}>Duration (B2):</td>
                    <td style={{ padding: '4px' }}>{event.B2} minutes</td>
                  </tr>
                )}
                {event.B3 !== undefined && (
                  <tr>
                    <td style={{ padding: '4px', fontWeight: 'bold' }}>Over Break (B3):</td>
                    <td style={{ padding: '4px' }}>
                      <span style={{ color: event.B3 ? 'red' : 'green' }}>
                        {event.B3 ? 'Yes' : 'No'}
                      </span>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          ) : (
            <p style={{ fontSize: '14px', color: '#999' }}>No break data</p>
          )}
        </div>
      </div>

      {/* Device Metadata */}
      <div style={{ marginTop: '16px' }}>
        <h5>Device & Location</h5>
        <table style={{ width: '100%', fontSize: '14px' }}>
          <tbody>
            <tr>
              <td style={{ padding: '4px', fontWeight: 'bold' }}>Device ID (D1):</td>
              <td style={{ padding: '4px' }}>{event.D1}</td>
            </tr>
            {event.D2 && (
              <tr>
                <td style={{ padding: '4px', fontWeight: 'bold' }}>Device Type (D2):</td>
                <td style={{ padding: '4px' }}>{event.D2}</td>
              </tr>
            )}
            {event.L1 && (
              <tr>
                <td style={{ padding: '4px', fontWeight: 'bold' }}>Location (L1):</td>
                <td style={{ padding: '4px' }}>{event.L1}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Metadata */}
      {event.M1 && (
        <div style={{ marginTop: '16px' }}>
          <h5>Additional Metadata (M1)</h5>
          <pre style={{ 
            fontSize: '12px', 
            backgroundColor: '#f0f0f0', 
            padding: '8px', 
            borderRadius: '4px',
            overflow: 'auto',
            maxHeight: '100px'
          }}>
            {event.M1}
          </pre>
        </div>
      )}

      {/* Raw TOON Payload */}
      {event.RAW_TOON && (
        <div style={{ marginTop: '16px' }}>
          <h5>Raw TOON Payload</h5>
          <pre style={{ 
            fontSize: '11px', 
            backgroundColor: '#f0f0f0', 
            padding: '8px', 
            borderRadius: '4px',
            overflow: 'auto',
            maxHeight: '150px',
            fontFamily: 'monospace'
          }}>
            {event.RAW_TOON}
          </pre>
        </div>
      )}
    </div>
  );
};
