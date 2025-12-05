import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { authService } from '../services/AuthService';
import type { UserRole } from '../types/auth';

export function useRole() {
  const { user } = useAuth();
  const [role, setRole] = useState<UserRole | undefined>(user?.role);

  useEffect(() => {
    (async () => {
      if (user?.role) {
        setRole(user.role);
        return;
      }
      try {
        const u = await authService.getCurrentUser();
        setRole(u.role);
      } catch {}
    })();
  }, [user?.role]);

  return useMemo(() => ({ role: role || 'EMP' as UserRole }), [role]);
}
