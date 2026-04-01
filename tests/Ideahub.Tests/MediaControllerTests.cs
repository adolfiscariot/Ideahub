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
using Moq;
using Xunit;

namespace Ideahub.Tests
{
    public class MediaControllerTests : IDisposable
    {
        private readonly IdeahubDbContext _context;
        private readonly MediaController _controller;
        private readonly Mock<IMediaFileService> _mockMediaService;
        private readonly Mock<UserManager<IdeahubUser>> _mockUserManager;
        private readonly string _testUserId = "user-123";

        public MediaControllerTests()
        {
            var options = new DbContextOptionsBuilder<IdeahubDbContext>()
                .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
                .Options;

            _context = new IdeahubDbContext(options);
            _mockMediaService = new Mock<IMediaFileService>();
            
            var store = new Mock<IUserStore<IdeahubUser>>();
            _mockUserManager = new Mock<UserManager<IdeahubUser>>(store.Object, null!, null!, null!, null!, null!, null!, null!, null!);

            var logger = new Mock<Microsoft.Extensions.Logging.ILogger<MediaController>>();

            var user = new ClaimsPrincipal(new ClaimsIdentity(new Claim[]
            {
                new Claim(ClaimTypes.NameIdentifier, _testUserId),
                new Claim(ClaimTypes.Email, "test@example.com")
            }, "TestAuthentication"));

            _controller = new MediaController(logger.Object, _context, _mockUserManager.Object, _mockMediaService.Object)
            {
                ControllerContext = new ControllerContext
                {
                    HttpContext = new DefaultHttpContext { User = user }
                }
            };
        }

        public void Dispose()
        {
            try
            {
                _context.Database.EnsureDeleted();
                _context.Dispose();
            }
            catch (ObjectDisposedException)
            {
            
            }
        }

        private async Task SeedBasicData()
        {
            var user = new IdeahubUser { Id = _testUserId, Email = "test@example.com", DisplayName = "Test User", UserName = "test@example.com" };
            _context.Users.Add(user);
            await _context.SaveChangesAsync();
        }

        private Mock<IFormFile> CreateMockFile(string fileName, long length)
        {
            var fileMock = new Mock<IFormFile>();
            fileMock.Setup(_ => _.FileName).Returns(fileName);
            fileMock.Setup(_ => _.Length).Returns(length);
            return fileMock;
        }

        [Fact]
        public async Task UploadMedia_ValidImage_ShouldSucceed()
        {
            // Arrange
            await SeedBasicData();
            var fileMock = CreateMockFile("test.jpg", 1024);
            _mockMediaService.Setup(s => s.SaveFileAsync(It.IsAny<IFormFile>(), It.IsAny<string>())).ReturnsAsync("uploads/test.jpg");
            var dto = new MediaDto { File = fileMock.Object, MediaType = MediaType.Image };

            // Act
            var result = await _controller.UploadMedia(dto);

            // Assert
            var okResult = Assert.IsType<OkObjectResult>(result);
            Assert.Single(_context.Media);
            _mockMediaService.Verify(s => s.SaveFileAsync(It.IsAny<IFormFile>(), It.IsAny<string>()), Times.Once);
        }

        [Fact]
        public async Task UploadMedia_MultiScope_ShouldReturnBadRequest()
        {
            // Arrange: Attempting to bypass security by providing two IDs (The Trojan Horse)
            await SeedBasicData();
            var fileMock = CreateMockFile("virus.exe", 1024);
            var dto = new MediaDto { File = fileMock.Object, MediaType = MediaType.Document };

            // Act: Providing both a valid Project and a valid Timesheet
            var result = await _controller.UploadMedia(dto, projectId: 1, timesheetId: 1);

            // Assert: Should fail because strictly only one parent scope is allowed
            Assert.IsType<BadRequestObjectResult>(result);
        }

        [Fact]
        public async Task UploadMedia_InvalidExtension_ShouldReturnBadRequest()
        {
            // Arrange
            var fileMock = CreateMockFile("virus.exe", 1024);
            var dto = new MediaDto { File = fileMock.Object, MediaType = MediaType.Image };

            // Act
            var result = await _controller.UploadMedia(dto);

            // Assert
            Assert.IsType<BadRequestObjectResult>(result);
        }

