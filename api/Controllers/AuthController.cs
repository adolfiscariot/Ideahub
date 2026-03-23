using api.Models;
using System.Text;
using api.Services;
using api.Helpers;
using api.Constants;
using System.Security.Claims;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using Microsoft.AspNetCore.Identity;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using System.Security.Cryptography;
using api.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;

namespace api.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    // ...

    [HttpGet("ping")]
    public IActionResult Ping()
    {
        return Ok("pong");
    }

    private readonly UserManager<IdeahubUser> _userManager;
    private readonly SignInManager<IdeahubUser> _signInManager;
    private readonly ILogger<AuthController> _logger;
    private readonly IEmailSender _emailSender;
    private readonly IConfiguration _configuration;
    private readonly ITokenService _tokenService;
    private readonly IdeahubDbContext _context;
    private readonly IPasswordResetService _passwordResetService;
    private readonly string homepageUrl = Environment.GetEnvironmentVariable("HOMEPAGE_URL") ?? "http://44.211.34.131:5065/home";

    //constructor
    public AuthController(
        UserManager<IdeahubUser> userManager,
        SignInManager<IdeahubUser> signinManager,
        ILogger<AuthController> logger,
        IEmailSender emailSender,
        IConfiguration configuration,
        ITokenService tokenService,
        IdeahubDbContext context,
        IPasswordResetService passwordResetService
        )
    {
        _userManager = userManager;
        _signInManager = signinManager;
        _logger = logger;
        _emailSender = emailSender;
        _configuration = configuration;
        _tokenService = tokenService;
        _context = context;
        _passwordResetService = passwordResetService;
    }


    //User Registration
    [HttpPost("register")]
    public async Task<IActionResult> Register(RegisterDto registerDto)
    {
        //create user
        var user = new IdeahubUser
        {
            DisplayName = registerDto.DisplayName,
            Email = registerDto.Email,
            UserName = registerDto.Email
        };
        var result = await _userManager.CreateAsync(user, registerDto.Password);

        //validate if registration was successful
        if (result.Succeeded)
        {
            //add user to default role which is regular user
            var roleResult = await _userManager.AddToRoleAsync(user, RoleConstants.RegularUser);
            if (!roleResult.Succeeded)
            {
                //Rollback the registration if role assignment fails
                await _userManager.DeleteAsync(user);
                _logger.LogWarning("Role assignment failed");
                return BadRequest(ApiResponse.Fail(
                    "Role Assigning Failed"
                    , roleResult.Errors.Select(e => e.Description).ToList()
                ));
            }
            else
            {
                _logger.LogInformation("Role assignment succeeded");
            }

            //create email confirmation token
            // var token = await _userManager.GenerateEmailConfirmationTokenAsync(user);
            // var confirmationLink = Url.Action(
            //     nameof(ConfirmEmail),
            //     "Auth",
            //     new { userId = user.Id, token },
            //     Request.Scheme
            // );
            // _logger.LogInformation("Email confirmation token created");

            // //send token to user's email
            // _logger.LogInformation("Confirmation Email sending....");
            // var userEmail = user.Email;
            // var userName = user.DisplayName;
            // var subject = "Ideahub Email Confirmation";
            // var message = $"Hello {userName}, Click this link to confirm your account {confirmationLink}";
            // try
            // {
            //     await _emailSender.SendEmailAsync(
            //         userEmail,
            //         subject,
            //         message
            //     );
            // }
            // //if it fails rollback the registration
            // catch (Exception e)
            // {
            //     _logger.LogError("Confirmation Email Not Sent: {Message}", e.Message);
            //     await _userManager.DeleteAsync(user);
            //     return StatusCode(500, ApiResponse.Fail("Failed to send confirmation email"));
            // }

            // _logger.LogInformation("Account Registration email sent");

            _logger.LogInformation($"User: {registerDto.Email}, Role: {RoleConstants.RegularUser}");
            return Ok(ApiResponse.Ok("User was created and added to the default role successfully"));
        }

        return BadRequest(ApiResponse.Fail(
            "User registration failed",
            result.Errors.Select(e => e.Description).ToList()
        ));
    }

    //Validate the email confirmation
    // [HttpGet("confirm-email")]
    // public async Task<IActionResult> ConfirmEmail(string userId, string token)
    // {
    //     //check if the token or user is null
    //     if (string.IsNullOrEmpty(token) || string.IsNullOrEmpty(userId))
    //     {
    //         _logger.LogError("Token or user Id is null");
    //         return BadRequest(ApiResponse.Fail("Invalid Credentials"));
    //     }

    //     //find user
    //     var user = await _userManager.FindByIdAsync(userId);
    //     if (user is null)
    //     {
    //         return NotFound(ApiResponse.Fail("User Not Found"));
    //     }

    //     //check if email has already been confirmed
    //     if (user.EmailConfirmed)
    //     {
    //         return Redirect(homepageUrl);
    //     }

    //     //otherwise confirm the email
    //     var result = await _userManager.ConfirmEmailAsync(user, token);
    //     if (result.Succeeded) {
    //         return Redirect(homepageUrl);
    //     } else {
    //         return BadRequest(ApiResponse.Fail(
    //             "Email Confirmation Failed",
    //             result.Errors.Select(e => e.Description).ToList()));
    //     }
    // }

    //resend email
    // [HttpPost("resend-email")]
    // public async Task<IActionResult> ResendEmail(string email)
    // {
    //     if (email is null)
    //     {
    //         _logger.LogError("Empty email attempted to resend confirmation");
    //         return BadRequest(ApiResponse.Fail("Email is required"));
    //     }

    //     //fetch user
    //     var user = await _userManager.FindByEmailAsync(email);
    //     if (user is null)
    //     {
    //         _logger.LogError("User Not Found");
    //         return BadRequest(ApiResponse.Fail("User Not Found"));
    //     }

    //     try
    //     {
    //         //generate another token
    //         var token = await _userManager.GenerateEmailConfirmationTokenAsync(user);

    //         //confirmation link
    //         var confirmationLink = Url.Action(
    //             nameof(ConfirmEmail),
    //             "Auth",
    //             new { userId = user.Id, token },
    //             Request.Scheme
    //         );
    //         var subject = "Email Reconfirmation";
    //         var message = $"Use this link to reconfirm your email: {confirmationLink}";

    //         //send token via email
    //         if (string.IsNullOrWhiteSpace(user.Email))
    //         {
    //             return BadRequest(ApiResponse.Fail("Email not found"));
    //         }
    //         await _emailSender.SendEmailAsync(
    //             user.Email,
    //             subject,
    //             message
    //         );

    //         _logger.LogInformation("Account Confirmation Email Re-sent to {UserEmail}", user.Email);
    //         return Ok(ApiResponse.Ok("Confirmation Email Re-sent"));
    //     }
    //     catch (Exception e)
    //     {
    //         _logger.LogError("Error resending confirmation email to {UserEmail}: {e}", user.Email, e);
    //         return StatusCode(500, ApiResponse.Fail("Failed to resend confirmation email"));
    //     }

    // }

    [HttpPost("login")]
    public async Task<IActionResult> Login(LoginDto loginDto)
    {
        //find the user
        var user = await _userManager.FindByEmailAsync(loginDto.Email);
        if (user is null)
        {
            _logger.LogError($"Email {loginDto.Email} tried logging in with a non-existent email");
            return BadRequest(ApiResponse.Fail("Invalid Credentials"));
        }

        //check email confirmation
        // if (!user.EmailConfirmed)
        // {
        //     _logger.LogWarning("Please confirm your email before logging in");
        //     return BadRequest(ApiResponse.Fail("Please confirm your email before logging in"));
        // }

        //login the user
        var loginResult = await _signInManager.PasswordSignInAsync(user, loginDto.Password, isPersistent: true, lockoutOnFailure: false);
        if (loginResult.Succeeded)
        {
            //create jwt access and refresh tokens
            var accessToken = await _tokenService.CreateAccessTokenAsync(user);
            var refreshToken = _tokenService.GenerateRefreshToken();
            //store refresh token
            await _tokenService.StoreRefreshTokenAsync(user.Id, refreshToken, DateTime.UtcNow.AddDays(7));

            // Set Refresh Token in a persistent, HttpOnly cookie
            var cookieOptions = new CookieOptions
            {
                HttpOnly = true,
                Secure = false, // set to true in prod for HTTPS
                SameSite = SameSiteMode.Lax, // set to Lax for local dev set to strict in prod
                Expires = DateTime.UtcNow.AddDays(7)
            };
            Response.Cookies.Append("refreshToken", refreshToken, cookieOptions);

            //set login time
            user.LastLoginAt = DateTime.UtcNow;

            //save changes
            await _context.SaveChangesAsync();

            _logger.LogInformation("User {userEmail} just logged in at {time} GMT", user.Email, user.LastLoginAt);

            //if login succeeded return this
            return Ok(ApiResponse.Ok("Successful login", new TokenResponse
            {
                AccessToken = accessToken,
                RefreshToken = "cookie",
                RefreshTokenExpiry = DateTime.UtcNow.AddDays(7)
            }));
        }

        //if login failed return this
        _logger.LogWarning($"Failed login attempt for user: {loginDto.Email}");
        return BadRequest(ApiResponse.Fail("Username or Password is incorrect"));
    }

    //refresh the access token
    [HttpPost("refresh-token")]
    public async Task<IActionResult> RefreshAccessToken([FromBody] TokenResponse tokenRequest)
    {
        // Get refresh token from cookie first, fallback to body
        var cookieToken = Request.Cookies["refreshToken"];
        var rawRefreshToken = cookieToken ?? tokenRequest?.RefreshToken;

        // _logger.LogInformation("Refresh attempt for user. Cookie present: {cookiePresent}, Body present: {bodyPresent}", 
        //     !string.IsNullOrEmpty(cookieToken), !string.IsNullOrEmpty(tokenRequest?.RefreshToken));
        _logger.LogInformation("Refreshing attempt for user"); 
        if (string.IsNullOrEmpty(rawRefreshToken))
        {
            //_logger.LogError("Refresh token is missing from cookie and request body");
            _logger.LogError("Missing Refresh token"); 
            return BadRequest(ApiResponse.Fail("Refresh token is required"));
        }

        if (rawRefreshToken == "cookie")
        {
            //_logger.LogError("Browser failed to send the actual refreshToken cookie");
            _logger.LogError("Auth cookie missing"); 
            return BadRequest(ApiResponse.Fail("Authentication cookie missing. Please try logging in again."));
        }

        if (tokenRequest?.AccessToken is null)
        {
            _logger.LogError("Access token is required");
            return BadRequest(ApiResponse.Fail("Access token is required"));
        }

        // Get principal from expired access token
        var principal = _tokenService.GetPrincipalFromExpiredToken(tokenRequest.AccessToken);
        if (principal?.Identity is null)
        {
            //_logger.LogError("Couldn't get principal's identity from expired token. Token might be malformed or tampered with.");
            _logger.LogError("Invalid access token"); 
            return BadRequest(ApiResponse.Fail("Invalid access token"));
        }

        var userId = principal.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (userId is null)
        {
            //_logger.LogError("User ID not found in token claims"); 
            _logger.LogError("User ID not found"); 
            return BadRequest(ApiResponse.Fail("Invalid access token claims"));
        }

        // Fetch user with refresh tokens
        var user = await _userManager.Users
            .Include(u => u.RefreshTokens)
            .AsSplitQuery()
            .FirstOrDefaultAsync(u => u.Id == userId);
        if (user is null)
        {
            _logger.LogError("User not found");
            return BadRequest(ApiResponse.Fail("User not found"));
        }

        // Hash the incoming refresh token to compare with stored hash
        var encodedRefreshToken = Encoding.UTF8.GetBytes(rawRefreshToken);
        var hashedRefreshToken = Convert.ToBase64String(SHA256.HashData(encodedRefreshToken));

        //_logger.LogInformation("Comparing hashed token from request with {count} stored tokens for user {userId}", user.RefreshTokens.Count, user.Id);

        var storedRefreshToken = user.RefreshTokens.FirstOrDefault(
            rt => rt.Token == hashedRefreshToken
            && !rt.HasExpired
            && rt.RefreshTokenExpiry > DateTime.UtcNow);

        if (storedRefreshToken is null)
        {
            var match = user.RefreshTokens.FirstOrDefault(rt => rt.Token == hashedRefreshToken);
            if (match != null)
            {
                // _logger.LogError("Token matched but is invalid. HasExpired: {expired}, Expiry: {expiry}, CurrentTime: {now}", 
                //     match.HasExpired, match.RefreshTokenExpiry, DateTime.UtcNow);
                _logger.LogError("Token match found but invalid");
            }
            else
            {
                //_logger.LogError("No matching token found in database for the provided hash.");
                _logger.LogError("No matching token found");
            }
            return BadRequest(ApiResponse.Fail("Invalid or expired refresh token"));
        }

        // Mark old token as expired
        storedRefreshToken.HasExpired = true;

        // Create new refresh token
        var newRawRefreshToken = _tokenService.GenerateRefreshToken();
        var encodedNewToken = Encoding.UTF8.GetBytes(newRawRefreshToken);
        var hashedNewToken = Convert.ToBase64String(SHA256.HashData(encodedNewToken));

        var newRefreshToken = new RefreshToken
        {
            Token = hashedNewToken, 
            TokenId = Guid.NewGuid().ToString(),
            HasExpired = false,
            RefreshTokenExpiry = DateTime.UtcNow.AddDays(7),
            UserId = user.Id
        };

        user.RefreshTokens.Add(newRefreshToken);
        await _userManager.UpdateAsync(user);

        // Update cookie with new refresh token
        var cookieOptions = new CookieOptions
        {
            HttpOnly = true,
            Secure = false,
            SameSite = SameSiteMode.Lax,
            Expires = DateTime.UtcNow.AddDays(7)
        };
        Response.Cookies.Append("refreshToken", newRawRefreshToken, cookieOptions);

        // Create new access token
        var newAccessToken = await _tokenService.CreateAccessTokenAsync(user);

        return Ok(ApiResponse.Ok("Token Refreshed", new
        {
            AccessToken = newAccessToken,
            RefreshToken = "cookie",
            RefreshTokenExpiry = newRefreshToken.RefreshTokenExpiry
        }));
    }

    //logout route
    [Authorize]
    [HttpPost("logout")]
    public async Task<IActionResult> Logout()
    {
        try
        {
            //log user out
            _logger.LogInformation("User logging out...");
            await _signInManager.SignOutAsync();

            //revoke jwt token
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            //var userId = User.FindFirstValue("sub");
            if (userId is null)
            {
                _logger.LogError("Logout failed. User Id not found");
                return NotFound(ApiResponse.Fail("Logout failed. User Id not found")); 
            }
            await _tokenService.RevokeRefreshTokenAsync(userId);
            Response.Cookies.Delete("refreshToken"); // Clear rotation cookie
            _logger.LogInformation("Revoked Refresh Token and cleared cookie");

            var user = await _userManager.FindByIdAsync(userId);
            var userEmail = user?.Email ?? $"User with ID {userId}'s email not found";
            _logger.LogInformation("User {userEmail} logged out", userEmail);
            return Ok(ApiResponse.Ok("User Logged Out"));
        }
        catch (Exception e)
        {
            _logger.LogError("User logout failed: {e}", e);
            return StatusCode(500, ApiResponse.Fail("Logout failed"));
        }
    }


    // Request password reset
    [HttpPost("forgot-password")]
    public async Task<IActionResult> ForgotPassword(ForgotPasswordDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Email))
            return BadRequest(ApiResponse.Fail("Email is required"));

        var user = await _userManager.FindByEmailAsync(dto.Email);

        // Always return generic response
        if (user is null)
        {
            _logger.LogInformation("Forgot password requested for non-existent email: {Email}", dto.Email);
            return Ok(ApiResponse.Ok("If an account exists with this email, you will receive a reset code"));
        }

        var (code, success) = await _passwordResetService.GeneratePasswordResetCodeAsync(user.Id);

        if (!success)
        {
            _logger.LogError("Failed to generate password reset code for user: {UserId}", user.Id);
            return Ok(ApiResponse.Ok("If an account exists with this email, you will receive a reset code"));
        }

        try
        {
            var subject = "Password Reset Code - Ideahub";
            var message = $@"
                <p>Hello {user.DisplayName},</p>
                <p>Your password reset code is:</p>
                <h2>{code}</h2>
                <p>This code will expire in 10 minutes.</p>
                <p>If you did not request this, ignore this email.</p>
            ";

            await _emailSender.SendEmailAsync(user.Email!, subject, message);
            _logger.LogInformation("Password reset code sent to {Email}", user.Email);
        }
        catch (Exception ex)
        {
            _logger.LogError("Failed to send reset code email: {Error}", ex.Message);
        }

        return Ok(ApiResponse.Ok("If an account exists with this email, you will receive a reset code"));
    }

    [HttpPost("validate-reset-code")]
    public async Task<IActionResult> ValidateResetCode(ValidateResetCodeDto dto)
    {
        var codeHash = Convert.ToBase64String(
            SHA256.HashData(Encoding.UTF8.GetBytes(dto.Code))
        );

        var resetRecord = await _context.PasswordResets
            .FirstOrDefaultAsync(pr =>
                pr.Code == codeHash &&
                !pr.Used &&
                pr.ExpiresAt > DateTime.UtcNow
            );

        if (resetRecord == null)
        {
            _logger.LogError("Invalid or expired reset code");
            return BadRequest(new { message = "Invalid or expired reset code" });
        }

        _logger.LogInformation("Reset code is valid");
        return Ok(new { message = "Reset code is valid" });
    }

    // Complete password reset
    [HttpPost("reset-password")]
    public async Task<IActionResult> ResetPassword(ResetPasswordDto dto)
    {
        if (!ModelState.IsValid)
            return BadRequest(ApiResponse.Fail("Invalid request"));

        try
        {
            var (success, error) =
                await _passwordResetService.ValidateCodeAndResetPasswordAsync(
                    dto.Code,
                    dto.NewPassword
                );

            if (!success)
            {
                _logger.LogWarning("Password reset failed: {Error}", error);
                return BadRequest(ApiResponse.Fail(error));
            }

            _logger.LogInformation("Password reset successful");
            return Ok(ApiResponse.Ok("Password reset successful. You can now log in."));
        }
        catch (Exception ex)
        {
            _logger.LogError("Error resetting password: {Error}", ex.Message);
            return StatusCode(500, ApiResponse.Fail("An error occurred"));
        }
    }

}