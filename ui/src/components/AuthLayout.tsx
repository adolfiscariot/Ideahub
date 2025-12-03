import { Link } from 'react-router-dom';
import adeptLogo from '@/assets/adeptwebp.webp';

interface AuthLayoutProps {
    children: React.ReactNode;
    title: string;
    description: string;
    image?: string;
}

export function AuthLayout({ children, title, description, image }: AuthLayoutProps) {
    return (
        <div className="min-h-screen w-full flex">
            {/* Left Side - Image/Branding */}
            <div className="hidden lg:flex w-1/2 bg-zinc-900 relative items-center justify-center overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 z-10" />
                {image ? (
                    <img
                        src={image}
                        alt="Authentication background"
                        className="absolute inset-0 w-full h-full object-cover opacity-50"
                    />
                ) : (
                    <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1522071820081-009f0129c71c?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center opacity-40" />
                )}

                <div className="relative z-20 p-12 text-white">
                    <div className="flex items-center gap-3 mb-8">
                        <img src={adeptLogo} alt="IdeaHub" className="h-12 w-auto brightness-0 invert" />
                        <span className="text-3xl font-bold font-serif">IdeaHub</span>
                    </div>
                    <h1 className="text-4xl font-bold mb-4">
                        Where Ideas Come to Life
                    </h1>
                    <p className="text-lg text-zinc-300 max-w-md">
                        Join a community of innovators, creators, and thinkers. Share your ideas,
                        collaborate with teams, and turn concepts into reality.
                    </p>
                </div>
            </div>

            {/* Right Side - Form */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-background">
                <div className="w-full max-w-md space-y-8">
                    <div className="text-center lg:text-left">
                        <h2 className="text-3xl font-bold tracking-tight">{title}</h2>
                        <p className="text-muted-foreground mt-2">{description}</p>
                    </div>

                    {children}
                </div>
            </div>
        </div>
    );
}