        [Fact]
        public async Task UploadMedia_ExceedsSize_ShouldReturnBadRequest()
        {
            // Arrange
            var fileMock = CreateMockFile("huge.png", 21L * 1024 * 1024); // 21MB
            var dto = new MediaDto { File = fileMock.Object, MediaType = MediaType.Image };

            // Act
            var result = await _controller.UploadMedia(dto);

            // Assert
            Assert.IsType<BadRequestObjectResult>(result);
        }

        [Fact]
        public async Task UploadMedia_ToUnauthorizedTimesheet_ShouldReturnForbidden()
        {
            // Arrange
            await SeedBasicData();
            var fileMock = CreateMockFile("proof.pdf", 1024);
            var dto = new MediaDto { File = fileMock.Object, MediaType = MediaType.Document };
            
            var group2 = new Group { Id = 2, Name = "Forbidden Group" };
            var project = new Project { Id = 1, GroupId = 2, Title = "Private Project" };
            var task = new ProjectTask 
            { 
                Id = 10, 
                ProjectId = 1, 
                Project = project, 
                Title = "Secret Task",
                TaskAssignees = new List<TaskAssignee>(),
                SubTasks = new List<SubTask>()
            };
            var ts = new Timesheet { Id = 1, UserId = "someone-else", TaskId = 10, Task = task, Description = "Work", WorkDate = DateTime.Now };
            
            _context.Groups.Add(group2);
            _context.Projects.Add(project);
            _context.ProjectTasks.Add(task);
            _context.Timesheets.Add(ts);
            await _context.SaveChangesAsync();

            // Act
            var result = await _controller.UploadMedia(dto, timesheetId: 1);

            // Assert
            var statusCodeResult = Assert.IsType<ObjectResult>(result);
            Assert.Equal(403, statusCodeResult.StatusCode);
        }

        [Fact]
        public async Task UploadMedia_ToOrphanedTimesheet_ShouldReturnForbiddenSafely()
        {
            // Arrange
            await SeedBasicData();
            var fileMock = CreateMockFile("test.pdf", 1024);
            var dto = new MediaDto { File = fileMock.Object, MediaType = MediaType.Document };

            var ts = new Timesheet { Id = 500, UserId = "someone-else", Description = "Orphaned", WorkDate = DateTime.Now };
            _context.Timesheets.Add(ts);
            await _context.SaveChangesAsync();

            // Act
            var result = await _controller.UploadMedia(dto, timesheetId: 500);

            // Assert
            var statusCodeResult = Assert.IsType<ObjectResult>(result);
            Assert.Equal(403, statusCodeResult.StatusCode);
        }

        [Fact]
        public async Task UploadMedia_ToUnauthorizedTask_ShouldReturnForbidden()
        {
            // Arrange
            await SeedBasicData();
            var fileMock = CreateMockFile("virus.pdf", 1024);
            var dto = new MediaDto { File = fileMock.Object, MediaType = MediaType.Document };

            var otherGroup = new Group { Id = 88, Name = "Secret Group" };
            var otherProject = new Project { Id = 88, GroupId = 88, Title = "Secret Project" };
            var otherTask = new ProjectTask { Id = 888, ProjectId = 88, Title = "Secret Task" };
            
            _context.Groups.Add(otherGroup);
            _context.Projects.Add(otherProject);
            _context.ProjectTasks.Add(otherTask);
            await _context.SaveChangesAsync();

            // Act
            var result = await _controller.UploadMedia(dto, projectTaskId: 888);

            // Assert
            var statusCodeResult = Assert.IsType<ObjectResult>(result);
            Assert.Equal(403, statusCodeResult.StatusCode);
        }

        [Fact]
        public async Task ViewMedia_ForIdea_ShouldReturnList()
        {
            // Arrange
            await SeedBasicData();
            var idea10 = new Idea { Id = 10, Title = "Idea 10", UserId = "u1", GroupId = 1 };
            var idea20 = new Idea { Id = 20, Title = "Idea 20", UserId = "u1", GroupId = 1 };
            _context.Ideas.AddRange(idea10, idea20);
            
            _context.UserGroups.Add(new UserGroup { UserId = _testUserId, GroupId = 1 });
            
            _context.Media.Add(new Media { FilePath = "f1", IdeaId = 10, UserId = _testUserId, MediaType = MediaType.Image });
            _context.Media.Add(new Media { FilePath = "f2", IdeaId = 10, UserId = _testUserId, MediaType = MediaType.Image });
            _context.Media.Add(new Media { FilePath = "f3", IdeaId = 20, UserId = _testUserId, MediaType = MediaType.Image });
            await _context.SaveChangesAsync();

            // Act
            var result = await _controller.ViewMedia(ideaId: 10);

            // Assert
            var okResult = Assert.IsType<OkObjectResult>(result);
            var response = Assert.IsType<ApiResponse>(okResult.Value);
            var list = Assert.IsAssignableFrom<System.Collections.IEnumerable>(response.Data);
            
            int count = 0;
            foreach (var item in list) count++;
            Assert.Equal(2, count);
        }

