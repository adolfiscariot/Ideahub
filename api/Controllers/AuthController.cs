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
using System.Runtime.Intrinsics.Arm;

namespace api.Controllers;


[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly UserManager<IdeahubUser> _userManager;
    private readonly SignInManager<IdeahubUser> _signInManager;
    private readonly ILogger<AuthController> _logger;
    private readonly IEmailSender _emailSender;
    private readonly IConfiguration _configuration;
    private readonly ITokenService _tokenService;
    //constructor
    public AuthController(
        UserManager<IdeahubUser> userManager,
        SignInManager<IdeahubUser> signinManager,
        ILogger<AuthController> logger,
        IEmailSender emailSender,
        IConfiguration configuration,
        ITokenService tokenService
        )
    {
        _userManager = userManager;
        _signInManager = signinManager;
        _logger = logger;
        _emailSender = emailSender;
        _configuration = configuration;
        _tokenService = tokenService;
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
                _logger.LogError("Confirmation Email Not Sent");
                await _userManager.DeleteAsync(user);
                return StatusCode(500, ApiResponse.Fail("Failed to send confirmation email", new List<string>()));
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
            return BadRequest(ApiResponse.Fail("Invalid Credentials", new List<string>()));
        }

        //find user
        var user = await _userManager.FindByIdAsync(userId);
        if (user == null)
        {
            return NotFound(ApiResponse.Fail("User Not Found", new List<string>()));
        }

        //check if email has already been confirmed
        if (user.EmailConfirmed)
        {
            return BadRequest(ApiResponse.Fail("Email already confirmed", new List<string>()));
        }

        //otherwise confirm the email
        var result = await _userManager.ConfirmEmailAsync(user, token);
        return result.Succeeded
            ? Ok(ApiResponse.Ok("Email Confirmation Completed"))
            : BadRequest(ApiResponse.Fail(
                "Email Confirmation Failed",
                result.Errors.Select(e => e.Description).ToList()));
    }

    //resend email
    [HttpPost("resend-email")]
    public async Task<IActionResult> ResendEmail(string email)
    {
        if (email == null)
        {
            _logger.LogError("Empty email attempted to resend confirmation");
            return BadRequest(ApiResponse.Fail("Email is required", new List<string>()));
        }

        //fetch user
        var user = await _userManager.FindByEmailAsync(email);
        if (user == null)
        {
            _logger.LogError("User Not Found");
            return BadRequest(ApiResponse.Fail("User Not Found", new List<string>()));
        }

        try
        {
            //generate another token
            var token = await _userManager.GenerateEmailConfirmationTokenAsync(user);

            //confirmation link
            var confirmationLink = Url.Action(
                nameof(ConfirmEmail),
                "Auth",
                new { user.Id, token },
                Request.Scheme
            );
            var subject = "Email Reconfirmation";
            var message = $"Use this link to reconfirm your email: {confirmationLink}";

            //send token via email
            await _emailSender.SendEmailAsync(
                user.Email,
                subject,
                message
            );

            _logger.LogInformation("Account Confirmation Email Re-sent to {UserId}", user.Id);
            return Ok(ApiResponse.Ok("Confirmation Email Re-sent"));
        }
        catch (Exception e)
        {
            _logger.LogError("Error resending confirmation email to {UserEmail}: {e}", user.Email, e);
            return StatusCode(500, ApiResponse.Fail("Failed to resend confirmation email", new List<string>()));
        }

    }

    [HttpPost("login")]
    public async Task<IActionResult> Login(LoginDto loginDto)
    {
        //find the user
        var user = await _userManager.FindByEmailAsync(loginDto.Email);
        if (user == null)
        {
            _logger.LogError($"Email {loginDto.Email} tried logging in with a non-existent email");
            return BadRequest(ApiResponse.Fail("Invalid Credentials", new List<string>()));
        }
        ;

        //check email confirmation
        if (!user.EmailConfirmed)
        {
            _logger.LogWarning("Please confirm your email before logging in");
            return BadRequest(ApiResponse.Fail("Please confirm your email before logging in", new List<string>()));
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

            _logger.LogInformation("User {userEmail} just logged in", user.Email);

            //if login succeeded return this
            return Ok(new TokenResponse
            {
                AccessToken = accessToken,
                RefreshToken = refreshToken,
                RefreshTokenExpiry = DateTime.UtcNow.AddDays(7)
            });
        }

        //if login failed return this
        _logger.LogWarning($"Failed login attempt for user: {loginDto.Email}");
        return BadRequest(ApiResponse.Fail("Username or Password is incorrect", new List<string>()));
    }

    //refresh the token
    [HttpPost("refresh-token")]
    public async Task<IActionResult> Refresh(TokenResponse token)
    {
        if (token == null)
        {
            return BadRequest(ApiResponse.Fail("Invalid Access Token or Refresh Token", new List<string>()));
        }

        //extract the tokens
        string accessToken = token.AccessToken;
        string refreshToken = token.RefreshToken;

        //get claims from token
        var principal = _tokenService.GetPrincipalFromExpiredToken(token.AccessToken);
        var username = principal.Identity.Name;

        //use the username claim to validate token
        var user = await _userManager.FindByNameAsync(username);
        if (user == null)
        {
            return BadRequest(ApiResponse.Fail("Invalid access or refresh token", new List<string>()));
        }
        //validate if refresh token is in user's refresh token list & its not expired
        var storedRefreshToken = user.RefreshTokens.FirstOrDefault(rt => rt.Token == token.RefreshToken && !rt.HasExpired && rt.RefreshTokenExpiry > DateTime.UtcNow);
        if (storedRefreshToken == null)
        {
            return BadRequest(ApiResponse.Fail("Invalid access or refresh token", new List<string>()));
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

        //add new refresh token to the user's list of refresh tokens and save changes
        user.RefreshTokens.Add(newRefreshToken);
        await _userManager.UpdateAsync(user);


        //create new access token then return it and the refresh token too
        var newAccessToken = _tokenService.GenerateRefreshToken();

        return Ok(new
        {
            AccessToken = newAccessToken,
            RefreshToken = newRefreshToken.Token
        });
    }

    //logout route
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
            if (userId != null)
            {
                await _tokenService.RevokeRefreshTokenAsync(userId);
                _logger.LogInformation("Revoked Refresh Token");
            }

            _logger.LogInformation("User logged out");
            return Ok(ApiResponse.Ok("User Logged Out"));
        }
        catch (Exception e)
        {
            _logger.LogWarning("User logout failed!");
            return StatusCode(500, ApiResponse.Fail($"Logout failed: {e}", new List<string>()));
        }
    }
}