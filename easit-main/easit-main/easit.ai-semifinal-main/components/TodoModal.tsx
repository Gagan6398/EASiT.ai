import React from 'react';
import { Modal } from './Modal.tsx';
import type { Todo } from '../types.ts';
import { Trash2, Circle, CheckCircle2 } from 'lucide-react';

interface TodoModalProps {
  todos: Todo[];
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}

export const TodoModal: React.FC<TodoModalProps> = ({ todos, onToggle, onDelete, onClose }) => {
  const pendingTodos = todos.filter(t => !t.completed);
  const completedTodos = todos.filter(t => t.completed);

  return (
    <Modal title="My To-Do List" onClose={onClose}>
      <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
        {todos.length === 0 ? (
          <p className="text-center text-gray-500 dark:text-gray-400 py-4">Your to-do list is empty. Add tasks by talking to the assistant!</p>
        ) : (
          <>
            {pendingTodos.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2">To-Do</h3>
                <ul className="space-y-2">
                  {pendingTodos.map(todo => (
                    <li key={todo.id} className="flex items-center justify-between p-2 rounded-lg bg-gray-100 dark:bg-gray-700/50">
                      <button onClick={() => onToggle(todo.id)} className="flex items-center gap-3 flex-1 text-left">
                        <Circle size={20} className="text-gray-400" />
                        <span>{todo.text}</span>
                      </button>
                      <button onClick={() => onDelete(todo.id)} className="p-1 text-gray-400 hover:text-red-500 transition-colors" aria-label={`Delete task: ${todo.text}`}>
                        <Trash2 size={16} />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {completedTodos.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2 mt-4">Completed</h3>
                <ul className="space-y-2">
                  {completedTodos.map(todo => (
                    <li key={todo.id} className="flex items-center justify-between p-2 rounded-lg bg-gray-100 dark:bg-gray-700/50 opacity-60">
                      <button onClick={() => onToggle(todo.id)} className="flex items-center gap-3 flex-1 text-left">
                        <CheckCircle2 size={20} className="text-green-500" />
                        <span className="line-through">{todo.text}</span>
                      </button>
                       <button onClick={() => onDelete(todo.id)} className="p-1 text-gray-400 hover:text-red-500 transition-colors" aria-label={`Delete task: ${todo.text}`}>
                        <Trash2 size={16} />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </div>
    </Modal>
  );
};