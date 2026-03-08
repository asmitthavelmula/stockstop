import React from 'react'

export default function Profile() {
  const userRaw = typeof window !== 'undefined' ? localStorage.getItem('stockkk_user') : null
  const user = userRaw ? JSON.parse(userRaw) : null

  return (
    <div style={{padding:20}}>
      <h2>My Profile</h2>
      {user ? (
        <div>
          <p><strong>Email:</strong> {user.email || user.username}</p>
          <p>This is a demo profile page. You are logged in using a dummy account.</p>
        </div>
      ) : (
        <p>Please login to view your profile.</p>
      )}
    </div>
  )
}
