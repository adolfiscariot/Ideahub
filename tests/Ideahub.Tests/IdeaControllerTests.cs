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
using Microsoft.Extensions.DependencyInjection;
using Moq;
using Xunit;

namespace Ideahub.Tests
{
    public class IdeaControllerTests : IDisposable
    {
        private readonly IdeahubDbContext _context;
        private readonly IdeaController _controller;
        private readonly Mock<UserManager<IdeahubUser>> _mockUserManager;
        private readonly Mock<IEmailSender> _mockEmailSender;
        private readonly Mock<IServiceScopeFactory> _mockScopeFactory;
        private readonly Mock<IScoringService> _mockScoringService;
        private readonly string _testUserId = "user-123";
        private readonly string _testUserEmail = "test@example.com";

        public IdeaControllerTests()
        {
            var options = new DbContextOptionsBuilder<IdeahubDbContext>()
                .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
                .Options;

            _context = new IdeahubDbContext(options);
            _mockEmailSender = new Mock<IEmailSender>();
            _mockScopeFactory = new Mock<IServiceScopeFactory>();
            _mockScoringService = new Mock<IScoringService>();

            var store = new Mock<IUserStore<IdeahubUser>>();
            _mockUserManager = new Mock<UserManager<IdeahubUser>>(store.Object, null!, null!, null!, null!, null!, null!, null!, null!);

            var logger = new Mock<Microsoft.Extensions.Logging.ILogger<IdeaController>>();

            // Setup Scoped Services for AI Scoring
            var serviceProvider = new Mock<IServiceProvider>();
            serviceProvider.Setup(x => x.GetService(typeof(IScoringService))).Returns(_mockScoringService.Object);

            var user = new ClaimsPrincipal(new ClaimsIdentity(new Claim[]
            {
                new Claim(ClaimTypes.NameIdentifier, _testUserId),
                new Claim(ClaimTypes.Email, _testUserEmail)
            }, "TestAuthentication"));

            _controller = new IdeaController(logger.Object, _context, _mockUserManager.Object, _mockEmailSender.Object, _mockScopeFactory.Object, _mockScoringService.Object)
            {
                ControllerContext = new ControllerContext
                {
                    HttpContext = new DefaultHttpContext 
                    { 
                        User = user,
                        RequestServices = serviceProvider.Object 
                    }
                }
            };
        }

        public void Dispose()
        {
            _context.Database.EnsureDeleted();
            _context.Dispose();
        }

        private async Task SeedBasicData(int groupId = 1)
        {
            var user = new IdeahubUser { Id = _testUserId, Email = _testUserEmail, UserName = _testUserEmail };
            var group = new Group { Id = groupId, Name = "Test Group" };
            var userGroup = new UserGroup { GroupId = groupId, UserId = _testUserId };

            _context.Users.Add(user);
            _context.Groups.Add(group);
            _context.UserGroups.Add(userGroup);
            await _context.SaveChangesAsync();
        }

        [Fact]
        public async Task CreateIdea_MemberSuccess_ShouldSucceed()
        {
            // Arrange
            await SeedBasicData(1);
            var dto = new IdeaDto { Title = "New Idea", ProblemStatement = "P1", ProposedSolution = "S1" };

            // Act
            var result = await _controller.CreateIdea(dto, 1);

            // Assert
            var okResult = Assert.IsType<OkObjectResult>(result);
            Assert.Single(_context.Ideas);
        }

        [Fact]
        public async Task CreateIdea_NotMember_ShouldReturnUnauthorized()
        {
            // Arrange
            _context.Groups.Add(new Group { Id = 1, Name = "Private Group" });
            await _context.SaveChangesAsync();
            var dto = new IdeaDto { Title = "Intruder Idea" };

            // Act
            var result = await _controller.CreateIdea(dto, 1);

            // Assert
            Assert.IsType<UnauthorizedObjectResult>(result);
        }

