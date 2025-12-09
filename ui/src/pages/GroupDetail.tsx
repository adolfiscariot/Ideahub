import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { mockGroups, getGroupIdeas, getGroupMembers, type Idea } from '@/data/mockData';
import { ArrowLeft, Users, ArrowUp, X } from 'lucide-react';
import { toast } from 'sonner';

type SortOption = 'top' | 'newest' | 'discussed';

export default function GroupDetail() {
  const { groupId } = useParams<{ groupId: string }>();
  const navigate = useNavigate();
  
  const group = mockGroups.find(g => g.id === groupId);
  const [ideas, setIdeas] = useState<Idea[]>(groupId ? getGroupIdeas(groupId) : []);
  const [isMember, setIsMember] = useState(group?.isMember ?? false);
  const [sortBy, setSortBy] = useState<SortOption>('top');
  const [selectedIdea, setSelectedIdea] = useState<Idea | null>(null);

  const sortedIdeas = useMemo(() => {
    const sorted = [...ideas];
    switch (sortBy) {
      case 'top':
        return sorted.sort((a, b) => b.votes - a.votes);
      case 'newest':
        return sorted.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      case 'discussed':
        return sorted.sort((a, b) => b.commentCount - a.commentCount);
      default:
        return sorted;
    }
  }, [ideas, sortBy]);

  if (!group) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-8 text-center">
          <p className="text-muted-foreground">Group not found</p>
          <Button onClick={() => navigate('/groups')} className="mt-4">
            Back to Groups
          </Button>
        </div>
      </div>
    );
  }

  const handleLeaveGroup = () => {
    setIsMember(false);
    toast.success('Left the group');
  };

  const handleVote = (ideaId: string) => {
    setIdeas(prev =>
      prev.map(idea => {
        if (idea.id !== ideaId) return idea;
        
        const hasVoted = idea.userVote === 'up';
        return {
          ...idea,
          votes: hasVoted ? idea.votes - 1 : idea.votes + 1,
          userVote: hasVoted ? null : 'up'
        };
      })
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8">
        <Button 
          variant="ghost" 
          onClick={() => navigate('/groups')}
          className="mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Groups
        </Button>

        {/* Header Section */}
        <div className="mb-8">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <h1 className="text-4xl font-serif font-bold mb-3">{group.name}</h1>
              <p className="text-lg text-muted-foreground mb-4">{group.description}</p>
              <div className="flex items-center gap-4">
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="ghost" size="sm" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground hover:bg-primary/10">
                      <Users className="h-4 w-4" />
                      <span>{group.memberCount} members</span>
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>Group Members</DialogTitle>
                    </DialogHeader>
                    <ScrollArea className="max-h-[400px]">
                      <div className="space-y-3">
                        {getGroupMembers(group.id).map(member => (
                          <div key={member.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50">
                            <Avatar className="h-10 w-10">
                              <AvatarImage src={member.avatar} alt={member.name} />
                              <AvatarFallback className="bg-primary/20 text-primary">
                                {member.name.split(' ').map(n => n[0]).join('')}
                              </AvatarFallback>
                            </Avatar>
                            <span className="font-medium">{member.name}</span>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </DialogContent>
                </Dialog>
                {isMember && (
                  <Badge variant="secondary">Member</Badge>
                )}
              </div>
            </div>
            {isMember && (
              <Button variant="outline" onClick={handleLeaveGroup}>
                Leave Group
              </Button>
            )}
          </div>
        </div>

        {/* Main Content Area with Ideas List and Detail Panel */}
        <div className="flex gap-6">
          {/* Ideas List */}
          <div className={`${selectedIdea ? 'w-1/2' : 'w-full max-w-4xl'} transition-all duration-300`}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-serif font-bold">Ideas</h2>
              <div className="flex gap-2">
                <Button
                  variant={sortBy === 'top' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSortBy('top')}
                >
                  Top Voted
                </Button>
                <Button
                  variant={sortBy === 'newest' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSortBy('newest')}
                >
                  Newest
                </Button>
              </div>
            </div>

            <div className="space-y-4">
              {sortedIdeas.length > 0 ? (
                sortedIdeas.map(idea => (
                  <Card 
                    key={idea.id} 
                    className={`cursor-pointer transition-all hover:shadow-md ${selectedIdea?.id === idea.id ? 'ring-2 ring-primary' : ''}`}
                    onClick={() => setSelectedIdea(idea)}
                  >
                    <CardContent className="pt-6">
                      <div className="flex gap-4">
                        {/* Vote Section - Upvote only */}
                        <div className="flex flex-col items-center gap-1 min-w-[60px]">
                          <Button
                            variant="ghost"
                            size="icon"
                            className={`h-10 w-10 ${idea.userVote === 'up' ? 'text-primary bg-primary/10' : ''}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleVote(idea.id);
                            }}
                          >
                            <ArrowUp className="h-5 w-5" />
                          </Button>
                          <span className="text-lg font-bold">{idea.votes}</span>
                          <span className="text-xs text-muted-foreground">upvotes</span>
                        </div>

                        {/* Content Section */}
                        <div className="flex-1">
                          <h3 className="text-xl font-semibold mb-2">{idea.title}</h3>
                          <p className="text-muted-foreground mb-4 line-clamp-2">{idea.content}</p>
                          
                          <div className="flex items-center justify-end">
                            <span className="text-sm text-muted-foreground">
                              {idea.createdAt.toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <p>No ideas yet. Be the first to share!</p>
                </div>
              )}
            </div>
          </div>

          {/* Right Panel - Idea Detail */}
          {selectedIdea && (
            <div className="w-1/2 sticky top-24 h-fit">
              <Card className="border-2 border-primary/20">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between mb-4">
                    <h2 className="text-2xl font-serif font-bold">{selectedIdea.title}</h2>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => setSelectedIdea(null)}
                      className="hover:bg-muted"
                    >
                      <X className="h-5 w-5" />
                    </Button>
                  </div>
                  
                  <div className="flex items-center gap-4 mb-6">
                    <div className="flex items-center gap-2">
                      <Button
                        variant={selectedIdea.userVote === 'up' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => handleVote(selectedIdea.id)}
                        className="gap-2"
                      >
                        <ArrowUp className="h-4 w-4" />
                        Upvote
                        <Badge variant="secondary" className="ml-1">{selectedIdea.votes}</Badge>
                      </Button>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {selectedIdea.createdAt.toLocaleDateString()}
                    </span>
                  </div>
                  
                  <div className="prose prose-sm max-w-none">
                    <p className="text-foreground leading-relaxed">{selectedIdea.content}</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
