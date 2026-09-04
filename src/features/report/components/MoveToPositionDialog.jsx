import React from 'react';
import { ListOrdered } from 'lucide-react';
import { Button } from '@/components/ui/button.jsx';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog.jsx';
import { Input } from '@/components/ui/input.jsx';

const clampPosition = (value, itemCount) => Math.min(itemCount, Math.max(1, value));

export default function MoveToPositionDialog({
  currentPosition,
  itemCount,
  itemLabel,
  onMove,
  triggerSize = 'icon-sm',
}) {
  const inputId = React.useId();
  const [open, setOpen] = React.useState(false);
  const [position, setPosition] = React.useState(currentPosition);

  const handleOpenChange = (nextOpen) => {
    setOpen(nextOpen);
    if (nextOpen) setPosition(currentPosition);
  };

  const setClampedPosition = (nextPosition) => {
    setPosition(clampPosition(Number(nextPosition) || 1, itemCount));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const targetPosition = clampPosition(Number(position) || currentPosition, itemCount);
    if (targetPosition !== currentPosition) onMove(currentPosition - 1, targetPosition - 1);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size={triggerSize}
          aria-label={`Move ${itemLabel} to position`}
          title={`Move ${itemLabel} to position`}
          disabled={itemCount <= 1}
        >
          <ListOrdered />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <form className="grid gap-4" onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Move {itemLabel}</DialogTitle>
            <DialogDescription>
              Current position {currentPosition} of {itemCount}. References will update automatically.
            </DialogDescription>
          </DialogHeader>

          <fieldset className="grid gap-3">
            <label htmlFor={inputId} className="text-sm font-medium text-foreground">
              New position
            </label>
            <Input
              id={inputId}
              type="number"
              min={1}
              max={itemCount}
              value={position}
              onChange={(event) => setPosition(event.target.value)}
              onBlur={() => setClampedPosition(position)}
              inputMode="numeric"
              autoFocus
            />
            <section className="grid grid-cols-4 gap-2" aria-label="Position shortcuts">
              <Button type="button" variant="outline" size="sm" onClick={() => setPosition(1)}>First</Button>
              <Button type="button" variant="outline" size="sm" onClick={() => setClampedPosition(Number(position) - 10)}>−10</Button>
              <Button type="button" variant="outline" size="sm" onClick={() => setClampedPosition(Number(position) + 10)}>+10</Button>
              <Button type="button" variant="outline" size="sm" onClick={() => setPosition(itemCount)}>Last</Button>
            </section>
          </fieldset>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={Number(position) === currentPosition}>Move to position</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
