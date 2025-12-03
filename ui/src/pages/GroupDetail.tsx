import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { api, type Idea, type Group } from '@/lib/api';
import { ArrowLeft, Users, ThumbsUp, MessageCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

type SortOption = 'top' | 'newest' | 'discussed';

export default function GroupDetail() {
  const { groupId } = useParams<{ groupId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [sortBy, setSortBy] = useState<SortOption>('top');

  const parsedGroupId = groupId ? parseInt(groupId) : 0;

  // Fetch Group Details
  const { data: groupResponse, isLoading: isGroupLoading } = useQuery({
    queryKey: ['group', parsedGroupId],
    queryFn: () => api.getGroup(parsedGroupId),
    enabled: !!parsedGroupId,
  });

  // Fetch Ideas
  const { data: ideasResponse, isLoading: isIdeasLoading } = useQuery({
    queryKey: ['ideas', parsedGroupId],
    queryFn: () => api.getIdeas(parsedGroupId),
    enabled: !!parsedGroupId,
  });

  const group = groupResponse?.data;
  const ideas = ideasResponse?.data || [];

  // Leave Group Mutation
  const leaveGroupMutation = useMutation({
    mutationFn: () => api.leaveGroup(parsedGroupId),
    onSuccess: () => {
      toast.success('Left the group');
      navigate('/groups');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to leave group');
    },
  });

  // Vote Mutation
  const voteMutation = useMutation({
    mutationFn: ({ ideaId, type }: { ideaId: number; type: 'up' | 'down' }) =>
      api.voteIdea(ideaId, type),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ideas', parsedGroupId] });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to vote');
    },
  });

  const sortedIdeas = useMemo(() => {
    const sorted = [...ideas];
    switch (sortBy) {
      case 'top':
        return sorted.sort((a, b) => b.votes - a.votes);
      case 'newest':
        return sorted.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      case 'discussed':
        return sorted.sort((a, b) => b.commentCount - a.commentCount);
      default:
        return sorted;
    }
  }, [ideas, sortBy]);

  if (isGroupLoading || isIdeasLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

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
                      <span>{group.memberCount || 0} members</span>
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>Group Members</DialogTitle>
                    </DialogHeader>
                    <div className="py-8 text-center text-muted-foreground">
                      <p>This group has {group.memberCount || 0} members.</p>
                      <p className="text-sm mt-2">(Member list view coming soon)</p>
                    </div>
                  </DialogContent>
                </Dialog>
                {group.isMember && (
                  <Badge variant="secondary">Member</Badge>
                )}
              </div>
            </div>
            {group.isMember && (
              <Button variant="outline" onClick={() => leaveGroupMutation.mutate()}>
                Leave Group
              </Button>
            )}
          </div>
        </div>

        {/* Ideas Section */}
        <div>
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
              <Button
                variant={sortBy === 'discussed' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSortBy('discussed')}
              >
                Most Discussed
              </Button>
            </div>
          </div>

          <div className="space-y-4 max-w-4xl">
            {sortedIdeas.length > 0 ? (
              sortedIdeas.map(idea => (
                <Card key={idea.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="pt-6">
                    <div className="flex gap-4">
                      {/* Vote Section - Upvote only */}
                      <div className="flex flex-col items-center gap-1 min-w-[60px]">
                        <Button
                          variant="ghost"
                          size="icon"
                          className={`h-10 w-10 ${idea.userVote === 'up' ? 'text-primary bg-primary/10' : ''}`}
                          onClick={() => voteMutation.mutate({ ideaId: idea.id, type: 'up' })}
                        >
                          <ThumbsUp className="h-5 w-5" />
                        </Button>
                        <span className="text-lg font-bold">{idea.votes}</span>
                      </div>

                      {/* Content Section */}
                      <div className="flex-1">
                        <h3 className="text-xl font-semibold mb-2">{idea.title}</h3>
                        <p className="text-muted-foreground mb-4">{idea.content}</p>

                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            {/* Anonymous avatar instead of name */}
                            <div className="flex items-center gap-2">
                              <Avatar className="h-6 w-6 bg-secondary">
                                <AvatarFallback className="bg-secondary text-secondary-foreground text-xs">
                                  ?
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-sm text-muted-foreground">Anonymous</span>
                            </div>
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                              <MessageCircle className="h-4 w-4" />
                              <span>{idea.commentCount}</span>
                            </div>
                          </div>
                          <span className="text-sm text-muted-foreground">
                            {new Date(idea.createdAt).toLocaleDateString()}
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
      </div>
    </div>
  );
}
