import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { mockGroups, getGroupMembers, type Group } from '@/data/mockData';
import { Check, LayoutGrid, LayoutList, Users, Lightbulb, Info, Calendar } from 'lucide-react';
import { toast } from 'sonner';

export default function Groups() {
  const navigate = useNavigate();
  const [groups, setGroups] = useState<Group[]>(mockGroups);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

  const handleJoinGroup = (groupId: string) => {
    setGroups(prev =>
      prev.map(g =>
        g.id === groupId
          ? { ...g, isMember: true, memberCount: g.memberCount + 1 }
          : g
      )
    );
    toast.success('Successfully joined the group!');
  };

  const handleViewIdeas = (groupId: string) => {
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

          <div className={viewMode === 'grid' 
            ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'
            : 'flex flex-col gap-4'
          }>
            {groups.map(group => {
              const members = getGroupMembers(group.id);
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
                                <p className="font-medium">{group.createdAt.toLocaleDateString('en-US', { 
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
                                {group.name} Members ({members.length})
                              </DialogTitle>
                            </DialogHeader>
                            <ScrollArea className="h-[300px] pr-4">
                              <div className="space-y-3">
                                {members.length > 0 ? (
                                  members.map(member => (
                                    <div key={member.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent transition-colors">
                                      <Avatar className="h-10 w-10">
                                        <AvatarImage src={member.avatar} alt={member.name} />
                                        <AvatarFallback>{member.name[0]}</AvatarFallback>
                                      </Avatar>
                                      <span className="text-sm font-medium">{member.name}</span>
                                    </div>
                                  ))
                                ) : (
                                  <p className="text-muted-foreground text-center py-8">No members yet</p>
                                )}
                              </div>
                            </ScrollArea>
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
            })}
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
