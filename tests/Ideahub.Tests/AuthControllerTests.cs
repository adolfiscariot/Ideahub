using System.Security.Claims;
using System.Text.Json;
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
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Moq;
using Xunit;

namespace Ideahub.Tests
{
    public class AuthControllerTests : IDisposable
    {
        private readonly IdeahubDbContext _context;
        private readonly Mock<UserManager<IdeahubUser>> _mockUserManager;
        private readonly Mock<SignInManager<IdeahubUser>> _mockSignInManager;
        private readonly Mock<ILogger<AuthController>> _mockLogger;
        private readonly Mock<IEmailSender> _mockEmailSender;
        private readonly Mock<ITokenService> _mockTokenService;
        private readonly Mock<IPasswordResetService> _mockPasswordResetService;
        private readonly IConfiguration _configuration;
        private readonly AuthController _controller;

        public AuthControllerTests()
        {
            var options = new DbContextOptionsBuilder<IdeahubDbContext>()
                .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
                .Options;
            _context = new IdeahubDbContext(options);

            // Mock UserManager
            var userStoreMock = new Mock<IUserStore<IdeahubUser>>();
            _mockUserManager = new Mock<UserManager<IdeahubUser>>(
                userStoreMock.Object, null!, null!, null!, null!, null!, null!, null!, null!);

            // Mock SignInManager
            var contextAccessorMock = new Mock<IHttpContextAccessor>();
            var claimsFactoryMock = new Mock<IUserClaimsPrincipalFactory<IdeahubUser>>();
            _mockSignInManager = new Mock<SignInManager<IdeahubUser>>(
                _mockUserManager.Object, contextAccessorMock.Object, claimsFactoryMock.Object, null!, null!, null!, null!);

            _mockLogger = new Mock<ILogger<AuthController>>();
            _mockEmailSender = new Mock<IEmailSender>();
            _mockTokenService = new Mock<ITokenService>();
            _mockPasswordResetService = new Mock<IPasswordResetService>();

            var myConfiguration = new Dictionary<string, string?> { { "Jwt:Expiry", "15" } };
            _configuration = new ConfigurationBuilder().AddInMemoryCollection(myConfiguration).Build();

            _controller = new AuthController(
                _mockUserManager.Object,
                _mockSignInManager.Object,
                _mockLogger.Object,
                _mockEmailSender.Object,
                _configuration,
                _mockTokenService.Object,
                _context,
                _mockPasswordResetService.Object
            )
            {
                ControllerContext = new ControllerContext
                {
                    HttpContext = new DefaultHttpContext()
                }
            };
        }

        public void Dispose()
        {
            _context.Database.EnsureDeleted();
            _context.Dispose();
        }

        #region Registration

        [Fact]
        public async Task Register_UserShouldBeCreatedAndAssignedRegularRole()
        {
            // Arrange
            var dto = new RegisterDto { Email = "test@test.com", Password = "Password123!", DisplayName = "Test" };
            _mockUserManager.Setup(m => m.CreateAsync(It.IsAny<IdeahubUser>(), dto.Password))
                .ReturnsAsync(IdentityResult.Success);
            _mockUserManager.Setup(m => m.AddToRoleAsync(It.IsAny<IdeahubUser>(), RoleConstants.RegularUser))
                .ReturnsAsync(IdentityResult.Success);

            // Act
            var result = await _controller.Register(dto);

            // Assert
            var okResult = Assert.IsType<OkObjectResult>(result);
            _mockUserManager.Verify(m => m.CreateAsync(It.IsAny<IdeahubUser>(), dto.Password), Times.Once);
            _mockUserManager.Verify(m => m.AddToRoleAsync(It.IsAny<IdeahubUser>(), RoleConstants.RegularUser), Times.Once);
        }

        [Fact]
        public async Task Register_AppShouldReturnBadRequest_WhenEmailDuplicate()
        {
            // Arrange
            var dto = new RegisterDto { Email = "taken@test.com", Password = "Pass!", DisplayName = "Taken" };
            var identityError = new IdentityError { Description = "Email 'taken@test.com' is already taken" };
            _mockUserManager.Setup(m => m.CreateAsync(It.IsAny<IdeahubUser>(), dto.Password))
                .ReturnsAsync(IdentityResult.Failed(identityError));

            // Act
            var result = await _controller.Register(dto);

            // Assert
            var badRequest = Assert.IsType<BadRequestObjectResult>(result);
            var response = Assert.IsType<ApiResponse>(badRequest.Value);
            Assert.NotNull(response.Errors);
            Assert.Contains("already taken", response.Errors.First());
        }

