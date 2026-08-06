import React from 'react';

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

export default function useDragReorder({ items, onReorder, axis, itemLabel }) {
  const containerRef = React.useRef(null);
  const [draggedId, setDraggedId] = React.useState(null);
  const [overId, setOverId] = React.useState(null);
  const [announcement, setAnnouncement] = React.useState('');

  const reorderWithMotion = React.useCallback((fromIndex, toIndex) => {
    if (fromIndex === toIndex) return;
    const before = new Map();
    containerRef.current?.querySelectorAll('[data-reorder-id]').forEach((element) => {
      before.set(element.dataset.reorderId, element.getBoundingClientRect());
    });

    onReorder(fromIndex, toIndex);
    setAnnouncement(`${itemLabel(items[fromIndex], fromIndex)} moved to position ${toIndex + 1}.`);

    if (prefersReducedMotion()) return;
    requestAnimationFrame(() => {
      containerRef.current?.querySelectorAll('[data-reorder-id]').forEach((element) => {
        const previous = before.get(element.dataset.reorderId);
        const current = element.getBoundingClientRect();
        if (!previous || !element.animate) return;
        const deltaX = previous.left - current.left;
        const deltaY = previous.top - current.top;
        if (deltaX === 0 && deltaY === 0) return;
        element.animate(
          [{ transform: `translate(${deltaX}px, ${deltaY}px)` }, { transform: 'translate(0, 0)' }],
          { duration: 180, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' },
        );
      });
    });
  }, [itemLabel, items, onReorder]);

  const getItemProps = (id) => ({
    'data-reorder-id': id,
    'data-dragging': draggedId === id ? 'true' : undefined,
    'data-drag-over': overId === id && draggedId !== id ? 'true' : undefined,
    onDragEnter: () => draggedId && setOverId(id),
    onDragOver: (event) => {
      if (!draggedId) return;
      event.preventDefault();
      event.dataTransfer.dropEffect = 'move';
      setOverId(id);
    },
    onDrop: (event) => {
      event.preventDefault();
      const fromIndex = items.indexOf(draggedId);
      const toIndex = items.indexOf(id);
      if (fromIndex >= 0 && toIndex >= 0) reorderWithMotion(fromIndex, toIndex);
      setDraggedId(null);
      setOverId(null);
    },
  });

  const getHandleProps = (id, index) => ({
    draggable: true,
    'aria-label': `Reorder ${itemLabel(id, index)}. Use ${axis === 'horizontal' ? 'Left and Right' : 'Up and Down'} arrow keys.`,
    title: `Drag to reorder ${itemLabel(id, index)}`,
    onDragStart: (event) => {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', id);
      const item = event.currentTarget.closest('[data-reorder-id]');
      if (item) event.dataTransfer.setDragImage(item, 20, 20);
      setDraggedId(id);
      setOverId(id);
    },
    onDragEnd: () => {
      setDraggedId(null);
      setOverId(null);
    },
    onKeyDown: (event) => {
      const previousKey = axis === 'horizontal' ? 'ArrowLeft' : 'ArrowUp';
      const nextKey = axis === 'horizontal' ? 'ArrowRight' : 'ArrowDown';
      const targetIndex = event.key === 'Home'
        ? 0
        : event.key === 'End'
          ? items.length - 1
          : event.key === previousKey
            ? index - 1
            : event.key === nextKey
              ? index + 1
              : index;
      if (targetIndex === index || targetIndex < 0 || targetIndex >= items.length) return;
      event.preventDefault();
      reorderWithMotion(index, targetIndex);
    },
  });

  return { announcement, containerRef, draggedId, getHandleProps, getItemProps, overId };
}
