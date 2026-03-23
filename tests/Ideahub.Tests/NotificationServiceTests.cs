using api.Hubs;
using api.Data;
using api.Models;
using api.Services;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Moq;
using Xunit;

namespace Ideahub.Tests
{
    public class NotificationServiceTests
    {
        private readonly Mock<IHubContext<NotificationHub>> _mockHubContext;
        private readonly Mock<IHubClients> _mockClients;
        private readonly Mock<ISingleClientProxy> _mockGroupProxy;
        private readonly Mock<ILogger<NotificationService>> _mockLogger;
        private readonly IdeahubDbContext _context;

        public NotificationServiceTests()
        {
            _mockHubContext = new Mock<IHubContext<NotificationHub>>();
            _mockClients = new Mock<IHubClients>();
            _mockGroupProxy = new Mock<ISingleClientProxy>();
            _mockLogger = new Mock<ILogger<NotificationService>>();

            // 1. Setup In-Memory Database
            var options = new DbContextOptionsBuilder<IdeahubDbContext>()
                .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
                .Options;
            _context = new IdeahubDbContext(options);

            // 2. Setup SignalR Mocks
            _mockHubContext.Setup(h => h.Clients).Returns(_mockClients.Object);
            _mockClients.Setup(c => c.Group(It.IsAny<string>())).Returns(_mockGroupProxy.Object);
        }

        private NotificationService CreateService()
        {
            return new NotificationService(_mockHubContext.Object, _context, _mockLogger.Object);
        }

        [Fact]
        public async Task SendNotificationAsync_ShouldReturnImmediately_WhenUserIdIsEmpty()
        {
            // Arrange
            var service = CreateService();

            // Act
            await service.SendNotificationAsync("", "Test Message", 1);

            // Assert
            // Verify SaveChanges was NEVER called
            var count = await _context.Notifications.CountAsync();
            Assert.Equal(0, count);

            // Verify SignalR was NEVER called
            _mockClients.Verify(c => c.Group(It.IsAny<string>()), Times.Never);
        }

        [Fact]
        public async Task SendNotificationAsync_ShouldSaveToDbAndCallSignalR_WhenSuccessful()
        {
            // Arrange
            var service = CreateService();
            string userId = "user123";
            string message = "Hello World";
            
            // 1. Create mock user, idea and comment
            var user = new IdeahubUser { Id = userId, UserName = "testuser", Email = "test@test.com", DisplayName = "Test User" };
            var idea = new Idea { Title = "Test Idea", StrategicAlignment = "Align", ProblemStatement = "Prob", ProposedSolution = "Sol", UseCase = "Use", InnovationCategory = "Cat", UserId = userId };
            var comment = new Comment { Content = "Test Comment", UserId = userId, Idea = idea };
            
            _context.Users.Add(user);
            _context.Comments.Add(comment);
            await _context.SaveChangesAsync();

            // Act
            await service.SendNotificationAsync(userId, message, comment.Id);

            // Assert
            // 1. Check DB
            var notification = await _context.Notifications.FirstOrDefaultAsync();
            Assert.NotNull(notification);
            Assert.Equal(userId, notification.RecipientId);
            Assert.Equal(comment.Id, notification.CommentId);

            // 2. Check SignalR
            _mockClients.Verify(c => c.Group($"user_{userId}"), Times.Once);
        }


        [Fact]
        public async Task SendNotificationAsync_ShouldLogError_WhenDatabaseFails()
        {
            // Arrange
            // We can't easily make the In-Memory DB "fail," so we'll pass a null context 
            // or we could mock the context (but mocks for DbContext are complex).
            // For now, let's just trigger a null reference by not initializing the DB properly if we wanted.
            
            var service = new NotificationService(_mockHubContext.Object, null!, _mockLogger.Object);

            // Act
            await service.SendNotificationAsync("user123", "Message", 1);

            // Assert
            // Verify logger was called with an error
            _mockLogger.Verify(
                l => l.Log(
                    LogLevel.Error,
                    It.IsAny<EventId>(),
                    It.Is<It.IsAnyType>((v, t) => v.ToString()!.Contains("Error sending notification")),
                    It.IsAny<Exception>(),
                    It.IsAny<Func<It.IsAnyType, Exception?, string>>()
                ),
                Times.Once
            );
        }
    }
}
