import React from 'react';

interface Column {
  header: string;
  key: string;
}

interface TableProps {
  columns: Column[];
  data?: any[];
  emptyMessage?: string;
}

export const Table: React.FC<TableProps> = ({ columns, data = [], emptyMessage = 'No data available' }) => {
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #ccc' }}>
      <thead>
        <tr style={{ backgroundColor: '#f5f5f5' }}>
          {columns.map(col => (
            <th key={col.key} style={{ padding: '8px', border: '1px solid #ccc', textAlign: 'left' }}>
              {col.header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {data.length === 0 ? (
          <tr>
            <td colSpan={columns.length} style={{ padding: '16px', textAlign: 'center', color: '#999' }}>
              {emptyMessage}
            </td>
          </tr>
        ) : (
          data.map((row, idx) => (
            <tr key={idx}>
              {columns.map(col => (
                <td key={col.key} style={{ padding: '8px', border: '1px solid #ccc' }}>
                  {row[col.key] || '-'}
                </td>
              ))}
            </tr>
          ))
        )}
      </tbody>
    </table>
  );
};
