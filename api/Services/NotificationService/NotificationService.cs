using Microsoft.AspNetCore.SignalR;
using Ideahub.Hubs;

namespace api.Services
{

    public class NotificationService : INotificationService
    {
        private readonly IHubContext<NotificationHub> _hubContext;

        public NotificationService(IHubContext<NotificationHub> hubContext)
        {
            _hubContext = hubContext;
        }

        public async Task SendNotificationAsync(string userId, string message)
        {
            if (string.IsNullOrEmpty(userId))
            {
                return;
            }

            // Send to the specific user group created in the Hub
            await _hubContext.Clients.Group($"user_{userId}").SendAsync("ReceiveNotification", message);
        }
    }
}