        [Fact]
        public async Task CreateIdea_TriggersAIScoring_ShouldInvokeService()
        {
            // Arrange
            await SeedBasicData(1);
            var dto = new IdeaDto { Title = "AI Test" };

            // Act
            await _controller.CreateIdea(dto, 1);

            // Assert
            _mockScoringService.Verify(x => x.EvaluateAndStageIdeaAsync(It.IsAny<Idea>()), Times.Once);
        }

        [Fact]
        public async Task UpdateIdea_AsAuthor_ShouldSucceed()
        {
            // Arrange
            await SeedBasicData(1);
            var idea = new Idea { Id = 1, Title = "Old Title", UserId = _testUserId, GroupId = 1 };
            _context.Ideas.Add(idea);
            await _context.SaveChangesAsync();

            var updateDto = new IdeaUpdateDto { Title = "New Title" };

            // Act
            var result = await _controller.UpdateIdea(1, updateDto);

            // Assert
            Assert.IsType<OkObjectResult>(result);
            var updatedIdea = await _context.Ideas.FindAsync(1);
            Assert.Equal("New Title", updatedIdea!.Title);
        }

        [Fact]
        public async Task UpdateIdea_NotAuthor_ShouldReturnNotFound()
        {
            // Arrange
            await SeedBasicData(1);
            var idea = new Idea { Id = 1, Title = "Other Idea", UserId = "other-user", GroupId = 1 };
            _context.Ideas.Add(idea);
            await _context.SaveChangesAsync();

            var updateDto = new IdeaUpdateDto { Title = "Hack Title" };

            // Act
            var result = await _controller.UpdateIdea(1, updateDto);

            // Assert
            Assert.IsType<NotFoundObjectResult>(result);
        }

        [Fact]
        public async Task UpdateScore_HighScore_ShouldAdvanceToBusinessCase()
        {
            // Arrange
            await SeedBasicData(1);
            var idea = new Idea { Id = 1, Title = "Scoring Idea", UserId = _testUserId, GroupId = 1, CurrentStage = ScoringStage.Evaluation };
            _context.Ideas.Add(idea);
            await _context.SaveChangesAsync();

            var updateDto = new IdeaUpdateDto { Score = 75.0f };

            // Act
            await _controller.UpdateIdea(1, updateDto);

            // Assert
            _mockScoringService.Verify(s => s.SetStageByScore(It.IsAny<Idea>(), 75.0f), Times.Once);
        }

        [Fact]
        public async Task DeleteIdea_AsAuthor_ShouldSucceed()
        {
            // Arrange
            await SeedBasicData(1);
            var idea = new Idea { Id = 1, Title = "Trash It", UserId = _testUserId, GroupId = 1 };
            _context.Ideas.Add(idea);
            await _context.SaveChangesAsync();

            // Act
            var result = await _controller.DeleteIdea(1);

            // Assert
            Assert.IsType<OkObjectResult>(result);
            Assert.Empty(_context.Ideas);
        }

        [Fact]
        public async Task ViewIdeas_GroupIsolation_ShouldOnlyShowOwnGroup()
        {
            // Arrange
            await SeedBasicData(1); 
            _context.Ideas.Add(new Idea { Id = 1, Title = "Group 1 Idea", GroupId = 1 });
            _context.Ideas.Add(new Idea { Id = 2, Title = "Group 2 Idea", GroupId = 2 });
            _context.Groups.Add(new Group { Id = 2, Name = "Secret Group" });
            await _context.SaveChangesAsync();

            // Act
            var result = await _controller.ViewIdeas(1, null, null, null);

            // Assert
            var okResult = Assert.IsType<OkObjectResult>(result);
            var response = Assert.IsType<ApiResponse>(okResult.Value);
            var list = Assert.IsAssignableFrom<System.Collections.IEnumerable>(response.Data);
            
            int count = 0; foreach (var item in list) count++;
            Assert.Equal(1, count);
        }

