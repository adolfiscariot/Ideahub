# IdeaHub

**A collaborative platform for teams to share ideas, vote on innovations, and transform concepts into projects.**

## About

IdeaHub is a modern web application built to facilitate collaboration and innovation within teams. Create groups, share ideas, vote on the best concepts, and promote promising ideas into full-fledged projects.

## Tech Stack

### Frontend
- **React 18** - Modern UI library
- **Vite** - Fast build tool and dev server
- **TypeScript** - Type-safe development
- **shadcn/ui** - Beautiful, accessible component library
- **Tailwind CSS** - Utility-first CSS framework
- **TanStack Query** - Powerful data fetching and caching
- **React Router** - Client-side routing
- **Zod** - Schema validation

### Backend
- **.NET 10** - High-performance web framework
- **ASP.NET Core** - Web API framework
- **Entity Framework Core** - ORM for database access
- **PostgreSQL** - Reliable, open-source database
- **JWT Authentication** - Secure user authentication
- **ASP.NET Identity** - User management

## Getting Started

### Prerequisites
- Node.js 18+ and npm/pnpm
- .NET 10 SDK
- Docker (for PostgreSQL database)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/adolfiscariot/Ideahub.git
   cd Ideahub
   ```

2. **Start the database**
   ```bash
   docker-compose up -d
   ```

3. **Start the backend API**
   ```bash
   cd api
   dotnet run
   ```
   The API will be available at `http://localhost:5065`

4. **Start the frontend**
   ```bash
   cd ui
   npm install
   npm run dev
   ```
   The UI will be available at `http://localhost:8080`

## Features

- 🎯 **Group Management** - Create and join groups
- 💡 **Idea Sharing** - Post ideas within groups
- 🗳️ **Voting System** - Vote on ideas to prioritize them
- 🚀 **Project Promotion** - Transform top ideas into projects
- 👥 **User Authentication** - Secure login and registration
- 🎨 **Modern UI** - Beautiful, responsive design with dark mode support

## Project Structure

```
Ideahub/
├── api/              # .NET backend
│   ├── Controllers/  # API endpoints
│   ├── Models/       # Data models
│   ├── Data/         # Database context
│   └── Services/     # Business logic
├── ui/               # React frontend
│   ├── src/
│   │   ├── components/  # Reusable UI components
│   │   ├── pages/       # Page components
│   │   ├── lib/         # Utilities and API client
│   │   └── hooks/       # Custom React hooks
│   └── public/          # Static assets
└── docker-compose.yml   # Database configuration
```

## Development

### Frontend Development
```bash
cd ui
npm run dev          # Start dev server
npm run build        # Build for production
npm run preview      # Preview production build
```

### Backend Development
```bash
cd api
dotnet watch run     # Run with hot reload
dotnet build         # Build the project
dotnet test          # Run tests
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License.

## Acknowledgments

Built with ❤️ by Adept Technologies
