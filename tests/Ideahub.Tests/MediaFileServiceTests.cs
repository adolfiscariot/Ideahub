using Microsoft.AspNetCore.Http;
using Moq;
using System.Text;
using api.Services;
using Xunit;

namespace Ideahub.Tests
{
    public class MediaFileServiceTests : IDisposable
    {
        private readonly string _storagePath;
        private readonly LocalMediaFileService _service;

        public MediaFileServiceTests()
        {
            _service = new LocalMediaFileService();
            _storagePath = Path.Combine(Directory.GetCurrentDirectory(), "Storage", "media");
        }

        public void Dispose()
        {
            if (Directory.Exists(_storagePath))
            {
                // Clean up the Storage/media folder in the test output directory
                Directory.Delete(Path.Combine(Directory.GetCurrentDirectory(), "Storage"), true);
            }
        }

        [Fact]
        public async Task SaveFileAsync_ShouldSaveFileToDisk()
        {
            // Arrange
            var fileName = "test.txt";
            var content = "Hello World";
            var fileMock = new Mock<IFormFile>();
            var ms = new MemoryStream(Encoding.UTF8.GetBytes(content));
            
            fileMock.Setup(_ => _.FileName).Returns(fileName);
            fileMock.Setup(_ => _.Length).Returns(ms.Length);
            fileMock.Setup(_ => _.OpenReadStream()).Returns(ms);
            fileMock.Setup(_ => _.CopyToAsync(It.IsAny<Stream>(), It.IsAny<CancellationToken>()))
                .Callback<Stream, CancellationToken>((s, c) => ms.CopyTo(s))
                .Returns(Task.CompletedTask);

            // Act
            var relativePath = await _service.SaveFileAsync(fileMock.Object, "sub");

            // Assert
            var fullPath = Path.Combine(_storagePath, "sub", Path.GetFileName(relativePath));
            Assert.True(File.Exists(fullPath));
            Assert.Equal(content, File.ReadAllText(fullPath));
            Assert.Contains("media/sub/", relativePath);
        }

        [Fact]
        public async Task SaveFileAsync_ShouldThrowException_WhenFileIsEmpty()
        {
            // Arrange
            var fileMock = new Mock<IFormFile>();
            fileMock.Setup(_ => _.Length).Returns(0);

            // Act & Assert
            await Assert.ThrowsAsync<ArgumentException>(() => _service.SaveFileAsync(fileMock.Object));
        }

        [Fact]
        public async Task SaveFileAsync_ShouldSanitizeSubFolder()
        {
            // Arrange
            var fileMock = new Mock<IFormFile>();
            var ms = new MemoryStream(Encoding.UTF8.GetBytes("test"));
            fileMock.Setup(_ => _.FileName).Returns("test.txt");
            fileMock.Setup(_ => _.Length).Returns(ms.Length);
            fileMock.Setup(_ => _.OpenReadStream()).Returns(ms);
            fileMock.Setup(_ => _.CopyToAsync(It.IsAny<Stream>(), It.IsAny<CancellationToken>()))
                .Callback<Stream, CancellationToken>((s, c) => ms.CopyTo(s))
                .Returns(Task.CompletedTask);

            // Malicious subfolder attempt
            var maliciousSubFolder = "../../SecretFolder";

            // Act
            var relativePath = await _service.SaveFileAsync(fileMock.Object, maliciousSubFolder);

            // Assert
            // It should have been sanitized to just "SecretFolder"
            Assert.Contains("media/SecretFolder/", relativePath);
            var expectedPath = Path.Combine(_storagePath, "SecretFolder");
            Assert.True(Directory.Exists(expectedPath));
            
            // Should NOT have created a folder two levels up
            var forbiddenPath = Path.GetFullPath(Path.Combine(_storagePath, "..", "..", "SecretFolder"));
            Assert.False(Directory.Exists(forbiddenPath));
        }

        [Fact]
        public async Task DeleteFileAsync_ShouldRemoveFileFromDisk()
        {
            // Arrange
            var subFolder = "deleteme";
            var fileName = "temp.txt";
            var dirPath = Path.Combine(_storagePath, subFolder);
            Directory.CreateDirectory(dirPath);
            
            var fullPath = Path.Combine(dirPath, fileName);
            File.WriteAllText(fullPath, "content");
            
            var relativePath = $"media/{subFolder}/{fileName}";

            // Act
            var result = await _service.DeleteFileAsync(relativePath);

            // Assert
            Assert.True(result);
            Assert.False(File.Exists(fullPath));
        }

        [Fact]
        public void GetFilePath_ShouldReturnCorrectFullPath()
        {
            // Arrange
            var relativePath = "media/projects/1/img.png";

            // Act
            var fullPath = _service.GetFilePath(relativePath);

            // Assert
            var expected = Path.Combine(_storagePath, "projects", "1", "img.png");
            Assert.Equal(expected, fullPath);
        }
    }
}
