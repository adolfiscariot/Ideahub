using System.Security.Claims;
using api.Controllers;
using api.Data;
using api.Helpers;
using api.Models;
using api.Services;
using api.Constants;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Moq;
using Xunit;

namespace Ideahub.Tests
{
    public class CommitteeControllerTests : IDisposable
    {
        private readonly IdeahubDbContext _context;
        private readonly Mock<UserManager<IdeahubUser>> _mockUserManager;
        private readonly Mock<ILogger<CommitteeController>> _mockLogger;
        private readonly Mock<IEmailSender> _mockEmailSender;
        private readonly Mock<IServiceScopeFactory> _mockScopeFactory;
        private readonly CommitteeController _controller;
        private readonly string _adminUserId = "admin-123";

        public CommitteeControllerTests()
        {
            var options = new DbContextOptionsBuilder<IdeahubDbContext>()
                .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
                .Options;
            _context = new IdeahubDbContext(options);

            var userStoreMock = new Mock<IUserStore<IdeahubUser>>();
            _mockUserManager = new Mock<UserManager<IdeahubUser>>(
                userStoreMock.Object, null!, null!, null!, null!, null!, null!, null!, null!);

            _mockLogger = new Mock<ILogger<CommitteeController>>();
            _mockEmailSender = new Mock<IEmailSender>();
            _mockScopeFactory = new Mock<IServiceScopeFactory>();

            // Mock Service Scope for background tasks
            var mockScope = new Mock<IServiceScope>();
            var mockServiceProvider = new Mock<IServiceProvider>();
            
            mockScope.Setup(x => x.ServiceProvider).Returns(mockServiceProvider.Object);
            _mockScopeFactory.Setup(x => x.CreateScope()).Returns(mockScope.Object);
            
            // Register scoped services
            mockServiceProvider.Setup(x => x.GetService(typeof(UserManager<IdeahubUser>))).Returns(_mockUserManager.Object);
            mockServiceProvider.Setup(x => x.GetService(typeof(IEmailSender))).Returns(_mockEmailSender.Object);

            // Setup Controller with Admin Context
            var adminUser = new ClaimsPrincipal(new ClaimsIdentity(new Claim[]
            {
                new Claim(ClaimTypes.NameIdentifier, _adminUserId),
                new Claim(ClaimTypes.Role, RoleConstants.CommitteeMember)
            }, "TestAuthentication"));

            _controller = new CommitteeController(_mockUserManager.Object, _mockLogger.Object, _mockEmailSender.Object, _mockScopeFactory.Object)
            {
                ControllerContext = new ControllerContext
                {
                    HttpContext = new DefaultHttpContext { User = adminUser }
                }
            };
        }

        public void Dispose()
        {
            _context.Database.EnsureDeleted();
            _context.Dispose();
        }

        #region GetCommitteeMembers

        [Fact]
        public async Task GetCommitteeMembers_AppShouldReturnOnlyUsersInRole()
        {
            // Arrange
            var committeeUsers = new List<IdeahubUser> 
            { 
                new() { Id = "u1", Email = "c1@test.com" },
                new() { Id = "u2", Email = "c2@test.com" }
            };
            _mockUserManager.Setup(m => m.GetUsersInRoleAsync(RoleConstants.CommitteeMember))
                .ReturnsAsync(committeeUsers);

            // Act
            var result = await _controller.GetCommitteeMembers();

            // Assert
            var okResult = Assert.IsType<OkObjectResult>(result);
            var response = Assert.IsType<ApiResponse>(okResult.Value);
            var data = Assert.IsAssignableFrom<System.Collections.IEnumerable>(response.Data);
            
            int count = 0;
            foreach (var item in data) count++;
            Assert.Equal(2, count);
        }

        #endregion

        #region AddCommitteeMember

        [Fact]
        public async Task AddCommitteeMember_UserShouldSuccess_AndTriggerBackgroundEmail()
        {
            // Arrange
            var targetEmail = "newbie@test.com";
            var targetUser = new IdeahubUser { Id = "target-123", Email = targetEmail };
            var adminUser = new IdeahubUser { Id = _adminUserId, DisplayName = "Admin User" };

            _mockUserManager.Setup(m => m.FindByEmailAsync(targetEmail)).ReturnsAsync(targetUser);
            _mockUserManager.Setup(m => m.AddToRoleAsync(targetUser, RoleConstants.CommitteeMember))
                .ReturnsAsync(IdentityResult.Success);
            _mockUserManager.Setup(m => m.GetUserAsync(It.IsAny<ClaimsPrincipal>())).ReturnsAsync(adminUser);

            // Scoped mocks for background task
            _mockUserManager.Setup(m => m.FindByIdAsync("target-123")).ReturnsAsync(targetUser);

            // Act
            var result = await _controller.AddCommitteeMember(targetEmail);

            // Assert
            Assert.IsType<OkObjectResult>(result);
            _mockUserManager.Verify(m => m.AddToRoleAsync(targetUser, RoleConstants.CommitteeMember), Times.Once);
            
            _mockScopeFactory.Verify(f => f.CreateScope(), Times.Once);
        }

        [Fact]
        public async Task AddCommitteeMember_AppShouldReturnNotFound_WhenUserDoesNotExist()
        {
            // Arrange
            _mockUserManager.Setup(m => m.FindByEmailAsync(It.IsAny<string>())).ReturnsAsync((IdeahubUser)null!);

            // Act
            var result = await _controller.AddCommitteeMember("ghost@test.com");

            // Assert
            Assert.IsType<NotFoundObjectResult>(result);
        }

        [Fact]
        public async Task AddCommitteeMember_AppShouldHandleIdentityFailures()
        {
            // Arrange
            var user = new IdeahubUser { Id = "u1", Email = "fail@test.com" };
            _mockUserManager.Setup(m => m.FindByEmailAsync(It.IsAny<string>())).ReturnsAsync(user);
            _mockUserManager.Setup(m => m.AddToRoleAsync(user, It.IsAny<string>()))
                .ReturnsAsync(IdentityResult.Failed(new IdentityError { Description = "Fatal Error" }));

            // Act
            var result = await _controller.AddCommitteeMember("fail@test.com");

            // Assert
            var badRequest = Assert.IsType<BadRequestObjectResult>(result);
            var response = Assert.IsType<ApiResponse>(badRequest.Value);
            Assert.Contains("Failed to add user", response.Message);
        }

        [Fact]
        public async Task AddCommitteeMember_AppShouldFallbackToGenericAdmin_WhenAdminProfileIsNull()
        {
            // Arrange
            var targetEmail = "new@test.com";
            var targetUser = new IdeahubUser { Id = "t1", Email = targetEmail };
            
            _mockUserManager.Setup(m => m.FindByEmailAsync(targetEmail)).ReturnsAsync(targetUser);
            _mockUserManager.Setup(m => m.AddToRoleAsync(targetUser, RoleConstants.CommitteeMember)).ReturnsAsync(IdentityResult.Success);
            _mockUserManager.Setup(m => m.GetUserAsync(It.IsAny<ClaimsPrincipal>())).ReturnsAsync((IdeahubUser)null!);
            _mockUserManager.Setup(m => m.FindByIdAsync("t1")).ReturnsAsync(targetUser);

            // Act
            var result = await _controller.AddCommitteeMember(targetEmail);

            // Assert
            Assert.IsType<OkObjectResult>(result);
            _mockScopeFactory.Verify(f => f.CreateScope(), Times.Once);
            // This verifies the logic didn't crash even with a null admin user profile.
        }

        #endregion
    }
}
