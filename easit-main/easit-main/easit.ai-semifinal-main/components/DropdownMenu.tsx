
import React, { useState, useRef, useEffect } from 'react';
import { MoreVertical } from 'lucide-react';

interface DropdownMenuProps {
  items: { label: string; onClick: () => void }[];
}

export const DropdownMenu: React.FC<DropdownMenuProps> = ({ items }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
        aria-haspopup="true"
        aria-expanded={isOpen}
        aria-label="More options"
      >
        <MoreVertical size={20} />
      </button>
      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg py-1 z-20 border border-white/10 dark:border-gray-700/50">
          {items.map((item, index) => (
            <button
              key={index}
              onClick={(e) => {
                e.preventDefault();
                item.onClick();
                setIsOpen(false);
              }}
              className="w-full text-left block px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
