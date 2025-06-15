import React from 'react'

const Button = ({ type = 'button', children, loading }) => {
  return (
    <button
      type={type}
      disabled={loading}
      className="bg-indigo-500 text-white py-2 rounded-md hover:bg-indigo-600 transition w-full"
    >
      {loading ? 'Loading...' : children}
    </button>
  )
}

export default Button