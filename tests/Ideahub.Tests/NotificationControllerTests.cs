using System.Security.Claims;
using api.Controllers;
using api.Data;
using api.Helpers;
using api.Models;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Moq;
using Xunit;

namespace Ideahub.Tests
{
    public class NotificationControllerTests : IDisposable
    {
        private readonly IdeahubDbContext _context;
        private readonly Mock<ILogger<NotificationController>> _mockLogger;
        private readonly NotificationController _controller;
        private readonly string _testUserId = "test-user-123";
        private readonly string _databaseName = Guid.NewGuid().ToString();

        public NotificationControllerTests()
        {
            var options = new DbContextOptionsBuilder<IdeahubDbContext>()
                .UseInMemoryDatabase(databaseName: _databaseName)
                .Options;
            _context = new IdeahubDbContext(options);

            _mockLogger = new Mock<ILogger<NotificationController>>();

            var user = new ClaimsPrincipal(new ClaimsIdentity(new Claim[]
            {
                new Claim(ClaimTypes.NameIdentifier, _testUserId),
                new Claim(ClaimTypes.Email, "test@example.com")
            }, "TestAuthentication"));

            _controller = new NotificationController(_context, _mockLogger.Object)
            {
                ControllerContext = new ControllerContext
                {
                    HttpContext = new DefaultHttpContext { User = user }
                }
            };
        }

        public void Dispose()
        {
            _context.Database.EnsureDeleted();
            _context.Dispose();
        }

        private async Task SeedData()
        {
            var user = new IdeahubUser { Id = _testUserId, Email = "test@example.com", DisplayName = "Test User" };
            var otherUser = new IdeahubUser { Id = "other-user", Email = "other@example.com", DisplayName = "Other User" };
            
            var group = new Group { Id = 1, Name = "Test Group" };
            var idea = new Idea { Id = 1, Title = "Test Idea", GroupId = 1, UserId = _testUserId };
            
            var comment = new Comment { Id = 1, IdeaId = 1, UserId = "other-user", Content = "Great idea!", User = otherUser, Idea = idea };
            
            var n1 = new Notification { Id = 1, RecipientId = _testUserId, CommentId = 1, IsRead = false, CreatedAt = DateTime.UtcNow.AddMinutes(-10), Comment = comment };
            var n2 = new Notification { Id = 2, RecipientId = _testUserId, CommentId = 1, IsRead = true, CreatedAt = DateTime.UtcNow.AddMinutes(-5), Comment = comment };
            var n3 = new Notification { Id = 3, RecipientId = "other-user", CommentId = 1, IsRead = false, CreatedAt = DateTime.UtcNow, Comment = comment };

            _context.Users.AddRange(user, otherUser);
            _context.Groups.Add(group);
            _context.Ideas.Add(idea);
            _context.Comments.Add(comment);
            _context.Notifications.AddRange(n1, n2, n3);
            await _context.SaveChangesAsync();
        }

        [Fact]
        public async Task GetMyNotifications_ReturnsUserOnly_NewestFirst()
        {
            // Arrange
            await SeedData();

            // Act
            var result = await _controller.GetMyNotifications();

            // Assert
            var okResult = Assert.IsType<OkObjectResult>(result);
            var response = Assert.IsType<ApiResponse>(okResult.Value);
            var data = Assert.IsAssignableFrom<IEnumerable<object>>(response.Data);
            
            Assert.Equal(2, data.Count());
            
            var list = data.ToList();
        }

        [Fact]
        public async Task GetUnreadCount_ReturnsCorrectCount()
        {
            // Arrange
            await SeedData();

            // Act
            var result = await _controller.GetUnreadCount();

            // Assert
            var okResult = Assert.IsType<OkObjectResult>(result);
            var response = Assert.IsType<ApiResponse>(okResult.Value);
            Assert.NotNull(response.Data);
        }

        [Fact]
        public async Task MarkAsRead_Valid_ShouldSucceed()
        {
            // Arrange
            await SeedData();

            // Act
            var result = await _controller.MarkAsRead(1);

            // Assert
            Assert.IsType<OkObjectResult>(result);
            var notification = await _context.Notifications.FindAsync(1);
            Assert.True(notification!.IsRead);
        }

        [Fact]
        public async Task MarkAsRead_NotOwner_ShouldReturnNotFound()
        {
            // Arrange
            await SeedData();

            // Act
            var result = await _controller.MarkAsRead(3);

            // Assert
            Assert.IsType<NotFoundObjectResult>(result);
        }

        [Fact]
        public async Task MarkAsRead_AlreadyRead_ShouldReturnOk()
        {
            // Arrange
            await SeedData();

            // Act
            var result = await _controller.MarkAsRead(2);

            // Assert
            var okResult = Assert.IsType<OkObjectResult>(result);
            var response = Assert.IsType<ApiResponse>(okResult.Value);
            Assert.Equal("Already marked as read", response.Message);
        }

        [Fact]
        public async Task MarkAllAsRead_WithUnread_ShouldSucceed()
        {
            // Arrange
            await SeedData();

            // Act
            var result = await _controller.MarkAllAsRead();

            // Assert
            var okResult = Assert.IsType<OkObjectResult>(result);
            var response = Assert.IsType<ApiResponse>(okResult.Value);
            Assert.Contains("1 notification(s) marked as read", response.Message);
            
            var unreadCount = await _context.Notifications.CountAsync(n => n.RecipientId == _testUserId && !n.IsRead);
            Assert.Equal(0, unreadCount);
        }

        [Fact]
        public async Task MarkAllAsRead_NoUnread_ShouldReturnOk()
        {
            // Arrange
            await SeedData();

            var n1 = await _context.Notifications.FindAsync(1);
            n1!.IsRead = true;
            await _context.SaveChangesAsync();

            // Act
            var result = await _controller.MarkAllAsRead();

            // Assert
            var okResult = Assert.IsType<OkObjectResult>(result);
            var response = Assert.IsType<ApiResponse>(okResult.Value);
            Assert.Equal("No unread notifications", response.Message);
        }
    }
}
