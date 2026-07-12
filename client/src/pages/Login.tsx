import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      const response = await axios.post('http://localhost:5000/api/auth/login', {
        username,
        password,
      });

      // 1. Save the JWT and user data to local storage
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));

      // 2. Redirect to the admin dashboard
      navigate('/admin');
    } catch (err: unknown) {
      // Type-safe error handling
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.message || 'Something went wrong. Please try again.');
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Something went wrong. Please try again.');
      }
    }
  };

  return (
    // 1. Background color
    <div className="min-h-screen flex items-center justify-center bg-gray-700 p-4 font-sans">
      
      {/* 2. Center Landscape rectangular card: Decreased h-[520px] to h-[400px] */}
      <div className="w-full max-w-4xl h-[400px] bg-gray-900 rounded-[2rem] p-12 shadow-2xl flex flex-col md:flex-row">
        
        {/* 3. Left side container */}
        <div className="w-full md:w-1/2 flex flex-col justify-center h-full pl-4 items-start">
          
          {/* 4. Left top: SVG Logo */}
          <div className="mb-4 text-white">
            <svg 
              className="w-10 h-10 text-white" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>

          {/* 5. Under logo: login in white bold text */}
          <h1 className="text-4xl font-bold text-white mb-1">
            Sign in
          </h1>

          {/* 6. Under text: project name */}
          <h2 className="text-gray-400 text-sm tracking-widest uppercase mb-6">
            Restaurant Management & POS System
          </h2>
        </div>

        {/* Right side container - Holds the form */}
        <div className="w-full md:w-1/2 flex flex-col justify-center items-center md:items-end h-full md:pr-4 mt-8 md:mt-0">
          
          {/* Error Feedback message */}
          {error && (
            <div className="w-full max-w-sm mb-4 rounded-lg bg-red-500/10 border border-red-500/30 p-3 text-sm text-red-400">
              {error}
            </div>
          )}

          {/* 7. Two input boxes one after other & a login button under them */}
          <form onSubmit={handleLogin} className="flex flex-col gap-4 w-full max-w-sm">
            <input
              type="text"
              placeholder="Name"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              className="w-full px-4 py-3 bg-gray-800 text-white border border-gray-700 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 transition-all placeholder-gray-500"
            />
            
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-3 bg-gray-800 text-white border border-gray-700 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 transition-all placeholder-gray-500"
            />
            
            <button
              type="submit"
              className="w-full mt-4 bg-white text-gray-900 hover:bg-gray-200 font-bold py-3 px-4 rounded-lg transition-colors shadow-md"
            >
              Sign in
            </button>
          </form>

        </div>
      </div>
    </div>
  );
}