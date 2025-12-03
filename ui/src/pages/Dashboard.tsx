import { Navbar } from '@/components/Navbar';

export default function Dashboard() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-serif font-bold mb-4">Dashboard</h1>
        <p className="text-muted-foreground">Coming soon...</p>
      </div>
    </div>
  );
}
