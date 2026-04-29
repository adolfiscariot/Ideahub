using System.Security.Claims;
using System.Text.Json;
using api.Controllers;
using api.Data;
using api.Helpers;
using api.Models;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Moq;
using Xunit;

namespace Ideahub.Tests
{
    public class AnalyticsControllerTests : IDisposable
    {
        private readonly IdeahubDbContext _context;
        private readonly Mock<UserManager<IdeahubUser>> _mockUserManager;
        private readonly Mock<ILogger<AnalyticsController>> _mockLogger;
        private readonly AnalyticsController _controller;
        private readonly string _testUserId = "user-123";

        public AnalyticsControllerTests()
        {
            var options = new DbContextOptionsBuilder<IdeahubDbContext>()
                .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
                .Options;
            _context = new IdeahubDbContext(options);

            var userStoreMock = new Mock<IUserStore<IdeahubUser>>();
            _mockUserManager = new Mock<UserManager<IdeahubUser>>(
                userStoreMock.Object, null!, null!, null!, null!, null!, null!, null!, null!);

            _mockLogger = new Mock<ILogger<AnalyticsController>>();

            // Setup Controller with User Context
            var user = new ClaimsPrincipal(new ClaimsIdentity(new Claim[]
            {
                new Claim(ClaimTypes.NameIdentifier, _testUserId),
                new Claim(ClaimTypes.Email, "test@test.com")
            }, "TestAuthentication"));

            _controller = new AnalyticsController(_context, _mockLogger.Object, _mockUserManager.Object)
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

        // Helper to handle anonymous types across assemblies (internal in API, inaccessible to Tests)
        private T? GetData<T>(object data)
        {
            var json = JsonSerializer.Serialize(data);
            return JsonSerializer.Deserialize<T>(json);
        }

        #region GetMostVotedIdeas

        [Fact]
        public async Task GetMostVotedIdeas_UserShouldSeeTop3RankedByActiveVotes()
        {
            // Arrange
            var user = new IdeahubUser { Id = "u1", DisplayName = "Author", Email = "a@a.com" };
            var group = new Group { Id = 1, Name = "Group A" };
            _context.Users.Add(user);
            _context.Groups.Add(group);

            var ideas = new List<Idea>
            {
                new() { Id = 1, Title = "Idea 1", UserId = "u1", GroupId = 1, Votes = new List<Vote> { new() { UserId = "u2" }, new() { UserId = "u3" } } },
                new() { Id = 2, Title = "Idea 2", UserId = "u1", GroupId = 1, Votes = new List<Vote> { new() { UserId = "u2" } } },
                new() { Id = 3, Title = "Idea 3", UserId = "u1", GroupId = 1, Votes = new List<Vote> { new() { UserId = "u2" }, new() { UserId = "u3" }, new() { UserId = "u4" } } },
                new() { Id = 4, Title = "Idea 4", UserId = "u1", GroupId = 1, Votes = new List<Vote>() }
            };
            _context.Ideas.AddRange(ideas);
            await _context.SaveChangesAsync();

            // Act
            var result = await _controller.GetMostVotedIdeas();

            // Assert
            var okResult = Assert.IsType<OkObjectResult>(result);
            var response = Assert.IsType<ApiResponse>(okResult.Value);

            var list = GetData<List<JsonElement>>(response.Data!);
            Assert.NotNull(list);
            Assert.Equal(3, list.Count);

            // Should be sorted 3, 1, 2 (by vote count)
            Assert.Equal(3, list[0].GetProperty("Id").GetInt32());
            Assert.Equal(3, list[0].GetProperty("VoteCount").GetInt32());
            Assert.Equal(1, list[1].GetProperty("Id").GetInt32());
            Assert.Equal(2, list[1].GetProperty("VoteCount").GetInt32());
        }

        [Fact]
        public async Task GetMostVotedIdeas_UserShouldSeeMembershipStatus()
        {
            // Arrange
            var author = new IdeahubUser { Id = "other", DisplayName = "Other Author", Email = "o@o.com" };
            _context.Users.Add(author);

            var group = new Group { Id = 1, Name = "Group A" };
            group.UserGroups.Add(new UserGroup { UserId = _testUserId }); // Current user is a member
            _context.Groups.Add(group);

            _context.Ideas.Add(new Idea { Id = 1, Title = "Test", GroupId = 1, UserId = "other" });
            await _context.SaveChangesAsync();

            // Act
            var result = await _controller.GetMostVotedIdeas();

            // Assert
            var okResult = Assert.IsType<OkObjectResult>(result);
            var response = Assert.IsType<ApiResponse>(okResult.Value);
            var list = GetData<List<JsonElement>>(response.Data!);
            Assert.NotEmpty(list!);
            Assert.True(list![0].GetProperty("IsMember").GetBoolean());
        }

        #endregion

        #region GetTopContributors

        [Fact]
        public async Task GetTopContributors_UserShouldSeeHighlyActiveAuthorsExcludingZeroCount()
        {
            // Arrange
            var user1 = new IdeahubUser { Id = "u1", DisplayName = "Active", Email = "a@a.com" };
            var user2 = new IdeahubUser { Id = "u2", DisplayName = "Inactive", Email = "b@b.com" };
            _context.Users.AddRange(user1, user2);

            _context.Ideas.Add(new Idea { Title = "Idea 1", UserId = "u1" });
            await _context.SaveChangesAsync();

            // Act
            var result = await _controller.GetTopContributors();

            // Assert
            var okResult = Assert.IsType<OkObjectResult>(result);
            var response = Assert.IsType<ApiResponse>(okResult.Value);
            var list = GetData<List<JsonElement>>(response.Data!);

            Assert.Single(list!);
            Assert.Equal("Active", list![0].GetProperty("DisplayName").GetString());
            Assert.Equal(1, list![0].GetProperty("IdeaCount").GetInt32());
        }

        #endregion

        #region GetPromotedIdeas

        [Fact]
        public async Task GetPromotedIdeas_UserShouldOnlySeeIdeasMarkedAsProjects()
        {
            // Arrange
            var author = new IdeahubUser { Id = "u1", DisplayName = "Author", Email = "a@a.com" };
            _context.Users.Add(author);

            var group = new Group { Id = 1, Name = "Group A" };
            _context.Groups.Add(group);

            var idea1 = new Idea { Id = 1, Title = "Promoted", IsPromotedToProject = true, UserId = "u1", GroupId = 1 };
            var idea2 = new Idea { Id = 2, Title = "Draft", IsPromotedToProject = false, UserId = "u1", GroupId = 1 };
            _context.Ideas.AddRange(idea1, idea2);

            var project = new Project { Id = 10, IdeaId = 1, Title = "Project X", CreatedByUserId = "u1" };
            _context.Projects.Add(project);
            await _context.SaveChangesAsync();

            // Act
            var result = await _controller.GetPromotedIdeas();

            // Assert
            var okResult = Assert.IsType<OkObjectResult>(result);
            var response = Assert.IsType<ApiResponse>(okResult.Value);
            var list = GetData<List<JsonElement>>(response.Data!);

            Assert.Single(list!);
            Assert.Equal(1, list![0].GetProperty("Id").GetInt32());
            Assert.Equal(10, list![0].GetProperty("ProjectId").GetInt32());
        }

        #endregion

        #region GetIdeaStatistics

        [Fact]
        public async Task GetIdeaStatistics_AppShouldAggregateCorrectCounts()
        {
            // Arrange
            _context.Ideas.AddRange(
                new() { Title = "O1", Status = IdeaStatus.Open, UserId = "u1" },
                new() { Title = "O2", Status = IdeaStatus.Open, UserId = "u1" },
                new() { Title = "P1", Status = IdeaStatus.Closed, IsPromotedToProject = true, UserId = "u1" },
                new() { Title = "C1", Status = IdeaStatus.Closed, UserId = "u1" },
                new() { Title = "D1", IsDeleted = true, UserId = "u1" }
            );
            await _context.SaveChangesAsync();

            // Act
            var result = await _controller.GetIdeaStatistics();

            // Assert
            var okResult = Assert.IsType<OkObjectResult>(result);
            var response = Assert.IsType<ApiResponse>(okResult.Value);
            var stats = GetData<JsonElement>(response.Data!);

            Assert.Equal(4, stats.GetProperty("Total").GetInt32());
            Assert.Equal(2, stats.GetProperty("Open").GetInt32());
            Assert.Equal(1, stats.GetProperty("Promoted").GetInt32());
            Assert.Equal(2, stats.GetProperty("Closed").GetInt32());
        }

        #endregion

        #region GetGroupEngagement

        [Fact]
        public async Task GetGroupEngagement_AppShouldRankByCombinedActivity()
        {
            // Arrange
            var g1 = new Group { Id = 1, Name = "High Engagement", IsActive = true };
            var g2 = new Group { Id = 2, Name = "Low Engagement", IsActive = true };
            _context.Groups.AddRange(g1, g2);

            // G1: 1 idea + 2 votes = 3
            var idea1 = new Idea { Id = 1, GroupId = 1, UserId = "u1" };
            idea1.Votes.Add(new Vote { UserId = "u2" });
            idea1.Votes.Add(new Vote { UserId = "u3" });

            // G2: 1 idea + 0 votes = 1
            var idea2 = new Idea { Id = 2, GroupId = 2, UserId = "u1" };

            _context.Ideas.AddRange(idea1, idea2);
            await _context.SaveChangesAsync();

            // Act
            var result = await _controller.GetGroupEngagement();

            // Assert
            var okResult = Assert.IsType<OkObjectResult>(result);
            var response = Assert.IsType<ApiResponse>(okResult.Value);
            var list = GetData<List<JsonElement>>(response.Data!);

            Assert.Equal(1, list![0].GetProperty("Id").GetInt32()); // High Engagement first
            Assert.Equal(1, list![0].GetProperty("IdeaCount").GetInt32());
            Assert.Equal(2, list![0].GetProperty("VoteCount").GetInt32());
        }

        #endregion

        #region GetPersonalStats

        [Fact]
        public async Task GetPersonalStats_UserShouldSeeTargetedActivityCounts()
        {
            // Arrange
            _context.Ideas.Add(new Idea { Title = "My Idea", UserId = _testUserId });
            _context.Votes.Add(new Vote { UserId = _testUserId });
            _context.Groups.Add(new Group { Name = "My Group", CreatedByUserId = _testUserId });

            // Other data should not count
            _context.Ideas.Add(new Idea { Title = "Other", UserId = "other" });
            await _context.SaveChangesAsync();

            // Act
            var result = await _controller.GetPersonalStats();

            // Assert
            var okResult = Assert.IsType<OkObjectResult>(result);
            var response = Assert.IsType<ApiResponse>(okResult.Value);
            var stats = GetData<JsonElement>(response.Data!);

            Assert.Equal(1, stats.GetProperty("IdeasCreated").GetInt32());
            Assert.Equal(1, stats.GetProperty("VotesCast").GetInt32());
            Assert.Equal(1, stats.GetProperty("GroupsCreated").GetInt32());
        }

        [Fact]
        public async Task GetPersonalStats_AppShouldReturnUnauthorized_WhenUserClaimIsMissing()
        {
            // Arrange - Create a controller with no User Identity
            var anonymousController = new AnalyticsController(_context, _mockLogger.Object, _mockUserManager.Object)
            {
                ControllerContext = new ControllerContext
                {
                    HttpContext = new DefaultHttpContext { User = new ClaimsPrincipal(new ClaimsIdentity()) }
                }
            };

            // Act
            var result = await anonymousController.GetPersonalStats();

            // Assert
            Assert.IsType<UnauthorizedObjectResult>(result);
        }

        #endregion
    }
}
