import React, { useContext } from 'react'; // <-- Add useContext
import { Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext'; // <-- Import the context

function Navbar() {
  const { currentUser, logout } = useContext(AuthContext); // <-- Get user and logout function

  return (
    <nav className="site-header">
      <Link to="/">Prepify Home</Link>
      <div>
        {currentUser ? (
          // If a user is logged in, show Account and Logout
          <>
            <span style={{ marginRight: '15px' }}>Welcome, {currentUser.username}!</span>
            <Link to="/account">Account</Link>
            <button onClick={logout} className="btn">Logout</button>
          </>
        ) : (
          // If no user, show Login and Register
          <>
            <Link to="/login">Login</Link>
            <Link to="/register">Register</Link>
          </>
        )}
      </div>
    </nav>
  );
}

export default Navbar;