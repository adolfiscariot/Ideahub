using api.Hubs;
using api.Data;
using api.Models;

namespace api.Services
{
    public class NotificationService : INotificationService
    {
        private readonly IHubContext<NotificationHub> _hubContext;
        private readonly IdeahubDbContext _context;

        public NotificationService(IHubContext<NotificationHub> hubContext, IdeahubDbContext context)
        {
            _hubContext = hubContext;
            _context = context;
        }

        public async Task SendNotificationAsync(string userId, string message, int commentId)
        {
            if (string.IsNullOrEmpty(userId))
                return;

            // Persist the notification to DB
            var notification = new Notification
            {
                RecipientId = userId,
                CommentId = commentId,
                IsRead = false,
                CreatedAt = DateTime.UtcNow
            };
            _context.Notifications.Add(notification);
            await _context.SaveChangesAsync();

            // Push real-time notification via SignalR
            await _hubContext.Clients.Group($"user_{userId}").SendAsync("ReceiveNotification", message);
        }
    }
}