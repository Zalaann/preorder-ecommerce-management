'use client';

import React from 'react';
import { Reminder } from '@/lib/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Calendar, Bell } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { formatDate } from '@/lib/utils';

interface ReminderDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  reminder: Reminder | null;
  onDelete: (reminderId: string) => void;
}

const ReminderDeleteModal: React.FC<ReminderDeleteModalProps> = ({
  isOpen,
  onClose,
  reminder,
  onDelete,
}) => {
  if (!reminder) return null;

  const handleDelete = () => {
    onDelete(reminder.reminder_id);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={cn(
        "w-full max-w-[450px] p-0 overflow-hidden",
        "bg-white/95 dark:bg-gray-900/95 backdrop-blur-md",
        "border border-gray-200/50 dark:border-gray-700/50",
        "shadow-elegant rounded-2xl"
      )}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <DialogHeader className="p-6 flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-full bg-destructive/10 dark:bg-destructive/20 flex items-center justify-center mb-4">
              <AlertTriangle className="w-8 h-8 text-destructive" />
            </div>
            <DialogTitle className="text-xl font-bold text-gray-900 dark:text-white">
              Delete Reminder
            </DialogTitle>
            <DialogDescription className="text-sm text-gray-500 dark:text-gray-400 mt-2 max-w-[350px]">
              Are you sure you want to delete this reminder? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          
          <div className="px-6 pb-6">
            <div className="p-4 rounded-xl bg-gray-50/80 dark:bg-gray-800/50 border border-gray-200/50 dark:border-gray-700/30 mb-6">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-primary/10 dark:bg-primary/20 rounded-full h-8 w-8 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Bell className="w-4 h-4 text-primary dark:text-primary-light" />
                </div>
                <div className="flex-1">
                  <h3 className="font-medium text-gray-900 dark:text-white mb-1">
                    {reminder.title}
                  </h3>
                  {reminder.description && (
                    <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
                      {reminder.description}
                    </p>
                  )}
                  <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                    <Calendar className="h-3.5 w-3.5 mr-1.5" />
                    <span>Due: {formatDate(reminder.due_date)}</span>
                  </div>
                </div>
              </div>
            </div>
            
            <DialogFooter className="flex justify-end space-x-3">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleDelete}
                className="bg-destructive hover:bg-destructive-dark text-white"
              >
                Delete Reminder
              </Button>
            </DialogFooter>
          </div>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
};

export default ReminderDeleteModal; 