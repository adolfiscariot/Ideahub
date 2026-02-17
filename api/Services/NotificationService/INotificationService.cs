using System.Threading.Task;

namespace api.Services
{
    public interface INotificationService
    {
        Task SendNotificationAsync(string userId, string message);
    }
}