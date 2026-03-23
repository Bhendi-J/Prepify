import React, { useContext } from 'react';
import { NavLink } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

function Navbar() {
  const { currentUser, logout } = useContext(AuthContext);

  return (
    <nav className="navbar">
      <NavLink to="/" className="brand">Prepify</NavLink>
      <div className="nav-links">
        {currentUser ? (
          <>
            <NavLink to="/" className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')} end>Dashboard</NavLink>
            <NavLink to="/library" className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>My Library</NavLink>
            <NavLink to="/account" className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>Account</NavLink>
            <button onClick={logout} className="btn btn-ghost" style={{marginLeft: '15px'}}>Logout</button>
          </>
        ) : (
          <>
            <NavLink to="/login" className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>Login</NavLink>
            <NavLink to="/register" className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>Register</NavLink>
          </>
        )}
      </div>
    </nav>
  );
}

export default Navbar;