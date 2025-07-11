import React from 'react'

const Input = ({ type = 'text', placeholder, value, onChange }) => {
  return (
    <input
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      required
      className="px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 w-full"
    />
  )
}

export default Input