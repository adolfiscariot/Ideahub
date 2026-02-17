using Microsoft.AspNetCore.SignalR;
using System.Threading.Tasks;

namespace Ideahub.Hubs
{
    public class NotificationHub : Hub
    {
        // This method is called when a client connects
        public override async Task OnConnectedAsync()
        {
            var userId = Context.UserIdentifier;
            if (!string.IsNullOrEmpty(userId))
            {
                // Add the user to a group named "user_{userId}"
                await Groups.AddToGroupAsync(Context.ConnectionId, $"user_{userId}");
            }
            await base.OnConnectedAsync();
        }

        public override async Task OnDisconnectedAsync(Exception? exception)
        {
            await base.OnDisconnectedAsync(exception);
        }
    }
}