        [Fact]
        public async Task OpenIdea_ValidAccess_ShouldReturnDetails()
        {
            // Arrange
            await SeedBasicData(1);
            var idea = new Idea { Id = 10, Title = "Deep Dive", GroupId = 1, UserId = _testUserId };
            _context.Ideas.Add(idea);
            await _context.SaveChangesAsync();

            // Act
            var result = await _controller.OpenIdea(1, 10);

            // Assert
            var okResult = Assert.IsType<OkObjectResult>(result);
            var response = Assert.IsType<ApiResponse>(okResult.Value);
            var details = Assert.IsType<IdeaDetailsDto>(response.Data);
            Assert.Equal("Deep Dive", details.Title);
        }

        [Fact]
        public async Task OpenIdea_ExistentIdeaInOtherGroup_ShouldReturnNotFound()
        {
             // Arrange
            await SeedBasicData(1); // User is in Group 1
            var group2 = new Group { Id = 2, Name = "Other Group" };
            var ideaFromOtherGroup = new Idea { Id = 50, Title = "Secret Idea", GroupId = 2, UserId = "other-user" };
            
            _context.Groups.Add(group2);
            _context.Ideas.Add(ideaFromOtherGroup);
            await _context.SaveChangesAsync();

            // Act: Try to open Idea 50 from Group 1 perspective
            var result = await _controller.OpenIdea(1, 50);

            // Assert: Should be NotFound (Stealth 404), even though ID 50 exists in Group 2.
            Assert.IsType<NotFoundObjectResult>(result);
        }

        [Fact]
        public async Task CloseIdea_Success_ShouldUpdateStatus()
        {
            // Arrange
            await SeedBasicData(1);
            var idea = new Idea { Id = 1, Title = "Idea to Close", GroupId = 1, Status = IdeaStatus.Open };
            _context.Ideas.Add(idea);
            await _context.SaveChangesAsync();

            // Act
            var result = await _controller.CloseIdea(1);

            // Assert
            Assert.IsType<OkObjectResult>(result);
            var updatedIdea = await _context.Ideas.FindAsync(1);
            Assert.Equal(IdeaStatus.Closed, updatedIdea!.Status);
        }
        [Fact]
        public async Task CreateIdea_GroupNotFound_ShouldReturnNotFound()
        {
            // Act
            var result = await _controller.CreateIdea(new IdeaDto { Title = "Ghost" }, 999);

            // Assert
            Assert.IsType<NotFoundObjectResult>(result);
        }

        [Fact]
        public async Task ViewIdeas_NoIdeas_ShouldReturnEmptyList()
        {
            // Arrange
            await SeedBasicData(1);

            // Act
            var result = await _controller.ViewIdeas(1, null, null, null);

            // Assert
            var okResult = Assert.IsType<OkObjectResult>(result);
            var response = Assert.IsType<ApiResponse>(okResult.Value);
            var list = Assert.IsAssignableFrom<System.Collections.IEnumerable>(response.Data);
            
            int count = 0; foreach (var item in list) count++;
            Assert.Equal(0, count);
        }

        [Fact]
        public async Task OpenIdea_IdeaNotFound_ShouldReturnNotFound()
        {
            // Arrange
            await SeedBasicData(1);

            // Act
            var result = await _controller.OpenIdea(1, 999);

            // Assert
            Assert.IsType<NotFoundObjectResult>(result);
        }

        [Fact(Skip = "This test is obsolete because promotion is now handled during Project creation by committee")]
        public async Task PromoteIdea_AsGroupAdmin_ShouldSucceed()
        {
            // Arrange
            await SeedBasicData(1);
            var idea = new Idea { Id = 1, Title = "Idea to Promote", GroupId = 1 };
            _context.Ideas.Add(idea);
            await _context.SaveChangesAsync();

            // Act
            var result = await _controller.PromoteIdea(1, 1);

            // Assert
            Assert.IsType<OkObjectResult>(result);
            var updatedIdea = await _context.Ideas.FindAsync(1);
            Assert.True(updatedIdea!.IsPromotedToProject);
        }
    }
}
