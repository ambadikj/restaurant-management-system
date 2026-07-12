import { useState, useEffect, useCallback } from 'react';
import axiosInstance from '../api/axiosInstance';
import axios from 'axios';

// TypeScript interfaces for our data
interface Role {
  id: number;
  name: string;
}

interface User {
  id: number;
  fullName: string;
  username: string;
  email: string;
  isActive: boolean;
  role: { name: string };
}

export default function Employees() {
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [error, setError] = useState('');
  
  // Form State
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [roleId, setRoleId] = useState('');

  // Wrapped in useCallback so it's only created once and safe to use in useEffect
  const fetchData = useCallback(async () => {
    try {
      const [usersRes, rolesRes] = await Promise.all([
        axiosInstance.get('/users'),
        axiosInstance.get('/users/roles')
      ]);
      setUsers(usersRes.data);
      setRoles(rolesRes.data);
      if (rolesRes.data.length > 0) {
        setRoleId(rolesRes.data[0].id.toString()); // Set default role dropdown
      }
    } catch { 
      setError('Failed to load data.');
    }
  }, []); 

  // Fetch users and roles when the page loads
  useEffect(() => {
    // FIX 5: Wrapped in an async function to prevent the synchronous setState linter warning
    const loadInitialData = async () => {
      await fetchData();
    };
    
    loadInitialData();
  }, [fetchData]); 

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await axiosInstance.post('/users', {
        fullName, username, email, password, roleId: Number(roleId)
      });
      // Clear form
      setFullName(''); setUsername(''); setEmail(''); setPassword('');
      // Refresh table
      fetchData();
    } catch (err: unknown) { 
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.message || 'Error creating user');
      } else {
        setError('An unexpected error occurred');
      }
    }
  };

  const toggleStatus = async (id: number) => {
    try {
      await axiosInstance.patch(`/users/${id}/status`);
      fetchData(); // Refresh table to show updated status
    } catch (err: unknown) { 
      if (axios.isAxiosError(err)) {
        alert(err.response?.data?.message || 'Error updating status');
      } else {
        alert('An unexpected error occurred');
      }
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold mb-8 text-gray-800">Employee Management</h1>
      
      {error && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">{error}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Add User Form */}
        <div className="bg-white p-6 rounded-lg shadow-md h-fit">
          <h2 className="text-xl font-semibold mb-4">Add New Employee</h2>
          <form onSubmit={handleAddUser} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Full Name</label>
              <input type="text" required value={fullName} onChange={e => setFullName(e.target.value)}
                className="w-full mt-1 border rounded px-3 py-2 focus:ring-blue-500 focus:border-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Username</label>
              <input type="text" required value={username} onChange={e => setUsername(e.target.value)}
                className="w-full mt-1 border rounded px-3 py-2 focus:ring-blue-500 focus:border-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Email</label>
              <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
                className="w-full mt-1 border rounded px-3 py-2 focus:ring-blue-500 focus:border-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Password</label>
              <input type="password" required value={password} onChange={e => setPassword(e.target.value)}
                className="w-full mt-1 border rounded px-3 py-2 focus:ring-blue-500 focus:border-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Role</label>
              <select value={roleId} onChange={e => setRoleId(e.target.value)}
                className="w-full mt-1 border rounded px-3 py-2 focus:ring-blue-500 focus:border-blue-500">
                {roles.map(role => (
                  <option key={role.id} value={role.id}>{role.name}</option>
                ))}
              </select>
            </div>
            <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700">
              Create Employee
            </button>
          </form>
        </div>

        {/* Right Column: Employee Table */}
        <div className="lg:col-span-2 bg-white rounded-lg shadow-md overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="p-4 font-medium text-gray-600">Name</th>
                <th className="p-4 font-medium text-gray-600">Username</th>
                <th className="p-4 font-medium text-gray-600">Role</th>
                <th className="p-4 font-medium text-gray-600">Status</th>
                <th className="p-4 font-medium text-gray-600">Action</th>
              </tr>
            </thead>
            <tbody>
              {users.map(user => (
                <tr key={user.id} className="border-b hover:bg-gray-50">
                  <td className="p-4">{user.fullName}</td>
                  <td className="p-4">{user.username}</td>
                  <td className="p-4">
                    <span className="bg-gray-200 text-gray-800 text-xs px-2 py-1 rounded-full">
                      {user.role.name}
                    </span>
                  </td>
                  <td className="p-4">
                    <span className={`text-xs px-2 py-1 rounded-full text-white ${user.isActive ? 'bg-green-500' : 'bg-red-500'}`}>
                      {user.isActive ? 'Active' : 'Disabled'}
                    </span>
                  </td>
                  <td className="p-4">
                    <button 
                      onClick={() => toggleStatus(user.id)}
                      className={`text-sm px-3 py-1 rounded ${user.isActive ? 'bg-red-100 text-red-600 hover:bg-red-200' : 'bg-green-100 text-green-600 hover:bg-green-200'}`}
                    >
                      {user.isActive ? 'Disable' : 'Enable'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      </div>
    </div>
  );
}