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
    public class VoteControllerTests : IDisposable
    {
        private readonly IdeahubDbContext _context;
        private readonly Mock<ILogger<VoteController>> _mockLogger;
        private readonly VoteController _controller;
        private readonly string _testUserId = "user-123";
        private readonly string _testUserEmail = "test@test.com";
        private readonly string _databaseName = Guid.NewGuid().ToString();

        public VoteControllerTests()
        {
            var options = new DbContextOptionsBuilder<IdeahubDbContext>()
                .UseInMemoryDatabase(databaseName: _databaseName)
                .Options;
            _context = new IdeahubDbContext(options);

            _mockLogger = new Mock<ILogger<VoteController>>();

            var user = new ClaimsPrincipal(new ClaimsIdentity(new Claim[]
            {
                new Claim(ClaimTypes.NameIdentifier, _testUserId),
                new Claim(ClaimTypes.Email, _testUserEmail)
            }, "TestAuthentication"));

            _controller = new VoteController(_mockLogger.Object, _context)
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

        private async Task SeedBasicData(int groupId = 1, int ideaId = 1, bool userInGroup = true)
        {
            var user = new IdeahubUser { Id = _testUserId, UserName = "testuser", Email = _testUserEmail, DisplayName = "Test User" };
            var group = new Group { Id = groupId, Name = "Test Group" };
            var idea = new Idea { Id = ideaId, Title = "Vote For Me", UserId = "other-user", GroupId = groupId, ProblemStatement = "Some Problem" };

            _context.Users.Add(user);
            _context.Groups.Add(group);
            _context.Ideas.Add(idea);

            if (userInGroup)
            {
                _context.UserGroups.Add(new UserGroup { GroupId = groupId, UserId = _testUserId });
            }

            await _context.SaveChangesAsync();
        }

        #region Vote

        [Fact]
        public async Task CastVote_ValidMember_ShouldReturnOk()
        {
            // Arrange
            await SeedBasicData();

            // Act
            var result = await _controller.CastVote(1, 1);

            // Assert
            var okResult = Assert.IsType<OkObjectResult>(result);
            var response = Assert.IsType<ApiResponse>(okResult.Value);
            Assert.Equal("Vote cast successfully", response.Message);
            Assert.True(await _context.Votes.AnyAsync(v => v.UserId == _testUserId && v.IdeaId == 1));
        }

        [Fact]
        public async Task CastVote_NonMember_ShouldReturnForbidden()
        {
            // Arrange
            await SeedBasicData(userInGroup: false);

            // Act
            var result = await _controller.CastVote(1, 1);

            // Assert
            var objectResult = Assert.IsType<ObjectResult>(result);
            Assert.Equal(403, objectResult.StatusCode);
        }

        #endregion

        #region Prevent Double Voting

        [Fact]
        public async Task CastVote_DuplicateVote_ShouldReturnForbidden()
        {
            // Arrange
            await SeedBasicData();
            _context.Votes.Add(new Vote { UserId = _testUserId, IdeaId = 1, IsDeleted = false });
            await _context.SaveChangesAsync();

            // Act
            var result = await _controller.CastVote(1, 1);

            // Assert
            var objectResult = Assert.IsType<ObjectResult>(result);
            Assert.Equal(403, objectResult.StatusCode);
            var response = Assert.IsType<ApiResponse>(objectResult.Value);
            Assert.Equal("User has already voted", response.Message);
        }

        #endregion

        #region Unvoting

        [Fact]
        public async Task Unvote_OwnVote_ShouldSoftDelete()
        {
            // Arrange
            await SeedBasicData();
            var vote = new Vote { Id = 500, UserId = _testUserId, IdeaId = 1, IsDeleted = false };
            _context.Votes.Add(vote);
            await _context.SaveChangesAsync();

            // Act
            var result = await _controller.Unvote(500);

            // Assert
            Assert.IsType<OkObjectResult>(result);
            var updatedVote = await _context.Votes.IgnoreQueryFilters().FirstOrDefaultAsync(v => v.Id == 500);
            Assert.True(updatedVote!.IsDeleted);
            Assert.NotNull(updatedVote.DeletedAt);
        }

        [Fact]
        public async Task Unvote_OthersVote_ShouldReturnBadRequest()
        {
            // Arrange
            await SeedBasicData();
            var otherUser = new IdeahubUser { Id = "other-person", UserName = "other", Email = "other@test.com", DisplayName = "Other User" };
            _context.Users.Add(otherUser);
            
            var vote = new Vote { Id = 600, UserId = "other-person", IdeaId = 1, IsDeleted = false };
            _context.Votes.Add(vote);
            await _context.SaveChangesAsync();

            // Verify it exists in DB
            Assert.NotNull(await _context.Votes.FindAsync(600));

            // Act
            var result = await _controller.Unvote(600);

            // Assert
            Assert.IsType<BadRequestObjectResult>(result);
        }
        

        #endregion

        #region Re-voting

        [Fact]
        public async Task CastVote_PreviouslyDeletedVote_ShouldUndelete()
        {
            // Arrange
            await SeedBasicData();
            _context.Votes.Add(new Vote { UserId = _testUserId, IdeaId = 1, IsDeleted = true, DeletedAt = DateTime.UtcNow });
            await _context.SaveChangesAsync();

            // Act
            var result = await _controller.CastVote(1, 1);

            // Assert
            var okResult = Assert.IsType<OkObjectResult>(result);
            var response = Assert.IsType<ApiResponse>(okResult.Value);
            Assert.Equal("Re-voting successful", response.Message);
            
            var vote = await _context.Votes.FirstOrDefaultAsync(v => v.UserId == _testUserId && v.IdeaId == 1);
            Assert.NotNull(vote);
            Assert.False(vote.IsDeleted);
            Assert.Null(vote.DeletedAt);
        }

        #endregion

        #region Admin Oversight

        [Fact]
        public async Task SeeVotes_AsValidUser_ShouldReturnList()
        {
            // Arrange
            await SeedBasicData();
            _context.Votes.Add(new Vote { UserId = _testUserId, IdeaId = 1, IsDeleted = false });
            await _context.SaveChangesAsync();

            // Act
            var result = await _controller.SeeVotes(1);

            // Assert
            var okResult = Assert.IsType<OkObjectResult>(result);
            var response = Assert.IsType<ApiResponse>(okResult.Value);
            Assert.Contains("Votes found", response.Message);
        }

        #endregion

        #region Edge Cases

        [Fact]
        public async Task CastVote_IdeaNotFound_ShouldReturnNotFound()
        {
            // Arrange
            await SeedBasicData();

            // Act
            var result = await _controller.CastVote(1, 999);

            // Assert
            Assert.IsType<NotFoundObjectResult>(result);
        }

        [Fact]
        public async Task Unvote_InvalidId_ShouldReturnNotFound()
        {
            // Act
            var result = await _controller.Unvote(9999);

            // Assert
            Assert.IsType<NotFoundObjectResult>(result);
        }

        #endregion
    }
}
