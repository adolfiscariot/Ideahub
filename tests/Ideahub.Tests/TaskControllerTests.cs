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
    public class TaskControllerTests : IDisposable
    {
        private readonly IdeahubDbContext _context;
        private readonly Mock<ILogger<TaskController>> _mockLogger;
        private readonly Mock<UserManager<IdeahubUser>> _mockUserManager;
        private readonly TaskController _controller;
        private readonly string _testUserId = "admin-123";
        private readonly string _databaseName = Guid.NewGuid().ToString();

        public TaskControllerTests()
        {
            var options = new DbContextOptionsBuilder<IdeahubDbContext>()
                .UseInMemoryDatabase(databaseName: _databaseName)
                .Options;
            _context = new IdeahubDbContext(options);

            _mockLogger = new Mock<ILogger<TaskController>>();
            
            var store = new Mock<IUserStore<IdeahubUser>>();
            _mockUserManager = new Mock<UserManager<IdeahubUser>>(store.Object, null!, null!, null!, null!, null!, null!, null!, null!);

            var user = new ClaimsPrincipal(new ClaimsIdentity(new Claim[]
            {
                new Claim(ClaimTypes.NameIdentifier, _testUserId),
                new Claim(ClaimTypes.Role, "SuperAdmin")
            }, "TestAuthentication"));

            _controller = new TaskController(_context, _mockLogger.Object, _mockUserManager.Object)
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

        #region Task Creation

        [Fact]
        public async Task CreateTask_AsOverseer_ShouldSucceed()
        {
            // Arrange
            var project = new Project 
            { 
                Id = 1, 
                Title = "Test Project", 
                OverseenByUserId = _testUserId,
                Status = ProjectStatus.Planning 
            };
            _context.Projects.Add(project);
            await _context.SaveChangesAsync();

            var dto = new TaskDto 
            { 
                Title = "First Task", 
                Description = "Doing work",
                TaskAssignees = new List<string> { "user-456" }
            };

            // Act
            var result = await _controller.CreateTask(1, dto);

            // Assert
            var okResult = Assert.IsType<OkObjectResult>(result);
            var apiResponse = Assert.IsType<ApiResponse>(okResult.Value);
            Assert.True(apiResponse.Status);
            
            var createdTask = await _context.ProjectTasks.Include(t => t.TaskAssignees).FirstOrDefaultAsync(t => t.Title == "First Task");
            Assert.NotNull(createdTask);
            Assert.NotNull(createdTask.TaskAssignees);
            Assert.Single(createdTask.TaskAssignees);
            
            var updatedProject = await _context.Projects.FindAsync(1);
            Assert.Equal(ProjectStatus.Active, updatedProject!.Status); // Should transition from Planning to Active
        }

        [Fact]
        public async Task CreateTask_AsNonOverseer_ShouldReturnForbidden()
        {
            // Arrange
            var project = new Project 
            { 
                Id = 2, 
                Title = "Other Project", 
                OverseenByUserId = "someone-else" 
            };
            _context.Projects.Add(project);
            await _context.SaveChangesAsync();

            var dto = new TaskDto { Title = "Forbidden Task" };

            // Act
            var result = await _controller.CreateTask(2, dto);

            // Assert
            var objectResult = Assert.IsType<ObjectResult>(result);
            Assert.Equal(403, objectResult.StatusCode);
        }

        #endregion

        #region Task Retrieval (Workspace Access)

        [Fact]
        public async Task GetProjectTasks_AsMember_ShouldSucceed()
        {
            // Arrange
            var project = new Project { Id = 3, Title = "Member Project", OverseenByUserId = "overseer-789" };
            var task = new ProjectTask { Id = 101, ProjectId = 3, Title = "Shared Task" };
            var assignment = new TaskAssignee { ProjectTaskId = 101, UserId = _testUserId };
            
            _context.Projects.Add(project);
            _context.ProjectTasks.Add(task);
            _context.TaskAssignees.Add(assignment);
            await _context.SaveChangesAsync();

            // Act
            var result = await _controller.GetProjectTasks(3);

            // Assert
            var okResult = Assert.IsType<OkObjectResult>(result);
            var apiResponse = Assert.IsType<ApiResponse>(okResult.Value);
            Assert.True(apiResponse.Status);
        }

        [Fact]
        public async Task GetProjectTasks_AsOutsider_ShouldReturnForbidden()
        {
            // Arrange
            var project = new Project { Id = 4, Title = "Secret Project", OverseenByUserId = "overseer-10" };
            _context.Projects.Add(project);
            await _context.SaveChangesAsync();

            // Act
            var result = await _controller.GetProjectTasks(4);

            // Assert
            var objectResult = Assert.IsType<ObjectResult>(result);
            Assert.Equal(403, objectResult.StatusCode);
        }

        #endregion

        #region Task Update & Deletion

        [Fact]
        public async Task UpdateTask_CompleteWithIncompleteSubtasks_ShouldReturnBadRequest()
        {
            // Arrange
            var project = new Project { Id = 5, Title = "Update Project", OverseenByUserId = _testUserId };
            var task = new ProjectTask { Id = 202, ProjectId = 5, Title = "Main Task", IsCompleted = false };
            var subTask = new SubTask { Id = 303, ProjectTaskId = 202, Title = "Still Working", IsCompleted = false };
            
            _context.Projects.Add(project);
            _context.ProjectTasks.Add(task);
            _context.SubTasks.Add(subTask);
            await _context.SaveChangesAsync();

            var dto = new TaskUpdateDto { IsCompleted = true };

            // Act
            var result = await _controller.UpdateTask(202, dto);

            // Assert
            Assert.IsType<BadRequestObjectResult>(result);
        }

        [Fact]
        public async Task UpdateTask_AsAssignee_ShouldSucceed()
        {
            // Arrange
            var project = new Project { Id = 6, Title = "Assignee Project", OverseenByUserId = "boss" };
            var task = new ProjectTask { Id = 203, ProjectId = 6, Title = "Work", IsCompleted = false };
            var assignment = new TaskAssignee { ProjectTaskId = 203, UserId = _testUserId };
            
            _context.Projects.Add(project);
            _context.ProjectTasks.Add(task);
            _context.TaskAssignees.Add(assignment);
            await _context.SaveChangesAsync();

            var dto = new TaskUpdateDto { Title = "Renamed Work" };

            // Act
            var result = await _controller.UpdateTask(203, dto);

            // Assert
            var okResult = Assert.IsType<OkObjectResult>(result);
            var updatedTask = await _context.ProjectTasks.FindAsync(203);
            Assert.Equal("Renamed Work", updatedTask!.Title);
        }

        [Fact]
        public async Task DeleteTask_AsOverseer_ShouldSoftDelete()
        {
            // Arrange
            var project = new Project { Id = 7, Title = "Delete Project", OverseenByUserId = _testUserId };
            var task = new ProjectTask { Id = 204, ProjectId = 7, Title = "To Delete", IsDeleted = false };
            
            _context.Projects.Add(project);
            _context.ProjectTasks.Add(task);
            await _context.SaveChangesAsync();

            // Act
            var result = await _controller.DeleteTask(204);

            // Assert
            var okResult = Assert.IsType<OkObjectResult>(result);
            var deletedTask = await _context.ProjectTasks.FindAsync(204);
            Assert.True(deletedTask!.IsDeleted);
        }

        #endregion

        #region SubTask Scenarios

        [Fact]
        public async Task CreateSubTask_AsTaskAssignee_ShouldSucceed()
        {
            // Arrange
            var project = new Project { Id = 8, Title = "SubTask Project", OverseenByUserId = "boss" };
            var task = new ProjectTask { Id = 404, ProjectId = 8, Title = "Parent Task" };
            var assignment = new TaskAssignee { ProjectTaskId = 404, UserId = _testUserId };
            
            _context.Projects.Add(project);
            _context.ProjectTasks.Add(task);
            _context.TaskAssignees.Add(assignment);
            await _context.SaveChangesAsync();

            var dto = new SubTaskDto 
            { 
                Title = "Child SubTask", 
                Description = "Helping out",
                SubTaskAssignees = new List<string> { _testUserId }
            };

            // Act
            var result = await _controller.CreateSubTask(404, dto);

            // Assert
            var okResult = Assert.IsType<OkObjectResult>(result);
            var createdSubTask = await _context.SubTasks.FirstOrDefaultAsync(st => st.Title == "Child SubTask");
            Assert.NotNull(createdSubTask);
            Assert.Equal(404, createdSubTask!.ProjectTaskId);
        }

        [Fact]
        public async Task UpdateSubTask_CompleteWithIncompleteChildren_ShouldReturnBadRequest()
        {
            // Arrange
            var project = new Project { Id = 9, Title = "Nested Project", OverseenByUserId = _testUserId };
            var task = new ProjectTask { Id = 505, ProjectId = 9, Title = "Root Task" };
            var subTask = new SubTask { Id = 606, ProjectTaskId = 505, Title = "Parent SubTask", IsCompleted = false };
            var childSubTask = new SubTask { Id = 707, ProjectTaskId = 505, ParentSubTaskId = 606, Title = "Child SubTask", IsCompleted = false };
            
            _context.Projects.Add(project);
            _context.ProjectTasks.Add(task);
            _context.SubTasks.Add(subTask);
            _context.SubTasks.Add(childSubTask);
            await _context.SaveChangesAsync();

            var dto = new SubTaskUpdateDto { IsCompleted = true };

            // Act
            var result = await _controller.UpdateSubTask(606, dto);

            // Assert
            Assert.IsType<BadRequestObjectResult>(result);
        }

        [Fact]
        public async Task DeleteSubTask_AsOverseer_ShouldSucceed()
        {
            // Arrange
            var project = new Project { Id = 10, Title = "Final Project", OverseenByUserId = _testUserId };
            var task = new ProjectTask { Id = 808, ProjectId = 10, Title = "Task" };
            var subTask = new SubTask { Id = 909, ProjectTaskId = 808, Title = "SubTask" };
            
            _context.Projects.Add(project);
            _context.ProjectTasks.Add(task);
            _context.SubTasks.Add(subTask);
            await _context.SaveChangesAsync();

            // Act
            var result = await _controller.DeleteSubTask(909);

            // Assert
            var okResult = Assert.IsType<OkObjectResult>(result);
            var deletedSubTask = await _context.SubTasks.FindAsync(909);
            Assert.Null(deletedSubTask);
        }

        #endregion
    }
}
