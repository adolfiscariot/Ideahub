using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using api.Models;
using api.Services;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Moq;
using Microsoft.EntityFrameworkCore;
using api.Data;
using Xunit;

namespace Ideahub.Tests
{
    public class TokenServiceTests
    {
        private readonly IConfiguration _configuration;
        private readonly Mock<UserManager<IdeahubUser>> _mockUserManager;
        private readonly Mock<ILogger<TokenService>> _mockLogger;
        private readonly TokenService _service;

        private const string TestKeyHex = "0123456789ABCDEF0123456789ABCDEF0123456789ABCDEF0123456789ABCDEF";

        public TokenServiceTests()
        {
            // Use real ConfigurationBuilder for stability with extension methods like .GetValue()
            var myConfiguration = new Dictionary<string, string?>
            {
                {"Jwt:Key", TestKeyHex},
                {"Jwt:Issuer", "TestIssuer"},
                {"Jwt:Audience", "TestAudience"},
                {"Jwt:Expiry", "15"}
            };

            _configuration = new ConfigurationBuilder()
                .AddInMemoryCollection(myConfiguration)
                .Build();
            
            var userStoreMock = new Mock<IUserStore<IdeahubUser>>();
            _mockUserManager = new Mock<UserManager<IdeahubUser>>(
                userStoreMock.Object, null!, null!, null!, null!, null!, null!, null!, null!);

            _mockLogger = new Mock<ILogger<TokenService>>();

            _service = new TokenService(_configuration, _mockUserManager.Object, _mockLogger.Object);
        }

        [Fact]
        public async Task CreateAccessTokenAsync_ShouldContainCorrectClaims()
        {
            // Arrange
            var user = new IdeahubUser 
            { 
                Id = "user123", 
                Email = "test@test.com", 
                DisplayName = "Test User" 
            };
            var roles = new List<string> { "SuperAdmin", "RegularUser" };
            
            _mockUserManager.Setup(m => m.GetRolesAsync(user)).ReturnsAsync(roles);

            // Act
            var tokenString = await _service.CreateAccessTokenAsync(user);

            // Assert
            var handler = new JwtSecurityTokenHandler();
            var jwtToken = handler.ReadJwtToken(tokenString);

            Assert.Equal("TestIssuer", jwtToken.Issuer);
            Assert.Contains(jwtToken.Claims, c => c.Type == ClaimTypes.NameIdentifier && c.Value == "user123");
            Assert.Contains(jwtToken.Claims, c => c.Type == ClaimTypes.Email && c.Value == "test@test.com");
            Assert.Contains(jwtToken.Claims, c => c.Type == ClaimTypes.Role && c.Value == "SuperAdmin");
            Assert.Contains(jwtToken.Claims, c => c.Type == ClaimTypes.Role && c.Value == "RegularUser");
        }

        [Fact]
        public async Task CreateAccessTokenAsync_ShouldThrow_WhenKeyIsMissing()
        {
            // Arrange - Create a "bad" config with no Key
            var emptyConfig = new ConfigurationBuilder()
                .AddInMemoryCollection(new Dictionary<string, string?>())
                .Build();
            
            var localService = new TokenService(emptyConfig, _mockUserManager.Object, _mockLogger.Object);
            var user = new IdeahubUser { Id = "1" };

            // Act & Assert
            var ex = await Assert.ThrowsAsync<Exception>(() => localService.CreateAccessTokenAsync(user));
            Assert.Equal("JWT Key Not Found!", ex.Message);
        }

        [Fact]
        public void GenerateRefreshToken_ShouldReturnBase64String()
        {
            // Act
            var token = _service.GenerateRefreshToken();

            // Assert
            Assert.NotEmpty(token);
            // Check if it's valid Base64
            Assert.True(token.EndsWith("==") || token.EndsWith("=") || token.Length % 4 == 0);
            
            // 32 bytes hash = 44 base64 chars
            Assert.Equal(44, token.Length);
        }

        [Fact]
        public async Task StoreRefreshTokenAsync_ShouldHashBeforeSaving()
        {
            // Arrange
            string userId = "user1";
            string rawToken = "my-secret-refresh-token";
            var user = new IdeahubUser { Id = userId };
            
            _mockUserManager.Setup(m => m.FindByIdAsync(userId)).ReturnsAsync(user);
            _mockUserManager.Setup(m => m.UpdateAsync(user)).ReturnsAsync(IdentityResult.Success);

            // Act
            await _service.StoreRefreshTokenAsync(userId, rawToken, DateTime.UtcNow.AddDays(1));

            // Assert
            Assert.Single(user.RefreshTokens);
            var storedToken = user.RefreshTokens.First().Token;
            
            // It should NOT be the raw token
            Assert.NotEqual(rawToken, storedToken);
            
            // Check if it's the SHA256 hash (Base64 encoded)
            Assert.Equal(44, storedToken.Length);
        }

        [Fact]
        public async Task RevokeRefreshTokenAsync_ShouldSetHasExpiredToTrue()
        {
            // Arrange
            var options = new DbContextOptionsBuilder<api.Data.IdeahubDbContext>()
                .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
                .Options;

            using var context = new api.Data.IdeahubDbContext(options);
            
            //Using a real UserManager acting as a simulator being mocked 
            var userStore = new Microsoft.AspNetCore.Identity.EntityFrameworkCore.UserStore<IdeahubUser>(context);
            var userManager = new UserManager<IdeahubUser>(
                userStore, null!, new PasswordHasher<IdeahubUser>(), 
                null!, null!, null!, null!, null!, null!);

            string userId = "user-to-logout";
            var user = new IdeahubUser 
            { 
                Id = userId, 
                UserName = "logoutuser",
                Email = "logout@test.com"
            };
            
            // Add tokens to the user
            user.RefreshTokens.Add(new RefreshToken { Token = "token1", TokenId = Guid.NewGuid().ToString(), HasExpired = false });
            user.RefreshTokens.Add(new RefreshToken { Token = "token2", TokenId = Guid.NewGuid().ToString(), HasExpired = false });

            context.Users.Add(user);
            await context.SaveChangesAsync();

            var serviceWithRealManager = new TokenService(_configuration, userManager, _mockLogger.Object);

            // Act
            await serviceWithRealManager.RevokeRefreshTokenAsync(userId);

            // Assert
            var updatedUser = await context.Users.Include(u => u.RefreshTokens).FirstAsync(u => u.Id == userId);
            Assert.All(updatedUser.RefreshTokens, t => Assert.True(t.HasExpired));
            
            // Clean up for other tests
            context.Database.EnsureDeleted();
        }

        [Fact]
        public async Task GetPrincipalFromExpiredToken_ShouldReturnValidPrincipal()
        {
            // Arrange
            var user = new IdeahubUser { Id = "user1", Email = "test@test.com", DisplayName = "Test User" };
            _mockUserManager.Setup(m => m.GetRolesAsync(user)).ReturnsAsync(new List<string>());

            // Generate access token
            var tokenString = await _service.CreateAccessTokenAsync(user);

            // Act
            var principal = _service.GetPrincipalFromExpiredToken(tokenString);

            // Assert
            Assert.NotNull(principal);
            Assert.Equal("user1", principal.FindFirstValue(ClaimTypes.NameIdentifier));
            Assert.Equal("test@test.com", principal.FindFirstValue(ClaimTypes.Email));
        }
    }
}
