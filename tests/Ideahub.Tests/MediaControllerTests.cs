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
            catch (ObjectDisposedException) { }
        }

        private async Task SeedBasicData()
        {
            var user = new IdeahubUser { Id = _testUserId, Email = "test@example.com", DisplayName = "Test User", UserName = "test@example.com" };
            _context.Users.Add(user);

            var group = new Group { Id = 1, Name = "Test Group" };
            _context.Groups.Add(group);
            _context.UserGroups.Add(new UserGroup { UserId = _testUserId, GroupId = 1 });

            var idea = new Idea { Id = 10, Title = "Test Idea", UserId = _testUserId, GroupId = 1 };
            _context.Ideas.Add(idea);

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
            await SeedBasicData();
            var fileMock = CreateMockFile("test.jpg", 1024);
            _mockMediaService.Setup(s => s.SaveFileAsync(It.IsAny<IFormFile>(), It.IsAny<string>())).ReturnsAsync("uploads/test.jpg");
            var dto = new MediaDto { File = fileMock.Object, MediaType = MediaType.Image };

            var result = await _controller.UploadMedia(dto, ideaId: 10);

            var okResult = Assert.IsType<OkObjectResult>(result);
            Assert.Single(_context.Media);
        }

        [Fact]
        public async Task UploadMedia_MultiScope_ShouldReturnBadRequest()
        {
            await SeedBasicData();
            var fileMock = CreateMockFile("valid.pdf", 1024);
            var dto = new MediaDto { File = fileMock.Object, MediaType = MediaType.Document };

            var result = await _controller.UploadMedia(dto, projectId: 1, timesheetId: 1);

            Assert.IsType<BadRequestObjectResult>(result);
            _mockMediaService.Verify(s => s.SaveFileAsync(It.IsAny<IFormFile>(), It.IsAny<string>()), Times.Never);
        }

        [Fact]
        public async Task ViewMedia_Unscoped_ShouldReturnBadRequest()
        {
            await SeedBasicData();

            // Act: Providing NO IDs (Mass Enumeration Attack)
            var result = await _controller.ViewMedia();

            Assert.IsType<BadRequestObjectResult>(result);
        }

        [Fact]
        public async Task UploadMedia_InvalidExtension_ShouldReturnBadRequest()
        {
            await SeedBasicData();
            var fileMock = CreateMockFile("virus.exe", 1024);
            var dto = new MediaDto { File = fileMock.Object, MediaType = MediaType.Image };

            var result = await _controller.UploadMedia(dto, ideaId: 10);

            Assert.IsType<BadRequestObjectResult>(result);
        }

        [Fact]
        public async Task UploadMedia_ExceedsSize_ShouldReturnBadRequest()
        {
            await SeedBasicData();
            var fileMock = CreateMockFile("huge.png", 21L * 1024 * 1024);
            var dto = new MediaDto { File = fileMock.Object, MediaType = MediaType.Image };

            var result = await _controller.UploadMedia(dto, ideaId: 10);

            Assert.IsType<BadRequestObjectResult>(result);
        }

        [Fact]
        public async Task UploadMedia_ToUnauthorizedTimesheet_ShouldReturnForbidden()
        {
            await SeedBasicData();
            var fileMock = CreateMockFile("proof.pdf", 1024);
            var dto = new MediaDto { File = fileMock.Object, MediaType = MediaType.Document };

            var ts = new Timesheet { Id = 1, UserId = "someone-else", Description = "Work", WorkDate = DateTime.Now };
            _context.Timesheets.Add(ts);
            await _context.SaveChangesAsync();

            var result = await _controller.UploadMedia(dto, timesheetId: 1);

            var statusCodeResult = Assert.IsType<ObjectResult>(result);
            Assert.Equal(403, statusCodeResult.StatusCode);
        }

        [Fact]
        public async Task ViewMedia_ForIdea_ShouldReturnList()
        {
            await SeedBasicData();
            // SeedBasicData already added Idea 10. Let's just use it.
            _context.Media.Add(new Media { FilePath = "f1", IdeaId = 10, UserId = _testUserId, MediaType = MediaType.Image });
            await _context.SaveChangesAsync();

            var result = await _controller.ViewMedia(ideaId: 10);

            var okResult = Assert.IsType<OkObjectResult>(result);
            var response = Assert.IsType<ApiResponse>(okResult.Value);
            var list = Assert.IsAssignableFrom<System.Collections.IEnumerable>(response.Data);
            Assert.NotEmpty(list);
        }

        [Fact]
        public async Task ViewMedia_ForUnauthorizedTask_ShouldReturnForbidden()
        {
            await SeedBasicData();
            // Put in Group 99 (authorized for Group 1)
            var project = new Project { Id = 5, GroupId = 99, OverseenByUserId = "other" };
            var task = new ProjectTask { Id = 100, ProjectId = 5, Title = "Secret" };
            _context.Projects.Add(project);
            _context.ProjectTasks.Add(task);
            await _context.SaveChangesAsync();

            var result = await _controller.ViewMedia(projectTaskId: 100);

            var statusCodeResult = Assert.IsType<ObjectResult>(result);
            Assert.Equal(403, statusCodeResult.StatusCode);
        }

        [Fact]
        public async Task ViewMedia_MultiScope_ShouldReturnBadRequest()
        {
            await SeedBasicData();
            var result = await _controller.ViewMedia(projectId: 1, ideaId: 10);
            Assert.IsType<BadRequestObjectResult>(result);
        }

        [Fact]
        public async Task DeleteMedia_AsAuthor_ShouldSucceed()
        {
            await SeedBasicData();
            var media = new Media { FilePath = "path.jpg", UserId = _testUserId, MediaType = MediaType.Image };
            _context.Media.Add(media);
            await _context.SaveChangesAsync();

            _mockMediaService.Setup(s => s.DeleteFileAsync(It.IsAny<string>())).ReturnsAsync(true);

            var result = await _controller.DeleteMedia(media.Id);

            Assert.IsType<OkObjectResult>(result);
        }

        [Fact]
        public async Task UploadMedia_FailedDbSave_ShouldDeletePhysicalFile()
        {
            await SeedBasicData();
            var fileMock = CreateMockFile("fail.jpg", 1024);
            var savedPath = "uploads/fail.jpg";
            _mockMediaService.Setup(s => s.SaveFileAsync(It.IsAny<IFormFile>(), It.IsAny<string>())).ReturnsAsync(savedPath);
            _mockMediaService.Setup(s => s.DeleteFileAsync(It.IsAny<string>())).ReturnsAsync(true);

            _mockMediaService.Setup(s => s.SaveFileAsync(It.IsAny<IFormFile>(), It.IsAny<string>()))
                .Callback(() => _context.Dispose())
                .ReturnsAsync(savedPath);

            var dto = new MediaDto { File = fileMock.Object, MediaType = MediaType.Image };

            var result = await _controller.UploadMedia(dto, ideaId: 10);

            Assert.IsType<BadRequestObjectResult>(result);
            _mockMediaService.Verify(s => s.DeleteFileAsync(savedPath), Times.Once);
        }
    }
}