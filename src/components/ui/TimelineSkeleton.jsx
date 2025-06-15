// src/components/ui/TimelineSkeleton.jsx
import React from 'react';

const TimelineSkeleton = () => (
  <div className="space-y-4 animate-pulse p-4">
    {Array.from({ length: 5 }).map((_, i) => (
      <div key={i} className="border-b pb-4">
        <div className="h-6 w-1/3 bg-gray-200 rounded mb-2" />
        <div className="h-4 w-full bg-gray-200 rounded" />
      </div>
    ))}
  </div>
);

export default TimelineSkeleton;
