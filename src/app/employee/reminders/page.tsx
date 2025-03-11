'use client';

import React, { useState, useEffect } from 'react';
import { Reminder, ReminderStatus } from '@/lib/types';
import { supabase } from '@/lib/supabase';
import KanbanBoard from '@/components/reminders/KanbanBoard';
import ReminderEditModal from '@/components/reminders/ReminderEditModal';
import ReminderDeleteModal from '@/components/reminders/ReminderDeleteModal';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

const RemindersPage = () => {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Modal states
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedReminder, setSelectedReminder] = useState<Reminder | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load reminders on component mount
  useEffect(() => {
    loadReminders();
  }, []);

  // Load reminders from Supabase
  const loadReminders = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Get the current user's ID
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('You must be logged in to view reminders');
      }
      
      const userId = session.user.id;
      
      // Only fetch reminders created by the current user
      const { data, error } = await supabase
        .from('reminders')
        .select('*')
        .eq('user_id', userId)
        .order('due_date', { ascending: true });
      
      if (error) {
        throw new Error(error.message);
      }
      
      setReminders(data || []);
    } catch (err) {
      console.error('Error loading reminders:', err);
      setError(err instanceof Error ? err.message : 'Failed to load reminders');
      toast.error('Failed to load reminders');
    } finally {
      setLoading(false);
    }
  };

  // Handle opening edit modal
  const handleEditReminder = (reminder: Reminder) => {
    setSelectedReminder(reminder);
    setIsEditModalOpen(true);
  };

  // Handle opening delete modal
  const handleDeleteReminder = (reminder: Reminder) => {
    setSelectedReminder(reminder);
    setIsDeleteModalOpen(true);
  };

  // Handle saving reminder (edit or create)
  const handleSaveReminder = async (reminder: Reminder) => {
    try {
      setIsSubmitting(true);
      setError(null);

      // Check if this is a new reminder (empty reminder_id)
      const isNewReminder = !reminder.reminder_id;

      // Format the reminder data
      const reminderData = {
        title: reminder.title,
        description: reminder.description,
        status: reminder.status,
        priority: reminder.priority,
        due_date: reminder.due_date,
        updated_at: new Date().toISOString()
      };

      if (isNewReminder) {
        // For new reminders, we need to include the user_id and preorder_id (if provided)
        // Get the current user's ID
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          throw new Error('You must be logged in to create a reminder');
        }

        // Create a new reminder
        const { error } = await supabase
          .from('reminders')
          .insert({
            ...reminderData,
            user_id: session.user.id,
            preorder_id: reminder.preorder_id || null, // Allow null for preorder_id
            created_at: new Date().toISOString()
          });

        if (error) {
          throw new Error(error.message);
        }
      } else {
        // Update an existing reminder
        const { error } = await supabase
          .from('reminders')
          .update({
            ...reminderData,
            preorder_id: reminder.preorder_id || null // Allow null for preorder_id
          })
          .eq('reminder_id', reminder.reminder_id);

        if (error) {
          throw new Error(error.message);
        }
      }

      // Refresh reminders list
      await loadReminders();

      // Close the modal
      setIsEditModalOpen(false);

      // Show success message
      toast.success(isNewReminder ? 'Reminder created successfully' : 'Reminder updated successfully');
    } catch (err) {
      console.error('Error saving reminder:', err);
      setError(err instanceof Error ? err.message : 'Failed to save reminder');
      toast.error('Failed to save reminder');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle deleting reminder
  const handleDeleteConfirm = async (reminderId: string) => {
    try {
      setIsSubmitting(true);
      setError(null);

      // Delete the reminder from Supabase
      const { error } = await supabase
        .from('reminders')
        .delete()
        .eq('reminder_id', reminderId);

      if (error) {
        throw new Error(error.message);
      }

      // Refresh reminders list
      await loadReminders();

      // Close the modal
      setIsDeleteModalOpen(false);

      // Show success message
      toast.success('Reminder deleted successfully');
    } catch (err) {
      console.error('Error deleting reminder:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete reminder');
      toast.error('Failed to delete reminder');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle status change
  const handleStatusChange = async (reminder: Reminder, newStatus: ReminderStatus) => {
    try {
      setError(null);

      // Update the reminder status in Supabase
      const { error } = await supabase
        .from('reminders')
        .update({
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('reminder_id', reminder.reminder_id);

      if (error) {
        throw new Error(error.message);
      }

      // Update local state
      setReminders(prevReminders =>
        prevReminders.map(r =>
          r.reminder_id === reminder.reminder_id ? { ...r, status: newStatus } : r
        )
      );

      // Show success message
      toast.success(`Reminder moved to ${newStatus}`);
    } catch (err) {
      console.error('Error updating reminder status:', err);
      setError(err instanceof Error ? err.message : 'Failed to update reminder status');
      toast.error('Failed to update reminder status');
      
      // Refresh to ensure UI is in sync with database
      await loadReminders();
    }
  };

  // Handle creating a new reminder
  const handleAddNewReminder = () => {
    // Create a new reminder with default values
    const newReminder: Reminder = {
      reminder_id: '',
      preorder_id: '',
      user_id: '',
      title: '',
      description: '',
      status: 'Pending',
      priority: 'Medium',
      due_date: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    setSelectedReminder(newReminder);
    setIsEditModalOpen(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
        <span className="ml-2 text-lg">Loading reminders...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <div className="text-red-500 mb-4">Error: {error}</div>
        <button
          onClick={loadReminders}
          className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 h-[calc(100vh-4rem)]">
      <KanbanBoard
        reminders={reminders}
        onStatusChange={handleStatusChange}
        onEdit={handleEditReminder}
        onDelete={handleDeleteReminder}
        onAddNew={handleAddNewReminder}
      />
      
      <ReminderEditModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        reminder={selectedReminder}
        onSave={handleSaveReminder}
        isSubmitting={isSubmitting}
      />
      
      <ReminderDeleteModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        reminder={selectedReminder}
        onDelete={handleDeleteConfirm}
      />
    </div>
  );
};

export default RemindersPage; 