        [Fact]
        public async Task ViewMedia_ForUnauthorizedTask_ShouldReturnForbidden()
        {
            // Arrange
            await SeedBasicData();

            var project = new Project { Id = 5, GroupId = 1, OverseenByUserId = "overseer-id" };
            var task = new ProjectTask { Id = 100, ProjectId = 5, Title = "Private Task" };
            _context.Projects.Add(project);
            _context.ProjectTasks.Add(task);
            await _context.SaveChangesAsync();

            // Act
            var result = await _controller.ViewMedia(projectTaskId: 100);

            // Assert
            var statusCodeResult = Assert.IsType<ObjectResult>(result);
            Assert.Equal(403, statusCodeResult.StatusCode);
        }

        [Fact]
        public async Task ViewMedia_MultiScope_ShouldReturnBadRequest()
        {
            // Arrange
            await SeedBasicData();

            // Act: Attempting to search across both Project and Idea at once
            var result = await _controller.ViewMedia(projectId: 1, ideaId: 1);

            // Assert: Strictly only one scope allowed per view request
            Assert.IsType<BadRequestObjectResult>(result);
        }

        [Fact]
        public async Task DeleteMedia_AsAuthor_ShouldSucceed()
        {
            // Arrange
            await SeedBasicData();
            var media = new Media { FilePath = "path/to/delete.jpg", UserId = _testUserId, MediaType = MediaType.Image };
            _context.Media.Add(media);
            await _context.SaveChangesAsync();
            var mediaId = media.Id;

            _mockMediaService.Setup(s => s.DeleteFileAsync(It.IsAny<string>())).ReturnsAsync(true);

            // Act
            var result = await _controller.DeleteMedia(mediaId);

            // Assert
            Assert.IsType<OkObjectResult>(result);
            Assert.Empty(_context.Media);
            _mockMediaService.Verify(s => s.DeleteFileAsync("path/to/delete.jpg"), Times.Once);
        }

        [Fact]
        public async Task DeleteMedia_AsNonAuthor_ShouldReturnUnauthorized()
        {
            // Arrange
            await SeedBasicData();
            var otherUser = new IdeahubUser { Id = "other-user", Email = "other@example.com", DisplayName = "Other User", UserName = "other@example.com" };
            _context.Users.Add(otherUser);
            await _context.SaveChangesAsync();

            var media = new Media { FilePath = "secret.jpg", UserId = "other-user", MediaType = MediaType.Image };
            _context.Media.Add(media);
            await _context.SaveChangesAsync();
            var mediaId = media.Id;

            // Act
            var result = await _controller.DeleteMedia(mediaId);

            // Assert
            Assert.IsType<UnauthorizedObjectResult>(result);
            Assert.Single(_context.Media);
        }

        [Fact]
        public async Task DeleteMedia_NotFound_ShouldReturnNotFound()
        {
            // Act
            var result = await _controller.DeleteMedia(999);

            // Assert
            Assert.IsType<NotFoundObjectResult>(result);
        }

        [Fact]
        public async Task UploadMedia_FailedDbSave_ShouldDeletePhysicalFile()
        {
            // Arrange
            await SeedBasicData();
            var fileMock = CreateMockFile("fail.jpg", 1024);
            var savedPath = "uploads/fail.jpg";

            _mockMediaService.Setup(s => s.SaveFileAsync(It.IsAny<IFormFile>(), It.IsAny<string>())).ReturnsAsync(savedPath);
            _mockMediaService.Setup(s => s.DeleteFileAsync(It.IsAny<string>())).ReturnsAsync(true);

            // simulate a DB failure by disposing the context
            _context.Dispose();

            var dto = new MediaDto { File = fileMock.Object, MediaType = MediaType.Image };

            // Act
            var result = await _controller.UploadMedia(dto);

            // Assert
            Assert.IsType<BadRequestObjectResult>(result);
            
            // verify that DeleteFileAsync was called for the orphaned file
            _mockMediaService.Verify(s => s.DeleteFileAsync(savedPath), Times.Once);
        }
    }
}