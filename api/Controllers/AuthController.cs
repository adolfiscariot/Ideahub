using api.Models;
using System.Text;
using api.Helpers;
using api.Services;
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
    private readonly string homepageUrl = "http://localhost:4200";

    //constructor
    public AuthController(
        UserManager<IdeahubUser> userManager,
        SignInManager<IdeahubUser> signinManager,
        ILogger<AuthController> logger,
        IEmailSender emailSender,
        IConfiguration configuration,
        ITokenService tokenService,
        IdeahubDbContext context
        )
    {
        _userManager = userManager;
        _signInManager = signinManager;
        _logger = logger;
        _emailSender = emailSender;
        _configuration = configuration;
        _tokenService = tokenService;
        _context = context;
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
            var token = await _userManager.GenerateEmailConfirmationTokenAsync(user);
            var confirmationLink = Url.Action(
                nameof(ConfirmEmail),
                "Auth",
                new { userId = user.Id, token },
                Request.Scheme
            );
            _logger.LogInformation("Email confirmation token created");

            //send token to user's email
            _logger.LogInformation("Confirmation Email sending....");
            var userEmail = user.Email;
            var userName = user.DisplayName;
            var subject = "Ideahub Email Confirmation";
            var message = $"Hello {userName}, Click this link to confirm your account {confirmationLink}";
            try
            {
                await _emailSender.SendEmailAsync(
                    userEmail,
                    subject,
                    message
                );
            }
            //if it fails rollback the registration
            catch (Exception e)
            {
                _logger.LogError("Confirmation Email Not Sent: {Message}", e.Message);
                await _userManager.DeleteAsync(user);
                return StatusCode(500, ApiResponse.Fail("Failed to send confirmation email"));
            }

            _logger.LogInformation("Account Registration email sent");

            _logger.LogInformation($"User: {registerDto.Email}, Role: {RoleConstants.RegularUser}");
            return Ok(ApiResponse.Ok("User was created and added to the default role successfully"));
        }

        return BadRequest(ApiResponse.Fail(
            "User registration failed",
            result.Errors.Select(e => e.Description).ToList()
        ));
    }

    //Validate the email confirmation
    [HttpGet("confirm-email")]
    public async Task<IActionResult> ConfirmEmail(string userId, string token)
    {
        //check if the token or user is null
        if (string.IsNullOrEmpty(token) || string.IsNullOrEmpty(userId))
        {
            _logger.LogError("Token or user Id is null");
            return BadRequest(ApiResponse.Fail("Invalid Credentials"));
        }

        //find user
        var user = await _userManager.FindByIdAsync(userId);
        if (user is null)
        {
            return NotFound(ApiResponse.Fail("User Not Found"));
        }

        //check if email has already been confirmed
        if (user.EmailConfirmed)
        {
            return Redirect(homepageUrl);
        }

        //otherwise confirm the email
        var result = await _userManager.ConfirmEmailAsync(user, token);
        if (result.Succeeded) {
            return Redirect(homepageUrl);
        } else {
            return BadRequest(ApiResponse.Fail(
                "Email Confirmation Failed",
                result.Errors.Select(e => e.Description).ToList()));
        }
    }

    //resend email
    [HttpPost("resend-email")]
    public async Task<IActionResult> ResendEmail(string email)
    {
        if (email is null)
        {
            _logger.LogError("Empty email attempted to resend confirmation");
            return BadRequest(ApiResponse.Fail("Email is required"));
        }

        //fetch user
        var user = await _userManager.FindByEmailAsync(email);
        if (user is null)
        {
            _logger.LogError("User Not Found");
            return BadRequest(ApiResponse.Fail("User Not Found"));
        }

        try
        {
            //generate another token
            var token = await _userManager.GenerateEmailConfirmationTokenAsync(user);

            //confirmation link
            var confirmationLink = Url.Action(
                nameof(ConfirmEmail),
                "Auth",
                new { userId = user.Id, token },
                Request.Scheme
            );
            var subject = "Email Reconfirmation";
            var message = $"Use this link to reconfirm your email: {confirmationLink}";

            //send token via email
            if (string.IsNullOrWhiteSpace(user.Email))
            {
                return BadRequest(ApiResponse.Fail("Email not found"));
            }
            await _emailSender.SendEmailAsync(
                user.Email,
                subject,
                message
            );

            _logger.LogInformation("Account Confirmation Email Re-sent to {UserEmail}", user.Email);
            return Ok(ApiResponse.Ok("Confirmation Email Re-sent"));
        }
        catch (Exception e)
        {
            _logger.LogError("Error resending confirmation email to {UserEmail}: {e}", user.Email, e);
            return StatusCode(500, ApiResponse.Fail("Failed to resend confirmation email"));
        }

    }

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
        if (!user.EmailConfirmed)
        {
            _logger.LogWarning("Please confirm your email before logging in");
            return BadRequest(ApiResponse.Fail("Please confirm your email before logging in"));
        }

        //login the user
        var loginResult = await _signInManager.PasswordSignInAsync(user, loginDto.Password, isPersistent: true, lockoutOnFailure: false);
        if (loginResult.Succeeded)
        {
            //create jwt access and refresh tokens
            var accessToken = await _tokenService.CreateAccessTokenAsync(user);
            var refreshToken = _tokenService.GenerateRefreshToken().ToString();

            //store refresh token
            await _tokenService.StoreRefreshTokenAsync(user.Id, refreshToken, DateTime.UtcNow.AddDays(7));

            //set login time
            user.LastLoginAt = DateTime.UtcNow;

            //save changes
            await _context.SaveChangesAsync();

            _logger.LogInformation("User {userEmail} just logged in at {time} GMT", user.Email, user.LastLoginAt);

            //if login succeeded return this
            return Ok(ApiResponse.Ok("Successful login", new TokenResponse
            {
                AccessToken = accessToken,
                RefreshToken = refreshToken,
                RefreshTokenExpiry = DateTime.UtcNow.AddDays(7)
            }));
        }

        //if login failed return this
        _logger.LogWarning($"Failed login attempt for user: {loginDto.Email}");
        return BadRequest(ApiResponse.Fail("Username or Password is incorrect"));
    }

    //refresh the access token
    [HttpPost("refresh-token")]
    public async Task<IActionResult> RefreshAccessToken(TokenResponse token)
    {
        if (token is null)
        {
            _logger.LogError("The token provided in the method's argument is null");
            return BadRequest(ApiResponse.Fail("Invalid Access Token or Refresh Token"));
        }

        //get claims from expired token
        var principal = _tokenService.GetPrincipalFromExpiredToken(token.AccessToken);
        if (principal.Identity is null)
        {
            _logger.LogError("Couldn't get principal's identity from expired token");
            return BadRequest(ApiResponse.Fail("Couldn't get principal's identity from expired token"));
        }

        //Find the user based on the user id in the access token's payload
        var userId = principal.FindFirst(ClaimTypes.NameIdentifier)?.Value;

        if (userId is null)
        {
            _logger.LogError("User ID not found");
            return BadRequest(ApiResponse.Fail("Couldn't get user's ID"));
        }

        //Eager loading of the user's refresh tokens
        var user = await _userManager.Users.Include(u => u.RefreshTokens).FirstOrDefaultAsync(u=>u.Id == userId);

        if (user is null)
        {
            _logger.LogError("User is null");
            return BadRequest(ApiResponse.Fail("Invalid access or refresh token"));
        }

        /***
            The refresh token is encoded and hashed before being stored so we have to do the same
            to the refresh token provided at login before comparing it to the stored token
        ***/

        var rawRefreshToken = token.RefreshToken;
        var encodedRefreshToken  = Encoding.UTF8.GetBytes(rawRefreshToken);
        var hashedRefreshToken = Convert.ToBase64String(SHA256.HashData(encodedRefreshToken));

        var storedRefreshToken = user.RefreshTokens.FirstOrDefault(
            rt => rt.Token == hashedRefreshToken
            && !rt.HasExpired
            && rt.RefreshTokenExpiry > DateTime.UtcNow);


        if (storedRefreshToken is null)
        {
            _logger.LogError("There are no vaild stored refresh tokens");
            return BadRequest(ApiResponse.Fail("Invalid access or refresh token"));
        }

        //if refresh token exists and is valid, mark it as expired then create new one
        storedRefreshToken.HasExpired = true;

        var newRefreshToken = new RefreshToken
        {
            Token = _tokenService.GenerateRefreshToken(),
            TokenId = Guid.NewGuid().ToString(),
            HasExpired = false,
            RefreshTokenExpiry = DateTime.UtcNow.AddDays(7),
            UserId = user.Id
        };

        _logger.LogInformation("New refresh token created");

        //add new refresh token to the user's list of refresh tokens and save changes
        user.RefreshTokens.Add(newRefreshToken);
        await _userManager.UpdateAsync(user);


        //create new access token then return it and the refresh token too
        var newAccessToken = await _tokenService.CreateAccessTokenAsync(user);

        return Ok(new
        {
            AccessToken = newAccessToken,
            RefreshToken = newRefreshToken.Token
        });
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
            _logger.LogInformation("Revoked Refresh Token");

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
}