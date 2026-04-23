using System.Security.Claims;
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
    public class ProjectControllerTests : IDisposable
    {
        private readonly IdeahubDbContext _context;
        private readonly Mock<ILogger<ProjectController>> _mockLogger;
        private readonly Mock<UserManager<IdeahubUser>> _mockUserManager;
        private readonly ProjectController _controller;
        private readonly string _testUserId = "test-user-123";
        private readonly string _testUserEmail = "test@example.com";
        private readonly string _databaseName = Guid.NewGuid().ToString();

        public ProjectControllerTests()
        {
            var options = new DbContextOptionsBuilder<IdeahubDbContext>()
                .UseInMemoryDatabase(databaseName: _databaseName)
                .Options;
            _context = new IdeahubDbContext(options);

            _mockLogger = new Mock<ILogger<ProjectController>>();

            var store = new Mock<IUserStore<IdeahubUser>>();
            _mockUserManager = new Mock<UserManager<IdeahubUser>>(store.Object, null!, null!, null!, null!, null!, null!, null!, null!);

            var user = new ClaimsPrincipal(new ClaimsIdentity(new Claim[]
            {
                new Claim(ClaimTypes.NameIdentifier, _testUserId),
                new Claim(ClaimTypes.Email, _testUserEmail)
            }, "TestAuthentication"));

            _controller = new ProjectController(_context, _mockLogger.Object, _mockUserManager.Object)
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

        private async Task<(IdeahubUser User, Group Group, Idea Idea)> SeedBasicData(int groupId = 1, int ideaId = 1)
        {
            var group = new Group { Id = groupId, Name = "Test Group", IsPublic = true };
            var idea = new Idea { Id = ideaId, Title = "Test Idea", GroupId = groupId, Status = IdeaStatus.Open };
            var user = new IdeahubUser { Id = _testUserId, Email = _testUserEmail, DisplayName = "Test User", UserName = _testUserEmail };

            _context.Groups.Add(group);
            _context.Ideas.Add(idea);
            _context.Users.Add(user);
            await _context.SaveChangesAsync();

            return (user, group, idea);
        }

        #region CreateProject

        [Fact(Skip = "InMemory provider does not support BeginTransactionAsync")]
        public async Task CreateProject_ValidRequest_ShouldSucceed()
        {
            // Arrange
            await SeedBasicData();
            var dto = new ProjectDto
            {
                Title = "New Project",
                Description = "Description",
                OverseenByEmail = _testUserEmail
            };

            // Act
            var result = await _controller.CreateProject(1, 1, dto);

            // Assert
            var okResult = Assert.IsType<OkObjectResult>(result);
            var apiResponse = Assert.IsType<ApiResponse>(okResult.Value);
            Assert.True(apiResponse.Status);

            var project = await _context.Projects.FirstOrDefaultAsync(p => p.Title == "New Project");
            Assert.NotNull(project);
            Assert.Equal(1, project.IdeaId);

            var idea = await _context.Ideas.FindAsync(1);
            Assert.Equal(IdeaStatus.Closed, idea!.Status);
            Assert.True(idea.IsPromotedToProject);
        }

        [Fact]
        public async Task CreateProject_IdeaNotFound_ShouldReturnNotFound()
        {
            // Arrange
            await SeedBasicData();
            var dto = new ProjectDto { Title = "Project", OverseenByEmail = _testUserEmail };

            // Act
            var result = await _controller.CreateProject(1, 99, dto);

            // Assert
            Assert.IsType<NotFoundObjectResult>(result);
        }

        [Fact(Skip = "InMemory provider does not support BeginTransactionAsync")]
        public async Task CreateProject_ProjectAlreadyExists_ShouldReturnExisting()
        {
            // Arrange
            await SeedBasicData();
            var existingProject = new Project { Id = 10, IdeaId = 1, Title = "Existing", GroupId = 1, CreatedByUserId = _testUserId, OverseenByUserId = _testUserId };
            _context.Projects.Add(existingProject);
            await _context.SaveChangesAsync();

            var dto = new ProjectDto { Title = "New Version", OverseenByEmail = _testUserEmail };

            // Act
            var result = await _controller.CreateProject(1, 1, dto);

            // Assert
            var okResult = Assert.IsType<OkObjectResult>(result);
            var data = okResult.Value as ApiResponse;
            Assert.NotNull(data);
        }

        #endregion

        #region ViewProjects

        [Fact]
        public async Task ViewProjects_AsMember_ShouldSucceed()
        {
            // Arrange
            await SeedBasicData();
            _context.UserGroups.Add(new UserGroup { GroupId = 1, UserId = _testUserId });
            _context.Projects.Add(new Project { Title = "Group Project", GroupId = 1, IdeaId = 1, OverseenByUserId = _testUserId, CreatedByUserId = _testUserId });
            await _context.SaveChangesAsync();

            // Act
            var result = await _controller.ViewProjects(1);

            // Assert
            var okResult = Assert.IsType<OkObjectResult>(result);
            var response = Assert.IsType<ApiResponse>(okResult.Value);
            Assert.True(response.Status);
        }

        [Fact]
        public async Task ViewProjects_AsNonMember_ShouldReturnForbidden()
        {
            // Arrange
            await SeedBasicData();

            // Act
            var result = await _controller.ViewProjects(1);

            // Assert
            var objectResult = Assert.IsType<ObjectResult>(result);
            Assert.Equal(403, objectResult.StatusCode);
        }

        #endregion

        #region GetProjectById

        [Fact]
        public async Task GetProjectById_AsOverseer_ShouldSucceed()
        {
            // Arrange
            await SeedBasicData();
            _context.UserGroups.Add(new UserGroup { GroupId = 1, UserId = _testUserId });
            var project = new Project { Id = 5, Title = "My Project", GroupId = 1, IdeaId = 1, OverseenByUserId = _testUserId, CreatedByUserId = _testUserId };
            _context.Projects.Add(project);
            await _context.SaveChangesAsync();

            // Act
            var result = await _controller.GetProjectById(5);

            // Assert
            Assert.IsType<OkObjectResult>(result);
        }

        [Fact]
        public async Task GetProjectById_AsAssignee_ShouldSucceed()
        {
            // Arrange
            await SeedBasicData();
            _context.UserGroups.Add(new UserGroup { GroupId = 1, UserId = _testUserId });

            // Add the missing overseer user
            var overseer = new IdeahubUser { Id = "other-boss", Email = "boss@example.com", DisplayName = "Boss", UserName = "boss@example.com" };
            _context.Users.Add(overseer);

            var project = new Project
            {
                Id = 6,
                Title = "Assignee Project",
                GroupId = 1,
                IdeaId = 1,
                OverseenByUserId = "other-boss",
                CreatedByUserId = "other-boss"
            };
            var task = new ProjectTask { Id = 10, ProjectId = 6, Title = "Task" };
            var assignee = new TaskAssignee { ProjectTaskId = 10, UserId = _testUserId };

            _context.Projects.Add(project);
            _context.ProjectTasks.Add(task);
            _context.TaskAssignees.Add(assignee);
            await _context.SaveChangesAsync();

            // Act
            var result = await _controller.GetProjectById(6);

            // Assert
            Assert.IsType<OkObjectResult>(result);
        }

        [Fact]
        public async Task GetProjectById_NoAccess_ShouldReturnForbidden()
        {
            // Arrange
            await SeedBasicData();

            // Add the missing stranger user
            var stranger = new IdeahubUser { Id = "stranger", Email = "stranger@example.com", DisplayName = "Stranger", UserName = "stranger@example.com" };
            _context.Users.Add(stranger);

            // User is NOT in the group and NOT the overseer
            var project = new Project
            {
                Id = 7,
                Title = "Private Project",
                GroupId = 1,
                IdeaId = 1,
                OverseenByUserId = "stranger",
                CreatedByUserId = "stranger"
            };
            _context.Projects.Add(project);
            await _context.SaveChangesAsync();

            // Act
            var result = await _controller.GetProjectById(7);

            // Assert
            var objectResult = Assert.IsType<ObjectResult>(result);
            Assert.Equal(403, objectResult.StatusCode);
        }

        #endregion

        #region UpdateProject

        [Fact]
        public async Task UpdateProject_AsOverseer_ShouldSucceed()
        {
            // Arrange
            await SeedBasicData();
            var project = new Project { Id = 8, Title = "Old Title", GroupId = 1, IdeaId = 1, OverseenByUserId = _testUserId, CreatedByUserId = _testUserId };
            _context.Projects.Add(project);
            await _context.SaveChangesAsync();

            var dto = new ProjectUpdateDto { Title = "New Title", Status = "Active", Description = "", OverseenByUserEmail = "" };

            // Act
            var result = await _controller.UpdateProject(8, dto);

            // Assert
            var okResult = Assert.IsType<OkObjectResult>(result);
            var updatedProject = await _context.Projects.FindAsync(8);
            Assert.Equal("New Title", updatedProject!.Title);
            Assert.Equal(ProjectStatus.Active, updatedProject.Status);
        }

        [Fact]
        public async Task UpdateProject_ChangeOverseer_ShouldSucceed()
        {
            // Arrange
            await SeedBasicData();
            var project = new Project { Id = 9, Title = "Project", GroupId = 1, IdeaId = 1, OverseenByUserId = _testUserId, CreatedByUserId = _testUserId };
            var newOverseer = new IdeahubUser { Id = "new-id", Email = "new@example.com", DisplayName = "New Guy", UserName = "new@example.com" };
            _context.Projects.Add(project);
            _context.Users.Add(newOverseer);
            await _context.SaveChangesAsync();

            _mockUserManager.Setup(m => m.FindByEmailAsync("new@example.com")).ReturnsAsync(newOverseer);

            var dto = new ProjectUpdateDto { OverseenByUserEmail = "new@example.com", Title = "", Description = "", Status = "" };

            // Act
            var result = await _controller.UpdateProject(9, dto);

            // Assert
            Assert.IsType<OkObjectResult>(result);
            var updated = await _context.Projects.FindAsync(9);
            Assert.Equal("new-id", updated!.OverseenByUserId);
        }

        #endregion

        #region DeleteProject

        [Fact]
        public async Task DeleteProject_AsOverseer_ShouldSucceed()
        {
            // Arrange
            await SeedBasicData();
            var project = new Project { Id = 10, Title = "To Delete", GroupId = 1, IdeaId = 1, OverseenByUserId = _testUserId, CreatedByUserId = _testUserId };
            _context.Projects.Add(project);
            await _context.SaveChangesAsync();

            // Act
            var result = await _controller.DeleteProject(10);

            // Assert
            Assert.IsType<OkObjectResult>(result);
            var deleted = await _context.Projects.FindAsync(10);
            Assert.Null(deleted);
        }

        #endregion

        #region Progress Calculation

        [Fact]
        public async Task GetProjectById_ProgressCalculation_ShouldBeCorrect()
        {
            // Arrange
            await SeedBasicData();
            _context.UserGroups.Add(new UserGroup { GroupId = 1, UserId = _testUserId });

            var project = new Project { Id = 20, Title = "Progress Project", GroupId = 1, IdeaId = 1, OverseenByUserId = _testUserId, CreatedByUserId = _testUserId };

            // Task 1: No subtasks, Completed -> 100%
            var task1 = new ProjectTask { Id = 100, ProjectId = 20, Title = "T1", IsCompleted = true };

            // Task 2: 2 subtasks, 1 completed -> 50%
            var task2 = new ProjectTask { Id = 101, ProjectId = 20, Title = "T2", IsCompleted = false };

            _context.Projects.Add(project);
            _context.ProjectTasks.Add(task1);
            _context.ProjectTasks.Add(task2);
            await _context.SaveChangesAsync();

            var st1 = new SubTask { Id = 200, ProjectTaskId = 101, Title = "ST1", IsCompleted = true };
            var st2 = new SubTask { Id = 201, ProjectTaskId = 101, Title = "ST2", IsCompleted = false };
            _context.SubTasks.AddRange(st1, st2);
            await _context.SaveChangesAsync();

            // Act
            var result = await _controller.GetProjectById(20);

            // Assert
            var okResult = Assert.IsType<OkObjectResult>(result);
            var response = okResult.Value as ApiResponse;
            Assert.NotNull(response);

            // Expected progress: (100 + 50) / 2 = 75.0%
            var data = response.Data;
            var progress = data?.GetType().GetProperty("Progress")?.GetValue(data, null);
            Assert.Equal(75.0, (double)progress!);
        }

        #endregion
    }
}
