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
    public class TimesheetControllerTests : IDisposable
    {
        private readonly IdeahubDbContext _context;
        private readonly Mock<ILogger<TimesheetController>> _mockLogger;
        private readonly TimesheetController _controller;
        private readonly string _testUserId = "user-123";
        private readonly string _testUserEmail = "test@test.com";
        private readonly string _databaseName = Guid.NewGuid().ToString();

        public TimesheetControllerTests()
        {
            var options = new DbContextOptionsBuilder<IdeahubDbContext>()
                .UseInMemoryDatabase(databaseName: _databaseName)
                .Options;
            _context = new IdeahubDbContext(options);

            _mockLogger = new Mock<ILogger<TimesheetController>>();

            var user = new ClaimsPrincipal(new ClaimsIdentity(new Claim[]
            {
                new Claim(ClaimTypes.NameIdentifier, _testUserId),
                new Claim(ClaimTypes.Email, _testUserEmail)
            }, "TestAuthentication"));

            _controller = new TimesheetController(_context, _mockLogger.Object)
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

        private async Task SeedBasicData()
        {
            var user = new IdeahubUser { Id = _testUserId, UserName = "testuser", Email = _testUserEmail, DisplayName = "Test User" };
            var otherUser = new IdeahubUser { Id = "other-user", UserName = "other", Email = "other@test.com", DisplayName = "Other User" };
            
            var group = new Group { Id = 1, Name = "Test Group" };
            var project = new Project { Id = 1, Title = "Main Project", GroupId = 1, OverseenByUserId = "other-user" };
            var task = new ProjectTask { Id = 1, Project = project, Title = "Main Task" };

            _context.Users.AddRange(user, otherUser);
            _context.Groups.Add(group);
            _context.Projects.Add(project);
            _context.ProjectTasks.Add(task);
            await _context.SaveChangesAsync();
            
            // Clear tracker to ensure fresh data retrieval
            _context.ChangeTracker.Clear();
        }

        #region Logging Your Work

        [Fact]
        public async Task LogTimesheet_ValidData_ShouldReturnOk()
        {
            // Arrange
            await SeedBasicData();
            var dto = new TimesheetDto { WorkDate = DateTime.UtcNow, Description = "Worked hard", HoursSpent = 4 };

            // Act
            var result = await _controller.LogTimesheet(1, dto);

            // Assert
            var okResult = Assert.IsType<OkObjectResult>(result);
            var response = Assert.IsType<ApiResponse>(okResult.Value);
            Assert.Equal("Work log created successfully", response.Message);
            Assert.True(await _context.Timesheets.AnyAsync(t => t.UserId == _testUserId && t.TaskId == 1));
        }

        [Fact]
        public async Task LogTimesheet_TaskNotFound_ShouldReturnNotFound()
        {
            // Arrange
            await SeedBasicData();
            var dto = new TimesheetDto { WorkDate = DateTime.UtcNow, Description = "Worked hard", HoursSpent = 4 };

            // Act
            var result = await _controller.LogTimesheet(999, dto);

            // Assert
            Assert.IsType<NotFoundObjectResult>(result);
        }

        #endregion

        #region Bulk Logging

        [Fact]
        public async Task BulkLogTimesheets_MixedValidAndInvalid_ShouldSaveValidOnly()
        {
            // Arrange
            await SeedBasicData();
            var task2 = new ProjectTask { Id = 2, ProjectId = 1, Title = "Task 2" };
            _context.ProjectTasks.Add(task2);
            await _context.SaveChangesAsync();

            var request = new BulkTimesheetRequestDto
            {
                Logs = new List<TimesheetDto>
                {
                    new TimesheetDto { TaskId = 1, WorkDate = DateTime.UtcNow, HoursSpent = 2 },
                    new TimesheetDto { TaskId = 2, WorkDate = DateTime.UtcNow, HoursSpent = 3 },
                    new TimesheetDto { TaskId = 99, WorkDate = DateTime.UtcNow, HoursSpent = 1 } // Invalid
                }
            };

            // Act
            var result = await _controller.BulkLogTimesheets(1, request);

            // Assert
            var okResult = Assert.IsType<OkObjectResult>(result);
            var response = Assert.IsType<ApiResponse>(okResult.Value);
            Assert.Contains("2 work logs created successfully, 1 skipped", response.Message);
            Assert.Equal(2, await _context.Timesheets.CountAsync(t => t.UserId == _testUserId));
        }

        #endregion

        #region Security (Author-only)

        [Fact]
        public async Task UpdateTimesheet_OwnEntry_ShouldSuccess()
        {
            // Arrange
            await SeedBasicData();
            var entry = new Timesheet { Id = 101, TaskId = 1, UserId = _testUserId, Description = "Old", HoursSpent = 1 };
            _context.Timesheets.Add(entry);
            await _context.SaveChangesAsync();

            var updateDto = new TimesheetUpdateDto { Description = "New" };

            // Act
            var result = await _controller.UpdateTimesheet(101, updateDto);

            // Assert
            Assert.IsType<OkObjectResult>(result);
            var updated = await _context.Timesheets.FindAsync(101);
            Assert.Equal("New", updated!.Description);
        }

        [Fact]
        public async Task UpdateTimesheet_OthersEntry_ShouldReturnForbid()
        {
            // Arrange
            await SeedBasicData();
            var entry = new Timesheet { Id = 102, TaskId = 1, UserId = "other-user", Description = "Other's", HoursSpent = 1 };
            _context.Timesheets.Add(entry);
            await _context.SaveChangesAsync();

            var updateDto = new TimesheetUpdateDto { Description = "Hacked" };

            // Act
            var result = await _controller.UpdateTimesheet(102, updateDto);

            // Assert
            Assert.IsType<ForbidResult>(result);
        }

        [Fact]
        public async Task DeleteTimesheet_OwnEntry_ShouldSoftDelete()
        {
            // Arrange
            await SeedBasicData();
            var entry = new Timesheet { Id = 103, TaskId = 1, UserId = _testUserId, HoursSpent = 1, IsDeleted = false };
            _context.Timesheets.Add(entry);
            await _context.SaveChangesAsync();

            // Act
            var result = await _controller.DeleteTimesheet(103);

            // Assert
            Assert.IsType<OkObjectResult>(result);
            var deleted = await _context.Timesheets.IgnoreQueryFilters().FirstOrDefaultAsync(t => t.Id == 103);
            Assert.True(deleted!.IsDeleted);
        }

        #endregion

        #region Project Visibility

        [Fact]
        public async Task GetTaskTimesheets_Member_ShouldReturnList()
        {
            // Arrange
            await SeedBasicData();
            _context.UserGroups.Add(new UserGroup { GroupId = 1, UserId = _testUserId });
            _context.Timesheets.Add(new Timesheet { TaskId = 1, UserId = _testUserId, HoursSpent = 1, WorkDate = DateTime.UtcNow });
            await _context.SaveChangesAsync();

            // Act
            var result = await _controller.GetTaskTimesheets(1);

            // Assert
            var okResult = Assert.IsType<OkObjectResult>(result);
            var response = Assert.IsType<ApiResponse>(okResult.Value);
            Assert.Contains("1 logs found", response.Message);
        }

        [Fact(Skip = "In-Memory database provider cannot evaluate navigation-based global filters (!pt.Project.IsDeleted) that are defined in this project.")]
        public async Task GetTaskTimesheets_Outsider_ShouldReturnForbidden()
        {
            // Arrange
            await SeedBasicData();
            // No group membership added

            // Act
            var result = await _controller.GetTaskTimesheets(1);

            // Assert
            var objectResult = Assert.IsType<ObjectResult>(result);
            Assert.Equal(403, objectResult.StatusCode);
        }

        #endregion

        #region Team Roster

        [Fact]
        public async Task GetProjectTeam_Overseer_ShouldReturnList()
        {
            // Arrange
            await SeedBasicData();
            // Make me the overseer
            var project = await _context.Projects.FindAsync(1);
            project!.OverseenByUserId = _testUserId;
            await _context.SaveChangesAsync();

            // Act
            var result = await _controller.GetProjectTeam(1);

            // Assert
            Assert.IsType<OkObjectResult>(result);
        }

        #endregion

        #region Edge Cases

        [Fact]
        public async Task GetMyTimesheets_FilteredByProject_ShouldOnlyReturnThatProject()
        {
            // Arrange
            await SeedBasicData();
            var project2 = new Project { Id = 2, Title = "Other Proj", GroupId = 1, OverseenByUserId = "other" };
            var task2 = new ProjectTask { Id = 2, ProjectId = 2, Title = "Other task" };
            
            _context.Projects.Add(project2);
            _context.ProjectTasks.Add(task2);
            _context.Timesheets.AddRange(
                new Timesheet { UserId = _testUserId, TaskId = 1, HoursSpent = 1, WorkDate = DateTime.UtcNow },
                new Timesheet { UserId = _testUserId, TaskId = 2, HoursSpent = 2, WorkDate = DateTime.UtcNow }
            );
            await _context.SaveChangesAsync();

            // Act
            var result = await _controller.GetMyTimesheets(2);

            // Assert
            var okResult = Assert.IsType<OkObjectResult>(result);
            var data = (System.Collections.IEnumerable)Assert.IsType<ApiResponse>(okResult.Value).Data;
            var list = new List<object>();
            foreach (var item in data) list.Add(item);
            Assert.Single(list);
        }

        [Fact]
        public async Task UpdateTimesheet_DeletedEntry_ShouldReturnNotFound()
        {
            // Arrange
            await SeedBasicData();
            _context.Timesheets.Add(new Timesheet { Id = 999, UserId = _testUserId, TaskId = 1, IsDeleted = true });
            await _context.SaveChangesAsync();

            // Act
            var result = await _controller.UpdateTimesheet(999, new TimesheetUpdateDto { Description = "Update" });

            // Assert
            Assert.IsType<NotFoundObjectResult>(result);
        }

        #endregion
    }
}
