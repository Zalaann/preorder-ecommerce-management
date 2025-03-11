import React, { useState, useEffect, useRef } from 'react';

interface EditableCellProps {
  value: string | number;
  onSave: (value: string | number) => void;
  type?: 'text' | 'number' | 'select';
  options?: { value: string; label: string }[];
  isEditing: boolean;
  onEditToggle: () => void;
}

const EditableCell: React.FC<EditableCellProps> = ({
  value,
  onSave,
  type = 'text',
  options = [],
  isEditing,
  onEditToggle,
}) => {
  const [editValue, setEditValue] = useState<string | number>(value);
  const inputRef = useRef<HTMLInputElement | HTMLSelectElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  useEffect(() => {
    setEditValue(value);
  }, [value]);

  const handleSave = () => {
    onSave(editValue);
    onEditToggle();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      setEditValue(value);
      onEditToggle();
    }
  };

  // Handle focus for number inputs
  const handleNumberFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    if (type === 'number' && parseFloat(String(editValue)) === 0) {
      setEditValue('');
    }
  };

  if (!isEditing) {
    return (
      <div
        className="cursor-pointer p-2 hover:bg-gray-50 rounded"
        onClick={onEditToggle}
      >
        {type === 'select' && options
          ? options.find((option) => option.value === value)?.label || value
          : value}
      </div>
    );
  }

  return (
    <div className="flex items-center space-x-1">
      {type === 'select' ? (
        <select
          ref={inputRef as React.RefObject<HTMLSelectElement>}
          value={editValue.toString()}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={handleSave}
          onKeyDown={handleKeyDown}
          className="block w-full p-1 text-sm text-gray-900 border border-gray-300 rounded-lg bg-gray-50 focus:ring-blue-500 focus:border-blue-500"
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      ) : type === 'number' ? (
        <input
          ref={inputRef as React.RefObject<HTMLInputElement>}
          type="number"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value === '' ? '' : e.target.valueAsNumber || 0)}
          onFocus={handleNumberFocus}
          onBlur={handleSave}
          onKeyDown={handleKeyDown}
          className="block w-full p-1 text-sm text-gray-900 border border-gray-300 rounded-lg bg-gray-50 focus:ring-blue-500 focus:border-blue-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        />
      ) : (
        <input
          ref={inputRef as React.RefObject<HTMLInputElement>}
          type="text"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={handleSave}
          onKeyDown={handleKeyDown}
          className="block w-full p-1 text-sm text-gray-900 border border-gray-300 rounded-lg bg-gray-50 focus:ring-blue-500 focus:border-blue-500"
        />
      )}
    </div>
  );
};

export default EditableCell; 