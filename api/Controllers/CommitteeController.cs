using api.Constants;
using api.Helpers;
using api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace api.Controllers;

[Authorize]
[ApiController]
[Route("api/{controller}")]
public class CommitteeController : ControllerBase
{
    private readonly UserManager<IdeahubUser> _userManager;
    private readonly ILogger<CommitteeController> _logger;

    public CommitteeController(UserManager<IdeahubUser> userManager, ILogger<CommitteeController> logger)
    {
        _userManager = userManager;
        _logger = logger;
    }

    [HttpGet]
    public async Task<IActionResult> GetCommitteeMembers()
    {
        var users = await _userManager.GetUsersInRoleAsync(RoleConstants.CommitteeMember);
        var userDtos = users.Select(u => new { u.Id, u.Email, u.DisplayName }).ToList();
        return Ok(ApiResponse.Ok("Committee members fetched successfully", userDtos));
    }

    [HttpGet("users")]
    public async Task<IActionResult> GetAllUsers()
    {
        var users = await _userManager.Users.ToListAsync();
        var userDtos = users.Select(u => new { u.Id, u.Email, u.DisplayName }).ToList();
        return Ok(ApiResponse.Ok("All users fetched successfully", userDtos));
    }

    [Authorize(Roles = "SuperAdmin,CommitteeMember")]
    [HttpPost("add/{email}")]
    public async Task<IActionResult> AddCommitteeMember(string email)
    {
        _logger.LogInformation("Adding {email} to committee", email);
        var user = await _userManager.FindByEmailAsync(email);
        if (user == null)
            return NotFound(ApiResponse.Fail("User not found"));

        var result = await _userManager.AddToRoleAsync(user, RoleConstants.CommitteeMember);

        if (!result.Succeeded){
            _logger.LogError("Failed to add user to committee");
            return BadRequest(ApiResponse.Fail("Failed to add user to committee", result.Errors.Select(e => e.Description).ToList()));
        }

        _logger.LogInformation("Successfully added user to committee");
        return Ok(ApiResponse.Ok("User promoted to CommitteeMember"));
    }
}
