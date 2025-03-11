'use client';

import React from 'react';
import { Reminder, ReminderPriority, ReminderStatus } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { Bell, Calendar, ExternalLink, MoreHorizontal, Clock, AlertCircle } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

interface ReminderCardProps {
  reminder: Reminder;
  onEdit: (reminder: Reminder) => void;
  onDelete: (reminder: Reminder) => void;
  onStatusChange: (reminder: Reminder, newStatus: string) => void;
}

const getPriorityColor = (priority: ReminderPriority): string => {
  switch (priority) {
    case 'Urgent':
      return 'bg-red-500 hover:bg-red-600';
    case 'High':
      return 'bg-orange-500 hover:bg-orange-600';
    case 'Medium':
      return 'bg-yellow-500 hover:bg-yellow-600';
    case 'Low':
      return 'bg-green-500 hover:bg-green-600';
    default:
      return 'bg-blue-500 hover:bg-blue-600';
  }
};

const getPriorityTextColor = (priority: ReminderPriority): string => {
  switch (priority) {
    case 'Urgent':
      return 'text-red-600 dark:text-red-400';
    case 'High':
      return 'text-orange-600 dark:text-orange-400';
    case 'Medium':
      return 'text-yellow-600 dark:text-yellow-400';
    case 'Low':
      return 'text-green-600 dark:text-green-400';
    default:
      return 'text-blue-600 dark:text-blue-400';
  }
};

const getStatusColor = (status: ReminderStatus): string => {
  switch (status) {
    case 'Pending':
      return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400';
    case 'In Progress':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
    case 'Completed':
      return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400';
  }
};

const ReminderCard: React.FC<ReminderCardProps> = ({ 
  reminder, 
  onEdit, 
  onDelete,
  onStatusChange
}) => {
  const priorityColor = getPriorityColor(reminder.priority);
  const priorityTextColor = getPriorityTextColor(reminder.priority);
  const statusColor = getStatusColor(reminder.status);
  const isOverdue = new Date(reminder.due_date) < new Date() && reminder.status !== 'Completed';
  const hasPreorder = reminder.preorder_id && reminder.preorder_id.trim() !== '';
  
  return (
    <Card className={cn(
      "shadow-md hover:shadow-lg transition-all duration-200 overflow-hidden",
      "border border-gray-200 dark:border-gray-700",
      isOverdue && reminder.status !== 'Completed' ? "border-l-4 border-l-red-500" : ""
    )}>
      <CardContent className="p-0">
        {/* Card Header with Priority Indicator */}
        <div className={cn(
          "px-4 py-2 flex items-center justify-between",
          "border-b border-gray-200 dark:border-gray-700",
          `bg-opacity-10 dark:bg-opacity-20 ${reminder.status === 'Completed' ? 'bg-green-100 dark:bg-green-900/20' : ''}`
        )}>
          <Badge variant="outline" className={statusColor}>
            {reminder.status}
          </Badge>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700">
                <MoreHorizontal className="h-4 w-4 text-gray-500 dark:text-gray-400" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent 
              align="end" 
              className="w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg"
            >
              <DropdownMenuItem onClick={() => onEdit(reminder)}>
                Edit Reminder
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={() => onStatusChange(reminder, 'Pending')}
                disabled={reminder.status === 'Pending'}
                className={reminder.status === 'Pending' ? 'opacity-50' : ''}
              >
                Move to Pending
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => onStatusChange(reminder, 'In Progress')}
                disabled={reminder.status === 'In Progress'}
                className={reminder.status === 'In Progress' ? 'opacity-50' : ''}
              >
                Move to In Progress
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => onStatusChange(reminder, 'Completed')}
                disabled={reminder.status === 'Completed'}
                className={reminder.status === 'Completed' ? 'opacity-50' : ''}
              >
                Mark as Completed
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={() => onDelete(reminder)}
                className="text-red-600 dark:text-red-400"
              >
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        
        {/* Card Content */}
        <div className="p-4">
          <h3 className="font-medium text-gray-900 dark:text-white text-base mb-2 line-clamp-2">
            {reminder.title}
          </h3>
          
          {reminder.description && (
            <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2 mb-3">
              {reminder.description}
            </p>
          )}
          
          {/* Metadata */}
          <div className="flex flex-col space-y-2 text-xs">
            {/* Due Date */}
            <div className={cn(
              "flex items-center",
              isOverdue ? "text-red-600 dark:text-red-400" : "text-gray-500 dark:text-gray-400"
            )}>
              {isOverdue ? (
                <AlertCircle className="h-3.5 w-3.5 mr-1.5" />
              ) : (
                <Calendar className="h-3.5 w-3.5 mr-1.5" />
              )}
              <span className={isOverdue ? "font-medium" : ""}>
                {isOverdue ? "Overdue: " : "Due: "}
                {formatDate(reminder.due_date)}
              </span>
            </div>
            
            {/* Preorder Link */}
            {hasPreorder && (
              <div className="flex items-center text-gray-500 dark:text-gray-400">
                <Link 
                  href={`/admin/pre-orders?id=${reminder.preorder_id}`} 
                  className="flex items-center hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
                >
                  <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                  <span className="truncate max-w-[180px]">
                    Order: {reminder.preorder_id}
                  </span>
                </Link>
              </div>
            )}
          </div>
          
          {/* Priority Badge */}
          <div className="mt-3 flex items-center justify-between">
            <Badge className={cn("font-medium", priorityTextColor, "bg-opacity-10 dark:bg-opacity-20")}>
              {reminder.priority} Priority
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ReminderCard; 