        #endregion

        #region Login

        [Fact]
        public async Task Login_UserShouldReceiveAccessTokenAndCookie()
        {
            // Arrange
            var dto = new LoginDto { Email = "user@test.com", Password = "CorrectPass" };
            var user = new IdeahubUser { Id = "u1", Email = dto.Email };
            
            _mockUserManager.Setup(m => m.FindByEmailAsync(dto.Email)).ReturnsAsync(user);
            _mockSignInManager.Setup(m => m.PasswordSignInAsync(user, dto.Password, true, false))
                .ReturnsAsync(Microsoft.AspNetCore.Identity.SignInResult.Success);
            
            _mockTokenService.Setup(t => t.CreateAccessTokenAsync(user)).ReturnsAsync("access-token-123");
            _mockTokenService.Setup(t => t.GenerateRefreshToken()).Returns("refresh-token-456");

            // Act
            var result = await _controller.Login(dto);

            // Assert
            var okResult = Assert.IsType<OkObjectResult>(result);
            var response = Assert.IsType<ApiResponse>(okResult.Value);
            var tokenResponse = Assert.IsType<TokenResponse>(response.Data);

            Assert.Equal("access-token-123", tokenResponse.AccessToken);
            Assert.True(_controller.Response.Headers.ContainsKey("Set-Cookie"));
            Assert.Contains("refreshToken=refresh-token-456", _controller.Response.Headers["Set-Cookie"].ToString());
        }

        #endregion

        #region Refresh Token

        [Fact]
        public async Task RefreshAccessToken_AppShouldRotateTokens_WithValidInput()
        {
            // Arrange
            var requestBody = new TokenResponse { AccessToken = "expired-token", RefreshToken = "valid-refresh" };
            var user = new IdeahubUser { Id = "u1", UserName = "test" };
            var oldTokenHash = Convert.ToBase64String(System.Security.Cryptography.SHA256.HashData(System.Text.Encoding.UTF8.GetBytes("valid-refresh")));
            
            user.RefreshTokens.Add(new RefreshToken { Token = oldTokenHash, HasExpired = false, RefreshTokenExpiry = DateTime.UtcNow.AddDays(1) });
            _context.Users.Add(user);
            await _context.SaveChangesAsync();

            var principal = new ClaimsPrincipal(new ClaimsIdentity(new[] { new Claim(ClaimTypes.NameIdentifier, "u1") }));
            _mockTokenService.Setup(t => t.GetPrincipalFromExpiredToken(requestBody.AccessToken)).Returns(principal);
            _mockUserManager.Setup(m => m.Users).Returns(_context.Users);
            _mockTokenService.Setup(t => t.GenerateRefreshToken()).Returns("new-refresh-token");
            _mockTokenService.Setup(t => t.CreateAccessTokenAsync(user)).ReturnsAsync("new-access-token");

            // Act
            var result = await _controller.RefreshAccessToken(requestBody);

            // Assert
            var okResult = Assert.IsType<OkObjectResult>(result);
            Assert.True(user.RefreshTokens.First(t => t.Token == oldTokenHash).HasExpired); // Old token invalidated
            Assert.Contains("refreshToken=new-refresh-token", _controller.Response.Headers["Set-Cookie"].ToString());
        }

        [Fact]
        public async Task RefreshAccessToken_AppShouldFail_WhenBodySaysCookieButCookieIsMissing()
        {
            // Arrange
            var requestBody = new TokenResponse { AccessToken = "some-token", RefreshToken = "cookie" };
            // Ensure no cookie is in the HttpContext
            _controller.Request.Cookies = new Mock<IRequestCookieCollection>().Object; 

            // Act
            var result = await _controller.RefreshAccessToken(requestBody);

            // Assert
            var badRequest = Assert.IsType<BadRequestObjectResult>(result);
            var response = Assert.IsType<ApiResponse>(badRequest.Value);
            Assert.Contains("Authentication cookie missing", response.Message);
        }

