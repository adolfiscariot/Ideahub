import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api, type GroupDto } from '@/lib/api';
import { toast } from 'sonner';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';

interface CreateGroupDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function CreateGroupDialog({ open, onOpenChange }: CreateGroupDialogProps) {
    const queryClient = useQueryClient();
    const [formData, setFormData] = useState<GroupDto>({
        name: '',
        description: '',
    });

    const createGroupMutation = useMutation({
        mutationFn: (data: GroupDto) => api.createGroup(data),
        onSuccess: () => {
            toast.success('Group created successfully!');
            queryClient.invalidateQueries({ queryKey: ['groups'] });
            onOpenChange(false);
            setFormData({ name: '', description: '' });
        },
        onError: (error: Error) => {
            if (error.message.includes('401') || error.message.includes('Unauthorized')) {
                toast.error('Please login to create a group', {
                    description: 'You need to be authenticated to create groups',
                });
            } else {
                toast.error('Failed to create group', {
                    description: error.message || 'Please try again later',
                });
            }
        },
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.name.trim()) {
            toast.error('Group name is required');
            return;
        }

        if (!formData.description.trim()) {
            toast.error('Group description is required');
            return;
        }

        createGroupMutation.mutate(formData);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Create New Group</DialogTitle>
                    <DialogDescription>
                        Start a new group to collaborate with others and share ideas
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit}>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="name">Group Name *</Label>
                            <Input
                                id="name"
                                placeholder="e.g., Product Innovation Team"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                maxLength={100}
                                disabled={createGroupMutation.isPending}
                            />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="description">Description *</Label>
                            <Textarea
                                id="description"
                                placeholder="Describe the purpose and goals of your group..."
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                rows={4}
                                maxLength={500}
                                disabled={createGroupMutation.isPending}
                            />
                            <p className="text-xs text-muted-foreground">
                                {formData.description.length}/500 characters
                            </p>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                            disabled={createGroupMutation.isPending}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={createGroupMutation.isPending}
                            className="gap-2"
                        >
                            {createGroupMutation.isPending && (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            )}
                            Create Group
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
