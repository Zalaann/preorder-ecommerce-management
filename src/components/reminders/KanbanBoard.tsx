'use client';

import React, { useState, useEffect } from 'react';
import { Reminder, ReminderStatus } from '@/lib/types';
import ReminderCard from './ReminderCard';
import { DragDropContext, Droppable, Draggable, DroppableProvided, DraggableProvided, DropResult } from '@hello-pangea/dnd';
import { Bell, Plus, Clock, CheckCircle, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface KanbanBoardProps {
  reminders: Reminder[];
  onStatusChange: (reminder: Reminder, newStatus: ReminderStatus) => void;
  onEdit: (reminder: Reminder) => void;
  onDelete: (reminder: Reminder) => void;
  onAddNew: () => void;
}

interface KanbanColumn {
  id: ReminderStatus;
  title: string;
  icon: React.ReactNode;
  items: Reminder[];
  color: string;
  bgColor: string;
  borderColor: string;
  headerBgColor: string;
}

const KanbanBoard: React.FC<KanbanBoardProps> = ({
  reminders,
  onStatusChange,
  onEdit,
  onDelete,
  onAddNew,
}) => {
  const [columns, setColumns] = useState<KanbanColumn[]>([
    { 
      id: 'Pending', 
      title: 'Pending', 
      icon: <Clock className="h-4 w-4" />,
      items: [], 
      color: 'text-amber-600 dark:text-amber-500',
      bgColor: 'bg-amber-50 dark:bg-amber-950/20',
      borderColor: 'border-amber-200 dark:border-amber-800/30',
      headerBgColor: 'bg-amber-100 dark:bg-amber-900/30'
    },
    { 
      id: 'In Progress', 
      title: 'In Progress', 
      icon: <RotateCcw className="h-4 w-4" />,
      items: [], 
      color: 'text-blue-600 dark:text-blue-500',
      bgColor: 'bg-blue-50 dark:bg-blue-950/20',
      borderColor: 'border-blue-200 dark:border-blue-800/30',
      headerBgColor: 'bg-blue-100 dark:bg-blue-900/30'
    },
    { 
      id: 'Completed', 
      title: 'Completed', 
      icon: <CheckCircle className="h-4 w-4" />,
      items: [], 
      color: 'text-green-600 dark:text-green-500',
      bgColor: 'bg-green-50 dark:bg-green-950/20',
      borderColor: 'border-green-200 dark:border-green-800/30',
      headerBgColor: 'bg-green-100 dark:bg-green-900/30'
    },
  ]);

  // Update columns when reminders change
  useEffect(() => {
    const newColumns = columns.map(column => ({
      ...column,
      items: reminders.filter(reminder => reminder.status === column.id)
    }));
    
    setColumns(newColumns);
  }, [reminders]);

  // Handle drag end
  const handleDragEnd = (result: DropResult) => {
    const { source, destination } = result;
    
    // Dropped outside the list
    if (!destination) return;
    
    // Dropped in the same position
    if (
      source.droppableId === destination.droppableId &&
      source.index === destination.index
    ) return;
    
    // Find source and destination columns
    const sourceColumn = columns.find(col => col.id === source.droppableId as ReminderStatus);
    const destColumn = columns.find(col => col.id === destination.droppableId as ReminderStatus);
    
    if (!sourceColumn || !destColumn) return;
    
    // Get the reminder being moved
    const reminder = sourceColumn.items[source.index];
    
    // If status changed, call the callback
    if (source.droppableId !== destination.droppableId) {
      onStatusChange(reminder, destColumn.id);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
          <Bell className="mr-2 h-6 w-6 text-purple-600 dark:text-purple-400" />
          Reminders
        </h2>
        <Button 
          onClick={onAddNew}
          className="bg-purple-600 hover:bg-purple-700 text-white"
        >
          <Plus className="h-4 w-4 mr-2" />
          New Reminder
        </Button>
      </div>
      
      <div className="flex-1">
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pb-4">
            {columns.map(column => (
              <div 
                key={column.id} 
                className={cn(
                  "flex flex-col rounded-xl shadow-sm border",
                  column.borderColor,
                  column.bgColor
                )}
              >
                <div className={cn(
                  "p-3 border-b flex items-center justify-between rounded-t-xl",
                  column.borderColor,
                  column.headerBgColor
                )}>
                  <h3 className={cn("font-medium flex items-center", column.color)}>
                    {column.icon}
                    <span className="ml-2">{column.title}</span>
                  </h3>
                  <span className={cn(
                    "inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium",
                    column.color,
                    "bg-white/60 dark:bg-gray-800/60"
                  )}>
                    {column.items.length}
                  </span>
                </div>
                
                <Droppable droppableId={column.id}>
                  {(provided: DroppableProvided) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className="flex-1 p-3 overflow-y-auto"
                      style={{ maxHeight: 'calc(100vh - 250px)' }}
                    >
                      {column.items.map((reminder, index) => (
                        <Draggable
                          key={reminder.reminder_id}
                          draggableId={reminder.reminder_id}
                          index={index}
                        >
                          {(provided: DraggableProvided) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className="mb-3 transform transition-transform duration-200 hover:-translate-y-1"
                            >
                              <ReminderCard
                                reminder={reminder}
                                onEdit={onEdit}
                                onDelete={onDelete}
                                onStatusChange={(reminder, newStatus) => onStatusChange(reminder, newStatus as ReminderStatus)}
                              />
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                      
                      {column.items.length === 0 && (
                        <div className={cn(
                          "flex flex-col items-center justify-center h-32 rounded-lg border-2 border-dashed",
                          "text-gray-400 dark:text-gray-500",
                          column.borderColor
                        )}>
                          <p className="text-sm font-medium mb-1">{column.title} is empty</p>
                          <p className="text-xs italic">Drag reminders here</p>
                        </div>
                      )}
                    </div>
                  )}
                </Droppable>
              </div>
            ))}
          </div>
        </DragDropContext>
      </div>
    </div>
  );
};

export default KanbanBoard; 