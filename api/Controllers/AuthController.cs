using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Logging;
using Microsoft.AspNetCore.Mvc;
using api.Models;
using api.Constants;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly UserManager<IdeahubUser> _userManager;
    private readonly SignInManager<IdeahubUser> _signInManager;
    private readonly ILogger<AuthController> _logger;
    
    //constructor
    public AuthController(UserManager<IdeahubUser> userManager, SignInManager<IdeahubUser> signinManager, ILogger<AuthController> logger)
    {
        _userManager = userManager;
        _signInManager = signinManager;
        _logger = logger;
    }


    //register new user
    [HttpPost("register")]
    public async Task<IActionResult> Register(RegisterDto registerDto)
    {
        //create and store new user
        var user = new IdeahubUser
        {
            DisplayName = registerDto.DisplayName,
            Email = registerDto.Email,
            UserName = registerDto.Email
        };
        var result = await _userManager.CreateAsync(user, registerDto.Password);

        //validate if storage was successful
        if(result.Succeeded)
        {
            //add user to default role which is regular user
            var roleResult = await _userManager.AddToRoleAsync(user, RoleConstants.RegularUser);
            if (!roleResult.Succeeded)
            {
                await _userManager.DeleteAsync(user);
                return BadRequest(ApiResponse.Fail(
                    "Role Assigning Failed",
                    roleResult.Errors.Select(e=>e.Description).ToList()
                ));
            }
            _logger.LogInformation($"User: {registerDto.Email}, Role: {RoleConstants.RegularUser}");
            return Ok(ApiResponse.Ok("User was created and added to the default role successfully"));
        }

        return BadRequest(ApiResponse.Fail(
            "User registration failed",
            result.Errors.Select(e => e.Description).ToList()
        ));
    }
}