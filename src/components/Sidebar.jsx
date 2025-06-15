// // src/components/Sidebar.jsx
// import React from 'react'
// import { Link, useNavigate, useLocation } from 'react-router-dom'
// import { supabase } from '../lib/supabaseClient'
// import { FiHome, FiGrid, FiUser, FiLogOut } from 'react-icons/fi'
// import { useAuth } from '../hooks/useAuth'
// import { toast } from 'react-hot-toast'

// const Sidebar = () => {
//   const navigate = useNavigate()
//   const location = useLocation()
//   const { user } = useAuth()

//   const handleLogout = async () => {
//     const { error } = await supabase.auth.signOut()
//     if (!error) {
//       toast.success('Logged out successfully.')
//       navigate('/login')
//       window.location.reload()
//     } else {
//       toast.error('Logout failed. Try again.')
//     }
//   }

//   if (!user) return null

//   const activeClass = "text-indigo-400"
//   const normalClass = "text-gray-400 hover:text-indigo-200 transition"

//   return (
//     <div className="w-20 h-screen bg-gray-100 text-gray-900 flex flex-col justify-between items-center py-6 shadow-md">
//       <div className="flex flex-col gap-10">
//         <Link to="/" className={location.pathname === "/" ? activeClass : normalClass}>
//           <FiHome size={24} />
//         </Link>
//         <Link to="/dashboard" className={location.pathname === "/dashboard" ? activeClass : normalClass}>
//           <FiGrid size={24} />
//         </Link>
//         <Link to="/patients" className={location.pathname === "/patients" ? activeClass : normalClass}>
//           <FiUser size={24} />
//         </Link>
//         <Link to="/profile" className={location.pathname === "/profile" ? activeClass : normalClass}>
//         <FiUser size={24} />
//         </Link>

//       </div>

//       <button
//         onClick={handleLogout}
//         className="text-gray-400 hover:text-red-400 transition"
//       >
//         <FiLogOut size={24} />
//       </button>
//     </div>
//   )
// }

// export default Sidebar

import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { FiHome, FiGrid, FiUsers, FiUser, FiLogOut } from 'react-icons/fi';
import { toast } from 'react-hot-toast';

import { useAuth } from '../hooks/useAuth';
import { logout } from '../services/auth';     // ← centralised helper
import { logger } from '../lib/logger';

const navItems = [
  { path: '/',          icon: FiHome,  key: 'home'      },
  { path: '/dashboard', icon: FiGrid,  key: 'dashboard' },
  { path: '/patients',  icon: FiUsers, key: 'patients'  },
  { path: '/profile',   icon: FiUser,  key: 'profile'   },
];

const Sidebar = () => {
  const { user }   = useAuth();
  const navigate   = useNavigate();
  const location   = useLocation();
  const [busy, setBusy] = useState(false);

  /* ------------------------------ handlers ------------------------------ */
  const handleLogout = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await logout();
      toast.success('Logged out successfully.');
      navigate('/login', { replace: true });
      // No full reload needed – auth listener will clear state/query cache
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  /* ------------------------------ guards ------------------------------- */
  if (!user) return null;            // Hide while auth is unknown / guest

  /* ------------------------------ styles ------------------------------- */
  const cls = (path) =>
    location.pathname === path
      ? 'text-indigo-400'
      : 'text-gray-400 hover:text-indigo-200 transition';

  /* ------------------------------ render ------------------------------- */
  return (
    <aside className="w-20 h-screen bg-gray-100 text-gray-900 flex flex-col justify-between items-center py-6 shadow-md">
      <nav className="flex flex-col gap-10">
        {navItems.map(({ path, icon: Icon, key }) => (
          <Link key={key} to={path} className={cls(path)}>
            <Icon size={24} />
          </Link>
        ))}
      </nav>

      <button
        onClick={handleLogout}
        disabled={busy}
        title="Log out"
        className="text-gray-400 hover:text-red-400 transition disabled:opacity-50"
      >
        <FiLogOut size={24} />
      </button>
    </aside>
  );
};

export default Sidebar;