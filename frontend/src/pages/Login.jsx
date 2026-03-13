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
    console.log('Login success - redirecting to home');
    localStorage.setItem('stockkk_user', JSON.stringify({ email }))
    navigate('/')
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <header>
          <h2>StockKK</h2>
          <p className="subtitle">Institutional-grade portfolio analytics</p>
        </header>

        {error && (
          <div className="error-message">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit} className="login-form">
          <div className="input-group">
            <label htmlFor="email">Email Address</label>
            <input
              id="email"
              type="email"
              placeholder="name@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>

          <div className="input-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>

          <div className="login-options">
            <label className="remember-me">
              <input type="checkbox" />
              <span>Remember me</span>
            </label>
            <a href="#" className="forgot-password" onClick={(e) => e.preventDefault()}>
              Forgot password?
            </a>
          </div>

          <button className="login-btn" type="submit">
            Sign In to Dashboard
          </button>
        </form>

        <footer className="demo-notice">
          <p>Demo Mode: Access with any credentials</p>
        </footer>
      </div>
    </div>
  )
}
