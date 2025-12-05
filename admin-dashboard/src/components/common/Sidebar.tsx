import React from 'react';
import { Link, useLocation } from 'react-router-dom';

export const Sidebar: React.FC = () => {
  const location = useLocation();

  const menuItems = [
    { path: '/', label: 'Dashboard' },
    { path: '/employees', label: 'Employees' },
    { path: '/attendance', label: 'Attendance' },
    { path: '/reports', label: 'Reports' },
    { path: '/devices', label: 'Devices' },
  ];

  return (
    <nav style={{
      width: '200px',
      backgroundColor: '#2c3e50',
      color: 'white',
      padding: '16px',
      minHeight: '100vh'
    }}>
      <h2 style={{ marginBottom: '24px' }}>KS Attendance</h2>
      <ul style={{ listStyle: 'none', padding: 0 }}>
        {menuItems.map(item => {
          const isActive = location.pathname === item.path;
          return (
            <li key={item.path} style={{ marginBottom: '8px' }}>
              <Link
                to={item.path}
                style={{
                  color: 'white',
                  textDecoration: 'none',
                  display: 'block',
                  padding: '8px',
                  backgroundColor: isActive ? '#34495e' : 'transparent',
                  borderRadius: '4px'
                }}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
};
