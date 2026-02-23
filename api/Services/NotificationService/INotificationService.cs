using System.Threading.Tasks;

namespace api.Services
{
    public interface INotificationService
    {
        Task SendNotificationAsync(string userId, string message, int commentId);
    }
}