using api.Hubs;
using api.Data;
using api.Models;
using Microsoft.AspNetCore.SignalR;

namespace api.Services
{
    public class NotificationService : INotificationService
    {
        private readonly IHubContext<NotificationHub> _hubContext;
        private readonly IdeahubDbContext _context;
        private readonly ILogger<NotificationService> _logger;

        public NotificationService(IHubContext<NotificationHub> hubContext, IdeahubDbContext context, ILogger<NotificationService> logger)
        {
            _hubContext = hubContext;
            _context = context;
            _logger = logger;
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

            try
            {
                _context.Notifications.Add(notification);
                await _context.SaveChangesAsync();

                // Push real-time notification via SignalR
                await _hubContext.Clients.Group($"user_{userId}").SendAsync("ReceiveNotification", message);
            }
            catch (Exception ex)
            {
                _logger.LogError($"Error sending notification: {ex.Message}");
            }
        }
    }
}