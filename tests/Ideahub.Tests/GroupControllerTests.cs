using System.Security.Claims;
using api.Controllers;
using api.Data;
using api.Helpers;
using api.Models;
using api.Constants;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Moq;
using Xunit;

namespace Ideahub.Tests
{
    public class GroupControllerTests : IDisposable
    {
        private readonly IdeahubDbContext _context;
        private readonly GroupController _controller;
        private readonly Mock<UserManager<IdeahubUser>> _mockUserManager;
        private readonly Mock<RoleManager<IdentityRole>> _mockRoleManager;
        private readonly string _testUserId = "user-123";

        public GroupControllerTests()
        {
            var options = new DbContextOptionsBuilder<IdeahubDbContext>()
                .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
                .Options;

            _context = new IdeahubDbContext(options);

            var userStore = new Mock<IUserStore<IdeahubUser>>();
            _mockUserManager = new Mock<UserManager<IdeahubUser>>(userStore.Object, null!, null!, null!, null!, null!, null!, null!, null!);

            var roleStore = new Mock<IRoleStore<IdentityRole>>();
            _mockRoleManager = new Mock<RoleManager<IdentityRole>>(roleStore.Object, null!, null!, null!, null!);

            var logger = new Mock<Microsoft.Extensions.Logging.ILogger<GroupController>>();

            var user = new ClaimsPrincipal(new ClaimsIdentity(new Claim[]
            {
                new Claim(ClaimTypes.NameIdentifier, _testUserId),
                new Claim(ClaimTypes.Email, "test@example.com")
            }, "TestAuthentication"));

            _controller = new GroupController(logger.Object, _context, _mockRoleManager.Object, _mockUserManager.Object)
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

        private async Task SeedUser()
        {
            var user = new IdeahubUser { Id = _testUserId, Email = "test@example.com", UserName = "test@example.com" };
            _context.Users.Add(user);
            await _context.SaveChangesAsync();
            _mockUserManager.Setup(m => m.FindByIdAsync(_testUserId)).ReturnsAsync(user);
        }

        [Fact]
        public async Task CreateGroup_MemberToAdmin_ShouldSucceed()
        {
            // Arrange
            await SeedUser();
            var dto = new GroupDto { Name = "New Group", IsPublic = true };
            _mockRoleManager.Setup(r => r.FindByNameAsync(RoleConstants.GroupAdmin)).ReturnsAsync(new IdentityRole(RoleConstants.GroupAdmin));
            _mockUserManager.Setup(m => m.IsInRoleAsync(It.IsAny<IdeahubUser>(), RoleConstants.GroupAdmin)).ReturnsAsync(false);
            _mockUserManager.Setup(m => m.AddToRoleAsync(It.IsAny<IdeahubUser>(), RoleConstants.GroupAdmin)).ReturnsAsync(IdentityResult.Success);

            // Act
            var result = await _controller.CreateGroup(dto);

            // Assert
            Assert.IsType<OkObjectResult>(result);
            Assert.Single(_context.Groups);
            _mockUserManager.Verify(m => m.AddToRoleAsync(It.IsAny<IdeahubUser>(), RoleConstants.GroupAdmin), Times.Once);
        }

        [Fact]
        public async Task DeleteGroup_AsAdmin_ShouldSucceed()
        {
            // Arrange
            var group = new Group { Id = 1, Name = "To Delete", CreatedByUserId = _testUserId };
            _context.Groups.Add(group);
            await _context.SaveChangesAsync();

            // Act
            var result = await _controller.DeleteGroup(1);

            // Assert
            Assert.IsType<OkObjectResult>(result);
            Assert.Empty(_context.Groups);
        }

        [Fact]
        public async Task JoinGroup_Public_ShouldJoinImmediately()
        {
            // Arrange
            var group = new Group { Id = 1, Name = "Public Group", IsPublic = true };
            _context.Groups.Add(group);
            await _context.SaveChangesAsync();

            // Act
            var result = await _controller.JoinGroup(1);

            // Assert
            var okResult = Assert.IsType<OkObjectResult>(result);
            var isMember = await _context.UserGroups.AnyAsync(ug => ug.GroupId == 1 && ug.UserId == _testUserId);
            Assert.True(isMember);
        }

        [Fact]
        public async Task JoinGroup_Private_ShouldCreatePendingRequest()
        {
            // Arrange
            var group = new Group { Id = 1, Name = "Private Group", IsPublic = false };
            _context.Groups.Add(group);
            await _context.SaveChangesAsync();

            // Act
            var result = await _controller.JoinGroup(1);

            // Assert
            Assert.IsType<OkObjectResult>(result);
            var request = await _context.GroupMembershipRequests.FirstOrDefaultAsync(r => r.GroupId == 1 && r.UserId == _testUserId);
            Assert.NotNull(request);
            Assert.Equal(Status.Pending, request.Status);
        }

        [Fact]
        public async Task JoinGroup_AlreadyMember_ShouldReturnBadRequest()
        {
            // Arrange
            _context.Groups.Add(new Group { Id = 1, Name = "Group" });
            _context.UserGroups.Add(new UserGroup { GroupId = 1, UserId = _testUserId });
            await _context.SaveChangesAsync();

            // Act
            var result = await _controller.JoinGroup(1);

            // Assert
            Assert.IsType<BadRequestObjectResult>(result);
        }

        [Fact]
        public async Task LeaveGroup_RegularMember_ShouldSucceed()
        {
            // Arrange
            _context.Groups.Add(new Group { Id = 1, Name = "Group", CreatedByUserId = "someone-else" });
            _context.UserGroups.Add(new UserGroup { GroupId = 1, UserId = _testUserId });
            await _context.SaveChangesAsync();

            // Act
            var result = await _controller.LeaveGroup(1);

            // Assert
            Assert.IsType<OkObjectResult>(result);
            Assert.Empty(_context.UserGroups);
        }

        [Fact]
        public async Task LeaveGroup_Creator_ShouldReturnBadRequest()
        {
            // Arrange
            _context.Groups.Add(new Group { Id = 1, Name = "Group", CreatedByUserId = _testUserId });
            await _context.SaveChangesAsync();

            // Act
            var result = await _controller.LeaveGroup(1);

            // Assert
            Assert.IsType<BadRequestObjectResult>(result);
        }
        [Fact]
        public async Task AcceptRequest_AsAdmin_ShouldMoveToUserGroup()
        {
            // Arrange
            var group = new Group { Id = 1, Name = "Private", CreatedByUserId = _testUserId };
            _context.Groups.Add(group);
            var requester = new IdeahubUser { Id = "requester-id", Email = "req@example.com" };
            _context.Users.Add(requester);
            _context.GroupMembershipRequests.Add(new GroupMembershipRequest { GroupId = 1, UserId = "requester-id", Status = Status.Pending });
            await _context.SaveChangesAsync();

            // Act
            var result = await _controller.AcceptRequest(1, "req@example.com");

            // Assert
            Assert.IsType<OkObjectResult>(result);
            var isMember = await _context.UserGroups.AnyAsync(ug => ug.GroupId == 1 && ug.UserId == "requester-id");
            Assert.True(isMember);
            var request = await _context.GroupMembershipRequests.FirstAsync();
            Assert.Equal(Status.Approved, request.Status);
        }

        [Fact]
        public async Task RejectRequest_AsAdmin_ShouldUpdateStatus()
        {
            // Arrange
            var group = new Group { Id = 1, Name = "Private", CreatedByUserId = _testUserId };
            _context.Groups.Add(group);
            var requester = new IdeahubUser { Id = "requester-id", Email = "req@example.com" };
            _context.Users.Add(requester);
            _context.GroupMembershipRequests.Add(new GroupMembershipRequest { GroupId = 1, UserId = "requester-id", Status = Status.Pending });
            await _context.SaveChangesAsync();

            // Act
            var result = await _controller.RejectRequest(1, "req@example.com");

            // Assert
            Assert.IsType<OkObjectResult>(result);
            var request = await _context.GroupMembershipRequests.FirstAsync();
            Assert.Equal(Status.Rejected, request.Status);
        }

        [Fact]
        public async Task TransferOwnership_ValidMember_ShouldSucceed()
        {
            // Arrange
            await SeedUser();
            var group = new Group { Id = 1, Name = "Group", CreatedByUserId = _testUserId };
            _context.Groups.Add(group);
            var newOwner = new IdeahubUser { Id = "new-owner", Email = "new@example.com" };
            _context.Users.Add(newOwner);
            _context.UserGroups.Add(new UserGroup { GroupId = 1, UserId = "new-owner" });
            _context.UserGroups.Add(new UserGroup { GroupId = 1, UserId = _testUserId });
            await _context.SaveChangesAsync();

            _mockUserManager.Setup(m => m.FindByEmailAsync("new@example.com")).ReturnsAsync(newOwner);
            _mockUserManager.Setup(m => m.IsInRoleAsync(newOwner, RoleConstants.GroupAdmin)).ReturnsAsync(false);

            // Act
            var result = await _controller.TransferOwnership(1, "new@example.com");

            // Assert
            Assert.IsType<OkObjectResult>(result);
            var updatedGroup = await _context.Groups.FindAsync(1);
            Assert.Equal("new-owner", updatedGroup!.CreatedByUserId);
        }

        [Fact]
        public async Task ViewRequests_AsAdmin_ShouldReturnList()
        {
            // Arrange
            _context.Groups.Add(new Group { Id = 1, Name = "Group" });
            _context.Users.Add(new IdeahubUser { Id = "req-1", Email = "u1@ex.com" });
            _context.GroupMembershipRequests.Add(new GroupMembershipRequest { GroupId = 1, UserId = "req-1", Status = Status.Pending });
            await _context.SaveChangesAsync();

            // Act
            var result = await _controller.ViewRequests(1);

            // Assert
            var okResult = Assert.IsType<OkObjectResult>(result);
            var response = Assert.IsType<ApiResponse>(okResult.Value);
            var list = Assert.IsAssignableFrom<System.Collections.IEnumerable>(response.Data);
            Assert.NotEmpty(list);
        }

        [Fact]
        public async Task ViewGroups_ShouldReturnMembershipStatus()
        {
            // Arrange
            var otherUser = new IdeahubUser { Id = "other", Email = "other@example.com", DisplayName = "Other User" };
            _context.Users.Add(otherUser);
            _context.Groups.Add(new Group { Id = 1, Name = "Group 1", CreatedByUserId = "other" });
            _context.UserGroups.Add(new UserGroup { GroupId = 1, UserId = _testUserId });
            await _context.SaveChangesAsync();

            // Act
            var result = await _controller.ViewGroups();

            // Assert
            var okResult = Assert.IsType<OkObjectResult>(result);
            var response = Assert.IsType<ApiResponse>(okResult.Value);
            var list = Assert.IsAssignableFrom<System.Collections.IEnumerable>(response.Data);

            // Checking the first group in the list using Reflection to see the internal isMember property
            var groupList = list.Cast<object>().ToList();
            Assert.NotEmpty(groupList);

            var firstItem = groupList[0];
            Assert.NotNull(firstItem);

            var prop = firstItem.GetType().GetProperty("IsMember");
            Assert.NotNull(prop);

            var value = prop.GetValue(firstItem);
            Assert.NotNull(value);

            bool isMember = (bool)value;
            Assert.True(isMember);
        }
    }
}
