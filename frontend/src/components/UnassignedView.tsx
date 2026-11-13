import React from 'react';
import TasksView from './TasksView';
import { BrainItem, AreaHierarchy } from '../types';

interface UnassignedViewProps {
  items: BrainItem[];
  onAssignItem: (id: string, areaId: string, projectId: string, subProjectId?: string, tags?: string[]) => void;
  onDeleteItem: (id: string) => void;
  hierarchy: AreaHierarchy[];
}

/**
 * Deprecated: The dedicated Unassigned view has been consolidated into the global Tasks view.
 * This component acts as a graceful redirect / backward-compatible wrapper with the 'unassigned' filter preselected.
 */
export default function UnassignedView({
  items,
  onAssignItem,
  onDeleteItem,
  hierarchy = []
}: UnassignedViewProps) {
  return (
    <TasksView
      tasks={items}
      hierarchy={hierarchy}
      initialFilter="unassigned"
      onToggleComplete={async () => {}}
      onDeleteTask={async (id) => onDeleteItem(id)}
      onUpdateTask={async () => {}}
      onCreateTask={async () => {}}
      onAssignTask={async (id, areaId, projectId, subProjectId, tags) => {
        onAssignItem(id, areaId, projectId, subProjectId, tags);
      }}
    />
  );
}
