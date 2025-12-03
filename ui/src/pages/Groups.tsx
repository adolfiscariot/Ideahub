import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { api, type Group, type User } from '@/lib/api';
import { Check, LayoutGrid, LayoutList, Users, Lightbulb, Info, Calendar, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function Groups() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

  // Fetch groups from API
  const { data: groupsResponse, isLoading, error } = useQuery({
    queryKey: ['groups'],
    queryFn: () => api.getGroups(),
  });

  // Join group mutation
  const joinGroupMutation = useMutation({
    mutationFn: (groupId: number) => api.joinGroup(groupId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      toast.success('Successfully joined the group!');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to join group');
    },
  });

  const groups = groupsResponse?.data || [];

  const handleJoinGroup = (groupId: number) => {
    joinGroupMutation.mutate(groupId);
  };

  const handleViewIdeas = (groupId: number) => {
    navigate(`/groups/${groupId}`);
  };

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-background">
        <Navbar />

        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-4xl font-serif font-bold mb-2">Groups</h1>
              <p className="text-muted-foreground">
                Join groups to collaborate and share ideas with like-minded people
              </p>
            </div>

            <div className="flex gap-2">
              <Button
                variant={viewMode === 'list' ? 'default' : 'outline'}
                size="icon"
                onClick={() => setViewMode('list')}
              >
                <LayoutList className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'grid' ? 'default' : 'outline'}
                size="icon"
                onClick={() => setViewMode('grid')}
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Loading State */}
          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">Loading groups...</span>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="text-center py-12">
              <p className="text-destructive mb-4">Failed to load groups</p>
              <Button onClick={() => queryClient.invalidateQueries({ queryKey: ['groups'] })}>
                Retry
              </Button>
            </div>
          )}

          {/* Groups List */}
          {!isLoading && !error && (

            <div className={viewMode === 'grid'
              ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'
              : 'flex flex-col gap-4'
            }>
              {groups.length === 0 ? (
                // Beautiful Empty State
                <div className="col-span-full flex flex-col items-center justify-center py-16 px-4">
                  <div className="relative mb-6">
                    <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-purple-500/20 blur-3xl rounded-full" />
                    <Users className="h-24 w-24 text-muted-foreground/40 relative" />
                  </div>
                  <h3 className="text-2xl font-serif font-bold mb-2">No groups yet</h3>
                  <p className="text-muted-foreground text-center max-w-md mb-6">
                    Be the first to create a group and start collaborating! Groups are where great ideas come to life.
                  </p>
                  <Button size="lg" className="gap-2">
                    <Users className="h-5 w-5" />
                    Create Your First Group
                  </Button>
                </div>
              ) : (
                groups.map(group => {
                  return (
                    <Card
                      key={group.id}
                      className="hover:shadow-lg transition-shadow"
                    >
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <CardTitle className="text-xl mb-2">{group.name}</CardTitle>
                            <CardDescription className="line-clamp-2">
                              {group.description}
                            </CardDescription>
                          </div>
                          {group.isMember && (
                            <Badge variant="secondary" className="ml-2">
                              <Check className="h-3 w-3 mr-1" />
                              Member
                            </Badge>
                          )}
                        </div>
                      </CardHeader>

                      <CardContent>
                        <div className="flex items-center justify-between flex-wrap gap-3">
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Users className="h-4 w-4" />
                              <span>{group.memberCount}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Lightbulb className="h-4 w-4" />
                              <span>{group.ideaCount} ideas</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 flex-wrap">
                            {/* View Group Details Button */}
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <Info className="h-4 w-4 mr-1" />
                                  Details
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle className="text-2xl font-serif">{group.name}</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4 pt-4">
                                  <p className="text-muted-foreground">{group.description}</p>
                                  <div className="grid grid-cols-2 gap-4">
                                    <div className="p-4 rounded-lg bg-muted">
                                      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                                        <Users className="h-4 w-4" />
                                        Members
                                      </div>
                                      <p className="text-2xl font-bold">{group.memberCount}</p>
                                    </div>
                                    <div className="p-4 rounded-lg bg-muted">
                                      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                                        <Lightbulb className="h-4 w-4" />
                                        Ideas
                                      </div>
                                      <p className="text-2xl font-bold">{group.ideaCount}</p>
                                    </div>
                                  </div>
                                  <div className="p-4 rounded-lg bg-muted">
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                                      <Calendar className="h-4 w-4" />
                                      Created
                                    </div>
                                    <p className="font-medium">{new Date(group.createdAt).toLocaleDateString('en-US', {
                                      year: 'numeric',
                                      month: 'long',
                                      day: 'numeric'
                                    })}</p>
                                  </div>
                                </div>
                              </DialogContent>
                            </Dialog>

                            {/* View Group Members Button */}
                            <Dialog>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <DialogTrigger asChild>
                                    <Button variant="ghost" size="sm">
                                      <Users className="h-4 w-4 mr-1" />
                                      Members
                                    </Button>
                                  </DialogTrigger>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Click here to view</p>
                                </TooltipContent>
                              </Tooltip>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle className="flex items-center gap-2">
                                    <Users className="h-5 w-5" />
                                    {group.name} Members
                                  </DialogTitle>
                                </DialogHeader>
                                <div className="py-8 text-center text-muted-foreground">
                                  <p>This group has {group.memberCount} members.</p>
                                  <p className="text-sm mt-2">(Member list view coming soon)</p>
                                </div>
                              </DialogContent>
                            </Dialog>

                            {/* View Ideas / Join Button */}
                            {group.isMember ? (
                              <Button
                                onClick={() => handleViewIdeas(group.id)}
                                size="sm"
                              >
                                <Lightbulb className="h-4 w-4 mr-1" />
                                View Ideas
                              </Button>
                            ) : (
                              <Button
                                onClick={() => handleJoinGroup(group.id)}
                                variant="outline"
                                size="sm"
                              >
                                Join Group
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}
