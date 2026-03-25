using System.Security.Claims;
using api.Controllers;
using api.Data;
using api.Helpers;
using api.Models;
using api.Services;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Moq;
using Xunit;

namespace Ideahub.Tests
{
    public class CommentControllerTests : IDisposable
    {
        private readonly IdeahubDbContext _context;
        private readonly Mock<INotificationService> _mockNotificationService;
        private readonly Mock<ILogger<CommentController>> _mockLogger;
        private readonly Mock<UserManager<IdeahubUser>> _mockUserManager;
        private readonly CommentController _controller;
        private readonly string _testUserId = "user-123";

        public CommentControllerTests()
        {
            var options = new DbContextOptionsBuilder<IdeahubDbContext>()
                .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
                .Options;
            _context = new IdeahubDbContext(options);

            _mockNotificationService = new Mock<INotificationService>();
            _mockLogger = new Mock<ILogger<CommentController>>();
            
            var userStoreMock = new Mock<IUserStore<IdeahubUser>>();
            _mockUserManager = new Mock<UserManager<IdeahubUser>>(
                userStoreMock.Object, null!, null!, null!, null!, null!, null!, null!, null!);

            // Setup Controller with User Context
            var user = new ClaimsPrincipal(new ClaimsIdentity(new Claim[]
            {
                new Claim(ClaimTypes.NameIdentifier, _testUserId),
                new Claim(ClaimTypes.Email, "test@test.com")
            }, "TestAuthentication"));

            _controller = new CommentController(_context, _mockLogger.Object, _mockUserManager.Object, _mockNotificationService.Object)
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

        #region CreateComment

        [Fact]
        public async Task CreateComment_UserShouldPostSuccessfullyAndNotifyOwner()
        {
            // Arrange
            var ownerId = "owner-456";
            var idea = new Idea { Title = "Cool Idea", UserId = ownerId, GroupId = 1 };
            _context.Ideas.Add(idea);
            await _context.SaveChangesAsync();

            var dto = new CommentsDto { Content = "Great work!" };

            // Act
            var result = await _controller.CreateComment(dto, idea.Id);

            // Assert
            var okResult = Assert.IsType<OkObjectResult>(result);
            Assert.Single(_context.Comments);
            _mockNotificationService.Verify(n => n.SendNotificationAsync(ownerId, It.Is<string>(s => s.Contains("Great work!")), It.IsAny<int>()), Times.Once);
        }

        [Fact]
        public async Task CreateComment_AppShouldNotNotifyOwner_WhenOwnerCommentsOnOwnIdea()
        {
            // Arrange
            var idea = new Idea { Title = "My Idea", UserId = _testUserId, GroupId = 1 };
            _context.Ideas.Add(idea);
            await _context.SaveChangesAsync();

            var dto = new CommentsDto { Content = "Self comment" };

            // Act
            var result = await _controller.CreateComment(dto, idea.Id);

            // Assert
            Assert.IsType<OkObjectResult>(result);
            _mockNotificationService.Verify(n => n.SendNotificationAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<int>()), Times.Never);
        }

        [Fact]
        public async Task CreateComment_AppShouldReturnNotFound_WhenIdeaDoesNotExist()
        {
            // Arrange
            var dto = new CommentsDto { Content = "Ghost comment" };

            // Act
            var result = await _controller.CreateComment(dto, 999);

            // Assert
            Assert.IsType<NotFoundObjectResult>(result);
        }

        #endregion

        #region ViewComments

        [Fact]
        public async Task ViewComments_UserShouldSeeAllCommentsForSpecificIdea()
        {
            // Arrange
            var idea1 = new Idea { Title = "Idea 1", UserId = "u1", GroupId = 1 };
            var idea2 = new Idea { Title = "Idea 2", UserId = "u1", GroupId = 1 };
            _context.Ideas.AddRange(idea1, idea2);
            await _context.SaveChangesAsync();

            _context.Comments.AddRange(
                new Comment { Content = "C1", IdeaId = idea1.Id, UserId = "u2" },
                new Comment { Content = "C2", IdeaId = idea1.Id, UserId = "u3" },
                new Comment { Content = "C3", IdeaId = idea2.Id, UserId = "u2" } 
            );
            await _context.SaveChangesAsync();

            // Act
            var result = await _controller.ViewComments(idea1.Id);

            // Assert
            var okResult = Assert.IsType<OkObjectResult>(result);
            var response = Assert.IsType<ApiResponse>(okResult.Value);
            var list = Assert.IsAssignableFrom<System.Collections.IEnumerable>(response.Data);
            
            int count = 0;
            foreach (var item in list) count++;
            Assert.Equal(2, count);
        }

        [Fact]
        public async Task ViewComments_AppShouldReturnEmptyList_WhenNoCommentsExist()
        {
            // Arrange
            var idea = new Idea { Title = "Empty Idea", UserId = "u1", GroupId = 1 };
            _context.Ideas.Add(idea);
            await _context.SaveChangesAsync();

            // Act
            var result = await _controller.ViewComments(idea.Id);

            // Assert
            var okResult = Assert.IsType<OkObjectResult>(result);
            var response = Assert.IsType<ApiResponse>(okResult.Value);
            Assert.Contains("No comments found", response.Message);
        }

        #endregion

        #region DeleteComment

        [Fact]
        public async Task DeleteComment_UserShouldSuccess_WhenOwnerOfComment()
        {
            // Arrange
            var idea = new Idea { Title = "Topic", UserId = "u1", GroupId = 1 };
            _context.Ideas.Add(idea);
            await _context.SaveChangesAsync();

            var comment = new Comment { Content = "My comment", UserId = _testUserId, IdeaId = idea.Id };
            _context.Comments.Add(comment);
            await _context.SaveChangesAsync();

            // Act
            var result = await _controller.DeleteComment(comment.Id);

            // Assert
            Assert.IsType<OkObjectResult>(result);
            Assert.Empty(_context.Comments);
        }

        [Fact]
        public async Task DeleteComment_AppShouldReturnUnauthorized_WhenNotAuthor()
        {
            // Arrange
            var idea = new Idea { Title = "Topic", UserId = "u1", GroupId = 1 };
            _context.Ideas.Add(idea);
            await _context.SaveChangesAsync();

            var comment = new Comment { Content = "Other comment", UserId = "other-user", IdeaId = idea.Id };
            _context.Comments.Add(comment);
            await _context.SaveChangesAsync();

            // Act
            var result = await _controller.DeleteComment(comment.Id);

            // Assert
            Assert.IsType<UnauthorizedObjectResult>(result);
            Assert.Single(_context.Comments); // Still exists
        }

        [Fact]
        public async Task DeleteComment_AppShouldReturnNotFound_WhenCommentDoesNotExist()
        {
            // Act
            var result = await _controller.DeleteComment(999);

            // Assert
            Assert.IsType<NotFoundObjectResult>(result);
        }

        #endregion
    }
}
