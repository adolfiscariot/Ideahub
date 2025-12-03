import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Users, Lightbulb, Rocket, ArrowRight } from 'lucide-react';
import adeptLogo from '@/assets/adeptwebp.webp';

export default function Landing() {
    return (
        <div className="min-h-screen bg-background flex flex-col">
            {/* Header */}
            <header className="absolute top-0 left-0 right-0 z-50 p-6">
                <div className="container mx-auto">
                    <div className="flex items-center gap-3">
                        <img src={adeptLogo} alt="IdeaHub" className="h-10 w-auto" />
                        {/* <span className="text-xl font-bold font-serif">IdeaHub</span> */}
                    </div>
                </div>
            </header>

            {/* Hero Section */}
            <div className="relative overflow-hidden flex-1 flex items-center">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-purple-500/10" />

                <div className="container mx-auto px-4 py-20 relative pt-32">
                    <div className="flex flex-col lg:flex-row items-center gap-12">
                        <div className="flex-1 space-y-8 text-center lg:text-left">
                            <h1 className="text-5xl md:text-6xl font-bold leading-tight font-serif">
                                Where Ideas Come to Life
                            </h1>

                            <p className="text-xl text-muted-foreground max-w-2xl">
                                Collaborate with innovators, share groundbreaking ideas, vote on the best concepts,
                                and transform your vision into reality. Join the community where innovation thrives.
                            </p>

                            <div className="flex gap-4 justify-center lg:justify-start">
                                <Link to="/register">
                                    <Button size="lg" className="gap-2">
                                        Get Started <ArrowRight className="h-4 w-4" />
                                    </Button>
                                </Link>
                                <Link to="/login">
                                    <Button size="lg" variant="outline">
                                        Sign In
                                    </Button>
                                </Link>
                            </div>
                        </div>

                        <div className="flex-1">
                            <div className="relative aspect-square max-w-lg mx-auto">
                                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-3xl opacity-20 blur-3xl" />
                                <div className="relative bg-gradient-to-br from-indigo-500/10 to-purple-500/10 rounded-3xl p-12 border border-primary/20 h-full flex items-center justify-center">
                                    <div className="grid grid-cols-2 gap-8 w-full">
                                        <div className="space-y-4">
                                            <div className="bg-white/10 backdrop-blur rounded-lg p-4 border border-white/20 shadow-lg">
                                                <Lightbulb className="h-8 w-8 text-yellow-400 mb-2" />
                                                <div className="h-2 bg-white/20 rounded w-3/4 mb-1" />
                                                <div className="h-2 bg-white/10 rounded w-1/2" />
                                            </div>
                                            <div className="bg-white/10 backdrop-blur rounded-lg p-4 border border-white/20 shadow-lg">
                                                <Users className="h-8 w-8 text-blue-400 mb-2" />
                                                <div className="h-2 bg-white/20 rounded w-2/3 mb-1" />
                                                <div className="h-2 bg-white/10 rounded w-1/3" />
                                            </div>
                                        </div>
                                        <div className="space-y-4 pt-8">
                                            <div className="bg-white/10 backdrop-blur rounded-lg p-4 border border-white/20 shadow-lg">
                                                <Rocket className="h-8 w-8 text-purple-400 mb-2" />
                                                <div className="h-2 bg-white/20 rounded w-3/4 mb-1" />
                                                <div className="h-2 bg-white/10 rounded w-1/2" />
                                            </div>
                                            <div className="bg-white/10 backdrop-blur rounded-lg p-4 border border-white/20 flex items-center justify-center h-24 shadow-lg">
                                                <div className="text-4xl">💡</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Features Section */}
            <div className="container mx-auto px-4 py-20">
                <div className="text-center mb-16">
                    <h3 className="text-3xl font-bold mb-4">Why Choose IdeaHub?</h3>
                    <p className="text-muted-foreground text-lg">Everything you need to bring your ideas to life</p>
                </div>

                <div className="grid md:grid-cols-3 gap-8">
                    <div className="text-center space-y-4 p-6 rounded-lg border bg-card hover:shadow-lg transition-shadow">
                        <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                            <Users className="h-8 w-8 text-primary" />
                        </div>
                        <h4 className="text-xl font-bold">Collaborative Groups</h4>
                        <p className="text-muted-foreground">
                            Create or join groups with like-minded innovators. Share your ideas and get feedback from the community.
                        </p>
                    </div>

                    <div className="text-center space-y-4 p-6 rounded-lg border bg-card hover:shadow-lg transition-shadow">
                        <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-purple-500/10">
                            <Lightbulb className="h-8 w-8 text-purple-500" />
                        </div>
                        <h4 className="text-xl font-bold">Vote on Ideas</h4>
                        <p className="text-muted-foreground">
                            Democratic decision-making. Let the community decide which ideas deserve to be projects.
                        </p>
                    </div>

                    <div className="text-center space-y-4 p-6 rounded-lg border bg-card hover:shadow-lg transition-shadow">
                        <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-indigo-500/10">
                            <Rocket className="h-8 w-8 text-indigo-500" />
                        </div>
                        <h4 className="text-xl font-bold">Turn Ideas into Projects</h4>
                        <p className="text-muted-foreground">
                            Promote top-voted ideas into actionable projects. Track progress and achieve your goals.
                        </p>
                    </div>
                </div>
            </div>

            {/* CTA Section */}
            <div className="bg-primary/5 border-y">
                <div className="container mx-auto px-4 py-16 text-center space-y-6">
                    <h3 className="text-3xl font-bold">Ready to Start Innovating?</h3>
                    <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                        Join thousands of innovators who are already using IdeaHub to bring their ideas to life.
                    </p>
                    <Link to="/register">
                        <Button size="lg" className="gap-2">
                            Create Your Free Account <ArrowRight className="h-4 w-4" />
                        </Button>
                    </Link>
                </div>
            </div>
        </div>
    );
}
