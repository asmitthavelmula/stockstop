import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import './Login.css'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const navigate = useNavigate()
 
  const validateEmail = (em) => {
    // basic email pattern
    return /^\S+@\S+\.\S+$/.test(em)
  }
 
  const handleSubmit = (e) => {
    e.preventDefault()
    if (!validateEmail(email)) {
      setError('Please enter a valid email address')
      return
    }
    if (!password) {
      setError('Password cannot be empty')
      return
    }
    // Dummy authentication success
    localStorage.setItem('stockkk_user', JSON.stringify({ email }))
    navigate('/')
  }
 
  return (
    <div className="login-page">
      <div className="login-bg" />
      <div className="login-card">
        <h2>Welcome to StockKK</h2>
        <p>Enter any email & password to proceed (demo only)</p>
 
        {error && <div className="error-message">{error}</div>}
        <form onSubmit={handleSubmit} className="login-form">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button className="btn btn-primary" type="submit">Sign In</button>
        </form>
      </div>
    </div>
  )
}
