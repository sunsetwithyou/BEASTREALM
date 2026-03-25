// src/App.jsx
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import SignUp from './auth/SignUp';
import Login from './auth/Login';
import Game from './components/Game';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      setIsAuthenticated(true);
    }
  }, []);

  return (
    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <div className="App">
        <Routes>
          {!isAuthenticated ? (
            <>
              <Route path="/login" element={<Login setIsAuthenticated={setIsAuthenticated} />} />
              <Route path="/signup" element={<SignUp setIsAuthenticated={setIsAuthenticated} />} />
              <Route path="*" element={<Navigate to="/login" replace />} />
            </>
          ) : (
            <>
              <Route path="/game" element={<Game />} />
              <Route path="*" element={<Navigate to="/game" replace />} />
            </>
          )}
        </Routes>
      </div>
    </Router>
  );
}

export default App;
