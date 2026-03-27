using api.Data;
using api.Models;
using api.Services;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Moq;
using Xunit;

namespace Ideahub.Tests
{
    public class PasswordResetServiceTests : IDisposable
    {
        private readonly IdeahubDbContext _context;
        private readonly Mock<UserManager<IdeahubUser>> _mockUserManager;
        private readonly Mock<ILogger<PasswordResetService>> _mockLogger;
        private readonly PasswordResetService _service;

        public PasswordResetServiceTests()
        {
            // Setup In-Memory DB
            var options = new DbContextOptionsBuilder<IdeahubDbContext>()
                .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
                .Options;
            _context = new IdeahubDbContext(options);

            // Setup Mock UserManager using this helper pattern
            var userStoreMock = new Mock<IUserStore<IdeahubUser>>();
            _mockUserManager = new Mock<UserManager<IdeahubUser>>(
                userStoreMock.Object, null!, null!, null!, null!, null!, null!, null!, null!);

            _mockLogger = new Mock<ILogger<PasswordResetService>>();

            _service = new PasswordResetService(_context, _mockUserManager.Object, _mockLogger.Object);
        }

        public void Dispose()
        {
            _context.Database.EnsureDeleted();
            _context.Dispose();
        }

        [Fact]
        public async Task GeneratePasswordResetCodeAsync_ShouldReturnCode_WhenUserExists()
        {
            // Arrange
            string userId = "user1";
            var user = new IdeahubUser { Id = userId, UserName = "test", Email = "test@test.com", DisplayName = "Test" };
            
            // Actually add to mock DB so the Query Filter doesn't hide results
            _context.Users.Add(user);
            await _context.SaveChangesAsync();
            
            _mockUserManager.Setup(m => m.FindByIdAsync(userId)).ReturnsAsync(user);

            // Act
            var (code, success) = await _service.GeneratePasswordResetCodeAsync(userId);

            // Assert
            Assert.True(success);
            Assert.NotEmpty(code);

            var dbRecord = await _context.PasswordResets.IgnoreQueryFilters().FirstOrDefaultAsync();
            Assert.NotNull(dbRecord);
            Assert.Equal(userId, dbRecord.UserId);
        }

        [Fact]
        public async Task GeneratePasswordResetCodeAsync_ShouldInvalidateOldCodes()
        {
            // Arrange
            string userId = "user1";
            var user = new IdeahubUser { Id = userId, UserName = "test", Email = "test@test.com", DisplayName = "Test" };
            
            _context.Users.Add(user);
            _mockUserManager.Setup(m => m.FindByIdAsync(userId)).ReturnsAsync(user);

            // Create an old code
            var oldReset = new PasswordReset
            {
                UserId = userId,
                Code = "old_hash",
                ExpiresAt = DateTime.UtcNow.AddMinutes(10),
                Used = false
            };
            _context.PasswordResets.Add(oldReset);
            await _context.SaveChangesAsync();

            // Act
            await _service.GeneratePasswordResetCodeAsync(userId);

            // Assert
            var updatedOldReset = await _context.PasswordResets.IgnoreQueryFilters().FirstAsync(r => r.Code == "old_hash");
            Assert.True(updatedOldReset.Used);
        }

        [Fact]
        public async Task ValidateCodeAndResetPasswordAsync_ShouldSucceed_WhenCodeIsValid()
        {
            // Arrange
            string userId = "user1";
            var user = new IdeahubUser { Id = userId, UserName = "test", Email = "test@test.com", DisplayName = "Test" };
            
            _context.Users.Add(user);
            await _context.SaveChangesAsync();
            
            _mockUserManager.Setup(m => m.FindByIdAsync(userId)).ReturnsAsync(user);
            
            var (code, _) = await _service.GeneratePasswordResetCodeAsync(userId);
            
            _mockUserManager.Setup(m => m.GeneratePasswordResetTokenAsync(user)).ReturnsAsync("token");
            _mockUserManager.Setup(m => m.ResetPasswordAsync(user, "token", "NewPass123!"))
                .ReturnsAsync(IdentityResult.Success);

            // Act
            var (success, error) = await _service.ValidateCodeAndResetPasswordAsync(code, "NewPass123!");

            // Assert
            Assert.True(success);

            var resetRecord = await _context.PasswordResets.IgnoreQueryFilters().FirstAsync();
            Assert.True(resetRecord.Used);
        }

        [Fact]
        public async Task ValidateCodeAndResetPasswordAsync_ShouldFail_WhenCodeIsExpired()
        {
            // Arrange
            string userId = "user1";
            var user = new IdeahubUser { Id = userId, UserName = "test", Email = "test@test.com", DisplayName = "Test" };
            _context.Users.Add(user);
            await _context.SaveChangesAsync();
            
            _mockUserManager.Setup(m => m.FindByIdAsync(userId)).ReturnsAsync(user);

            // Generate a real code/hash pair using the service
            var (code, _) = await _service.GeneratePasswordResetCodeAsync(userId);
            
            // Manually expire the record in the database
            var record = await _context.PasswordResets.FirstAsync();
            record.ExpiresAt = DateTime.UtcNow.AddMinutes(-5);
            await _context.SaveChangesAsync();

            // Act
            var (success, error) = await _service.ValidateCodeAndResetPasswordAsync(code, "NewPass123!");

            // Assert
            Assert.False(success);
            Assert.Equal("Invalid or expired reset code", error);
        }

        [Fact]
        public async Task ValidateCodeAndResetPasswordAsync_ShouldReturnIdentityError_WhenPasswordTooSimple()
        {
            // Arrange
            string userId = "user1";
            var user = new IdeahubUser { Id = userId, UserName = "test", Email = "test@test.com", DisplayName = "Test" };
            
            _context.Users.Add(user);
            await _context.SaveChangesAsync();
            
            _mockUserManager.Setup(m => m.FindByIdAsync(userId)).ReturnsAsync(user);
            
            var (code, _) = await _service.GeneratePasswordResetCodeAsync(userId);
            
            var identityError = new IdentityErrorDescriber().PasswordTooShort(8);
            _mockUserManager.Setup(m => m.GeneratePasswordResetTokenAsync(user)).ReturnsAsync("token");
            _mockUserManager.Setup(m => m.ResetPasswordAsync(user, "token", "123"))
                .ReturnsAsync(IdentityResult.Failed(identityError));

            // Act
            var (success, error) = await _service.ValidateCodeAndResetPasswordAsync(code, "123");

            // Assert
            Assert.False(success);
            Assert.Contains("Passwords must be at least 8 characters", error);
        }

        [Fact]
        public async Task ValidateCodeAndResetPasswordAsync_ShouldFail_WhenCodeIsAlreadyUsed()
        {
            // Arrange
            string userId = "user1";
            var user = new IdeahubUser { Id = userId, UserName = "test", Email = "test@test.com", DisplayName = "Test" };
            _context.Users.Add(user);
            await _context.SaveChangesAsync();
            
            _mockUserManager.Setup(m => m.FindByIdAsync(userId)).ReturnsAsync(user);

            // Generate a real code/hash pair using the service
            var (code, _) = await _service.GeneratePasswordResetCodeAsync(userId);
            
            // Manually mark the record as USED in the database
            var record = await _context.PasswordResets.FirstAsync();
            record.Used = true;
            record.UsedAt = DateTime.UtcNow.AddMinutes(-5);
            await _context.SaveChangesAsync();

            // Act
            var (success, error) = await _service.ValidateCodeAndResetPasswordAsync(code, "NewPass123!");

            // Assert
            Assert.False(success);
            Assert.Equal("Invalid or expired reset code", error);
        }
    }
}
