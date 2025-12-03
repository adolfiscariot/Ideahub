export interface User {
  id: string;
  name: string;
  avatar: string;
}

export interface Idea {
  id: string;
  title: string;
  content: string;
  authorId: string;
  groupId: string;
  votes: number;
  commentCount: number;
  createdAt: Date;
  userVote?: 'up' | 'down' | null;
}

export interface Group {
  id: string;
  name: string;
  description: string;
  memberCount: number;
  isMember: boolean;
  createdAt: Date;
  ideaCount: number;
}

export const mockUsers: User[] = [
  { id: '1', name: 'Sarah Chen', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah' },
  { id: '2', name: 'James Wilson', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=James' },
  { id: '3', name: 'Maria Garcia', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Maria' },
  { id: '4', name: 'David Kim', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=David' },
  { id: '5', name: 'Emma Johnson', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Emma' },
  { id: '6', name: 'Lucas Brown', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Lucas' },
  { id: '7', name: 'Olivia Davis', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Olivia' },
  { id: '8', name: 'Noah Martinez', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Noah' },
];

export const mockGroups: Group[] = [
  {
    id: '1',
    name: 'Tech Innovators',
    description: 'Exploring cutting-edge technology and innovation in software development',
    memberCount: 24,
    isMember: true,
    createdAt: new Date('2023-06-15'),
    ideaCount: 4,
  },
  {
    id: '2',
    name: 'Design Thinking',
    description: 'Creative minds sharing design principles and user experience insights',
    memberCount: 18,
    isMember: false,
    createdAt: new Date('2023-08-22'),
    ideaCount: 0,
  },
  {
    id: '3',
    name: 'Startup Ideas',
    description: 'Entrepreneurs and dreamers brainstorming the next big thing',
    memberCount: 32,
    isMember: true,
    createdAt: new Date('2023-05-10'),
    ideaCount: 4,
  },
  {
    id: '4',
    name: 'AI & Machine Learning',
    description: 'Discussing artificial intelligence applications and breakthroughs',
    memberCount: 41,
    isMember: false,
    createdAt: new Date('2023-09-01'),
    ideaCount: 0,
  },
  {
    id: '5',
    name: 'Sustainable Living',
    description: 'Ideas for eco-friendly products and sustainable lifestyle changes',
    memberCount: 15,
    isMember: false,
    createdAt: new Date('2023-11-05'),
    ideaCount: 0,
  },
  {
    id: '6',
    name: 'Product Management',
    description: 'Best practices and strategies for building successful products',
    memberCount: 27,
    isMember: true,
    createdAt: new Date('2023-07-20'),
    ideaCount: 2,
  },
];

export const mockIdeas: Idea[] = [
  {
    id: '1',
    title: 'AI-Powered Code Review Assistant',
    content: 'A tool that automatically reviews pull requests and suggests improvements based on best practices',
    authorId: '1',
    groupId: '1',
    votes: 42,
    commentCount: 8,
    createdAt: new Date('2024-01-15'),
  },
  {
    id: '2',
    title: 'Real-time Collaboration Whiteboard',
    content: 'Virtual whiteboard with live cursors and drawing tools for remote teams',
    authorId: '2',
    groupId: '1',
    votes: 38,
    commentCount: 12,
    createdAt: new Date('2024-01-18'),
  },
  {
    id: '3',
    title: 'Smart Meeting Scheduler',
    content: 'Uses ML to find optimal meeting times across timezones and preferences',
    authorId: '4',
    groupId: '1',
    votes: 31,
    commentCount: 5,
    createdAt: new Date('2024-01-20'),
  },
  {
    id: '4',
    title: 'Micro-Learning Platform',
    content: 'Bite-sized lessons delivered at the perfect moment when you need them',
    authorId: '3',
    groupId: '1',
    votes: 27,
    commentCount: 9,
    createdAt: new Date('2024-01-22'),
  },
  {
    id: '5',
    title: 'Community Garden App',
    content: 'Connect neighbors to share gardening tips and surplus produce',
    authorId: '5',
    groupId: '3',
    votes: 56,
    commentCount: 15,
    createdAt: new Date('2024-01-10'),
  },
  {
    id: '6',
    title: 'Freelancer Matchmaking Platform',
    content: 'AI matches freelancers with projects based on skills and working style',
    authorId: '6',
    groupId: '3',
    votes: 48,
    commentCount: 11,
    createdAt: new Date('2024-01-12'),
  },
  {
    id: '7',
    title: 'Mental Health Check-in Bot',
    content: 'Daily mood tracking with personalized wellness recommendations',
    authorId: '7',
    groupId: '3',
    votes: 63,
    commentCount: 18,
    createdAt: new Date('2024-01-14'),
  },
  {
    id: '8',
    title: 'Local Skills Exchange',
    content: 'Trade skills with neighbors - teach guitar, learn cooking, etc.',
    authorId: '8',
    groupId: '3',
    votes: 41,
    commentCount: 7,
    createdAt: new Date('2024-01-16'),
  },
  {
    id: '9',
    title: 'Feature Voting Dashboard',
    content: 'Let customers vote on feature priorities and see development progress',
    authorId: '1',
    groupId: '6',
    votes: 52,
    commentCount: 14,
    createdAt: new Date('2024-01-11'),
  },
  {
    id: '10',
    title: 'Product Metrics Storytelling',
    content: 'Automatically generate narrative insights from analytics data',
    authorId: '4',
    groupId: '6',
    votes: 44,
    commentCount: 10,
    createdAt: new Date('2024-01-13'),
  },
];

export const getGroupMembers = (groupId: string): User[] => {
  // Return different users based on group
  const memberMap: Record<string, User[]> = {
    '1': [mockUsers[0], mockUsers[1], mockUsers[3], mockUsers[4]],
    '3': [mockUsers[0], mockUsers[2], mockUsers[4], mockUsers[5], mockUsers[6], mockUsers[7]],
    '6': [mockUsers[0], mockUsers[3], mockUsers[5]],
  };
  return memberMap[groupId] || [];
};

export const getGroupIdeas = (groupId: string): Idea[] => {
  return mockIdeas.filter(idea => idea.groupId === groupId);
};

export const getUserById = (userId: string): User | undefined => {
  return mockUsers.find(u => u.id === userId);
};
