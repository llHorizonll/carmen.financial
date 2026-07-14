import React from 'react';
import { Check, UserCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge.jsx';
import { Button } from '@/components/ui/button.jsx';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog.jsx';
import { ScrollArea } from '@/components/ui/scroll-area.jsx';

const isSetupAdmin = (user) => {
  const permission = user?.permissions?.financialReport;
  if (permission) {
    return Boolean(permission.setup || permission.add || permission.update || permission.delete);
  }
  return user?.role === 'Admin';
};

const getUserRoleLabel = (user) => (isSetupAdmin(user) ? 'Admin' : 'User');

export default function AccessModal({ isOpen, masterData, activeReport, onClose, onUpdateUsers }) {
  if (!activeReport) return null;
  const friendlyButtonClassName = 'border-border bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground transition-all duration-150';

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserCheck className="size-4" />
            Manage Report Access
          </DialogTitle>
          <DialogDescription>Choose which users can view this report.</DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[min(60vh,360px)] pr-3">
          <div className="space-y-2">
            {masterData.users.map((user) => {
              const isSelected = activeReport.assignedUsers.includes(user.id);
              const nextUsers = isSelected
                ? activeReport.assignedUsers.filter((id) => id !== user.id)
                : [...activeReport.assignedUsers, user.id];
              return (
                <button
                  type="button"
                  key={user.id}
                  onClick={() => {
                    onUpdateUsers(nextUsers);
                  }}
                  className={`flex w-full items-center gap-3 rounded-lg border px-4 py-3 text-left transition-colors ${
                    isSelected ? 'border-foreground/20 bg-muted/40' : 'hover:bg-muted/20'
                  }`}
                  aria-pressed={isSelected}
                >
                  <div className={`flex size-5 items-center justify-center rounded border ${isSelected ? 'border-primary bg-primary text-primary-foreground' : 'border-border'}`}>
                    {isSelected && <Check className="size-3.5" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium">{user.name}</div>
                    <div className="text-xs text-muted-foreground">{getUserRoleLabel(user)}</div>
                  </div>
                  {isSelected && <Badge variant="secondary">Can view</Badge>}
                </button>
              );
            })}
          </div>
        </ScrollArea>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" className={`w-full sm:w-auto ${friendlyButtonClassName}`} onClick={onClose}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