        [Fact]
        public async Task RefreshAccessToken_AppShouldFail_WhenTokenIsAlreadyUsed()
        {
            // Arrange
            var requestBody = new TokenResponse { AccessToken = "some-token", RefreshToken = "hacked-token" };
            var user = new IdeahubUser { Id = "u1", UserName = "test" };
            var tokenHash = Convert.ToBase64String(System.Security.Cryptography.SHA256.HashData(System.Text.Encoding.UTF8.GetBytes("hacked-token")));
            
            user.RefreshTokens.Add(new RefreshToken { Token = tokenHash, HasExpired = true, RefreshTokenExpiry = DateTime.UtcNow.AddDays(1) });
            _context.Users.Add(user);
            await _context.SaveChangesAsync();

            var principal = new ClaimsPrincipal(new ClaimsIdentity(new[] { new Claim(ClaimTypes.NameIdentifier, "u1") }));
            _mockTokenService.Setup(t => t.GetPrincipalFromExpiredToken(requestBody.AccessToken)).Returns(principal);
            _mockUserManager.Setup(m => m.Users).Returns(_context.Users);

            // Act
            var result = await _controller.RefreshAccessToken(requestBody);

            // Assert
            var badRequest = Assert.IsType<BadRequestObjectResult>(result);
            var response = Assert.IsType<ApiResponse>(badRequest.Value);
            Assert.Equal("Invalid or expired refresh token", response.Message);
        }

        [Fact]
        public async Task RefreshAccessToken_AppShouldFail_WhenTokenIsExpiredByDate()
        {
            // Arrange
            var requestBody = new TokenResponse { AccessToken = "some-token", RefreshToken = "expired-token-val" };
            var user = new IdeahubUser { Id = "u1", UserName = "test" };
            var tokenHash = Convert.ToBase64String(System.Security.Cryptography.SHA256.HashData(System.Text.Encoding.UTF8.GetBytes("expired-token-val")));
            
            user.RefreshTokens.Add(new RefreshToken { Token = tokenHash, HasExpired = false, RefreshTokenExpiry = DateTime.UtcNow.AddMinutes(-5) });
            _context.Users.Add(user);
            await _context.SaveChangesAsync();

            var principal = new ClaimsPrincipal(new ClaimsIdentity(new[] { new Claim(ClaimTypes.NameIdentifier, "u1") }));
            _mockTokenService.Setup(t => t.GetPrincipalFromExpiredToken(requestBody.AccessToken)).Returns(principal);
            _mockUserManager.Setup(m => m.Users).Returns(_context.Users);

            // Act
            var result = await _controller.RefreshAccessToken(requestBody);

            // Assert
            var badRequest = Assert.IsType<BadRequestObjectResult>(result);
            Assert.Equal("Invalid or expired refresh token", ((ApiResponse)badRequest.Value!).Message!);
        }

        #endregion

        #region Logout

        [Fact]
        public async Task Logout_UserShouldBeSignOutAndTokensRevoked()
        {
            // Arrange
            var user = new ClaimsPrincipal(new ClaimsIdentity(new[] { new Claim(ClaimTypes.NameIdentifier, "u1") }, "mock"));
            _controller.ControllerContext.HttpContext.User = user;

            // Act
            var result = await _controller.Logout();

            // Assert
            Assert.IsType<OkObjectResult>(result);
            _mockSignInManager.Verify(m => m.SignOutAsync(), Times.Once);
            _mockTokenService.Verify(t => t.RevokeRefreshTokenAsync("u1"), Times.Once);
            Assert.Contains("refreshToken=; expires=", _controller.Response.Headers["Set-Cookie"].ToString()); // Cookie cleared
        }

        #endregion

        #region Forgot Password

        [Fact]
        public async Task ForgotPassword_AppShouldPreventEnumeration_ByReturningGenericSuccess()
        {
            // Arrange
            var dto = new ForgotPasswordDto { Email = "nonexistent@test.com" };
            _mockUserManager.Setup(m => m.FindByEmailAsync(dto.Email)).ReturnsAsync((IdeahubUser)null!);

            // Act
            var result = await _controller.ForgotPassword(dto);

            // Assert
            var okResult = Assert.IsType<OkObjectResult>(result);
            var response = Assert.IsType<ApiResponse>(okResult.Value);
            Assert.Contains("receive a reset code", response.Message);
            _mockPasswordResetService.Verify(p => p.GeneratePasswordResetCodeAsync(It.IsAny<string>()), Times.Never);
        }

        #endregion
    }
}
