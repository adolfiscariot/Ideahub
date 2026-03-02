using api.Constants;
using api.Helpers;
using api.Models;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;

namespace api.Controllers;

[ApiController]
[Route("api/committee")]
public class CommitteeController : ControllerBase
{
    private readonly UserManager<IdeahubUser> _userManager;
    private readonly ILogger<CommitteeController> _logger;

    public CommitteeController(UserManager<IdeahubUser> userManager, ILogger<CommitteeController> logger)
    {
        _userManager = userManager;
        _logger = logger;
    }

    [HttpPost("promote/{email}")]
    public async Task<IActionResult> PromoteToCommittee(string email)
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

        _logger.LogInformation("Successfuly added user to committee");
        return Ok(ApiResponse.Ok("User promoted to CommitteeMember"));
    }
}
