import React, { useContext } from 'react'; 
import { NavLink, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext'; 

function Navbar() {
  const { currentUser, logout } = useContext(AuthContext); 

  return (
    <nav className="navbar">
      <Link to="/" className="brand">Prepify</Link>
      
      <div className="nav-links">
        {currentUser ? (
          <>
            <NavLink to="/" className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')} end>Home</NavLink>
            <NavLink to="/notes" className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>My Notes</NavLink>
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