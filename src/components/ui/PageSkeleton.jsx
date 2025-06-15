// src/components/ui/PageSkeleton.jsx
import React from 'react';

const PageSkeleton = () => (
  <div className="flex flex-col gap-4 p-8 animate-pulse">
    <div className="h-6 w-1/3 bg-gray-200 rounded" />
    <div className="h-4 w-1/4 bg-gray-200 rounded" />
    <div className="h-96 w-full bg-gray-200 rounded" />
  </div>
);

export default PageSkeleton;
