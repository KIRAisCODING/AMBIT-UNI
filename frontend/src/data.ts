import { BrainItem, Habit, AreaHierarchy } from './types';

export const DEFAULT_ITEMS: BrainItem[] = [
  {
    id: 'seed-task-1',
    content: 'Design the database schema for the product launch backend including indices for user querying',
    type: 'Task',
    assignment: 'now',
    area: 'Work',
    project: 'Product Launch',
    subProject: 'Database',
    tags: ['database', 'schema', 'postgres', 'Work'],
    createdAt: new Date(Date.now() - 4 * 3600000).toISOString(), // 4 hours ago
    completed: false
  },
  {
    id: 'seed-idea-1',
    content: 'Use vector embeddings via Gemini-embedding-2 to automatically cluster related thoughts in the AMBIT canvas',
    type: 'Idea',
    assignment: 'now',
    area: 'Side Projects',
    project: 'App Design',
    subProject: 'Backend',
    tags: ['AI', 'ambit', 'vector-db', 'Side Projects'],
    createdAt: new Date(Date.now() - 10 * 3600000).toISOString(), // 10 hours ago
    completed: false
  },
  {
    id: 'seed-note-1',
    content: 'Spoke with the product team today. They want a cleaner, Hanken Grotesk-based bold displaying typography for the stats dashboards and minimal spacing.',
    type: 'Note',
    assignment: 'now',
    area: 'Work',
    project: 'Product Launch',
    subProject: 'Frontend',
    tags: ['feedback', 'design', 'typography', 'Work'],
    createdAt: new Date(Date.now() - 24 * 3600000).toISOString(), // 1 day ago
    scheduledDate: '2026-07-06' // Scheduled for today
  },
  {
    id: 'seed-journal-1',
    content: 'Morning reflections: Feeling highly focused today. Intentionally keeping layout distractions and social notifications muted to maintain deep research.',
    type: 'Journal',
    assignment: 'now',
    area: 'Personal',
    project: 'Health & Fitness',
    tags: ['mindfulness', 'focus', 'deep-work', 'Personal'],
    createdAt: new Date(Date.now() - 28 * 3600000).toISOString(), // ~1 day ago
    scheduledDate: '2026-07-06' // Scheduled for today
  },
  {
    id: 'seed-task-2',
    content: 'Implement the lightweight JWT session authentication token middleware inside express server',
    type: 'Task',
    assignment: 'now',
    area: 'Work',
    project: 'Product Launch',
    subProject: 'Backend',
    tags: ['auth', 'security', 'express', 'Work'],
    createdAt: new Date(Date.now() - 48 * 3600000).toISOString(), // 2 days ago
    completed: true,
    scheduledDate: '2026-07-05' // Scheduled for yesterday
  },
  {
    id: 'unassigned-idea-1',
    content: 'Build a mobile companion shortcut or widget for instantly capturing notes from the Android notification bar without opening the browser',
    type: 'Idea',
    assignment: 'later',
    tags: ['mobile', 'ideas', 'widget'],
    createdAt: new Date(Date.now() - 5 * 3600000).toISOString() // 5 hours ago
  }
];

export const DEFAULT_HABITS: Habit[] = [
  {
    id: 'seed-habit-1',
    name: 'Meditate for 10 minutes',
    frequency: 'daily',
    streak: 3,
    longestStreak: 12,
    completedDays: [
      '2026-07-04',
      '2026-07-05',
      '2026-07-06' // Completed today too!
    ],
    createdAt: new Date(Date.now() - 7 * 24 * 3600000).toISOString(),
    area: 'Personal',
    project: 'Health & Fitness',
    notes: 'Focus on breathing and mental clarity. Best done in the morning.'
  },
  {
    id: 'seed-habit-2',
    name: 'Review captured external brain entries',
    frequency: 'daily',
    streak: 5,
    longestStreak: 15,
    completedDays: [
      '2026-07-02',
      '2026-07-03',
      '2026-07-04',
      '2026-07-05'
    ],
    createdAt: new Date(Date.now() - 7 * 24 * 3600000).toISOString(),
    area: 'Work',
    project: 'Product Launch',
    notes: 'Go through Inbox and either complete, assign or schedule raw ideas.'
  },
  {
    id: 'seed-habit-3',
    name: 'Read 15 pages of technical book',
    frequency: 'daily',
    streak: 1,
    longestStreak: 8,
    completedDays: [
      '2026-07-06' // Completed today!
    ],
    createdAt: new Date(Date.now() - 7 * 24 * 3600000).toISOString(),
    area: 'Side Projects',
    project: 'App Design',
    notes: 'Currently reading "Designing Data-Intensive Applications".'
  }
];

export const DEFAULT_HIERARCHY: AreaHierarchy[] = [
  {
    name: 'Work',
    projects: [
      {
        name: 'Product Launch',
        subProjects: ['Backend', 'Frontend', 'Database', 'QA Testing']
      },
      {
        name: 'Home Office',
        subProjects: ['Layout Planning', 'Acoustics', 'Ergonomics']
      }
    ]
  },
  {
    name: 'Personal',
    projects: [
      {
        name: 'Health & Fitness',
        subProjects: ['Workout Routines', 'Diet Plan', 'Sleep Tracker']
      }
    ]
  },
  {
    name: 'Education',
    projects: [
      {
        name: 'Semester 5',
        subProjects: ['DBMS', 'Computer Networks', 'Software Engineering']
      }
    ]
  },
  {
    name: 'Side Projects',
    projects: [
      {
        name: 'App Design',
        subProjects: ['Figma Drafts', 'User Testing', 'Visual Style']
      }
    ]
  }
];

