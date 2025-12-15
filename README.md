# Ideahub

A comprehensive platform for groups to centralize ideas, vote on them, and track their progress as they evolve into projects.

## Project Overview

Ideahub bridges the gap between brainstorming and execution. It allows communities and teams to:
- **Share Ideas**: Submit and describe new concepts.
- **Engage**: Upvote and comment on ideas to signal interest.
- **Organize**: Group similar ideas and manage them through lifecycle stages (Open, Promoted, Closed).
- **Track**: Monitor the transition of top ideas into active projects.

## Key Features

- **Dashboard**: High-level analytics on ideas, votes, and community engagement.
- **Idea Management**: Create, edit, and track ideas.
- **Voting System**: Community-driven prioritization.
- **Group Collaboration**: Organize users and ideas into specific interest groups.
- **Personalized Stats**: Track your individual contributions (Ideas Created, Votes Cast, etc.).

## Tech Stack

### Frontend
- **Framework**: Angular 19+
- **Styling**: SCSS with a custom design system (Century Gothic typography).
- **Icons**: Ng-Icons (Heroicons).

### Backend
- **Framework**: .NET 10 Web API
- **Database**: PostgreSQL
- **ORM**: Entity Framework Core

## Getting Started

### Prerequisites
- Docker & Docker Compose
- Node.js & npm (for local frontend dev)
- .NET SDK (for local backend dev)

### Running with Docker Compose

1. Clone the repository.
2. Navigate to the project root.
3. Run the application:
   ```bash
   docker-compose up -d --build
   ```
4. Access the application:
   - Frontend: `http://localhost:4200`
   - Backend API: `http://localhost:5065`

### Local Development

**Frontend:**
```bash
cd ui
npm install
npm start
```

**Backend:**
```bash
cd api
dotnet restore
dotnet run
```
