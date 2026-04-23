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
    private readonly IEmailSender _emailSender;
    private readonly IServiceScopeFactory _scopeFactory;

    public CommitteeController(UserManager<IdeahubUser> userManager, ILogger<CommitteeController> logger, IEmailSender emailSender, IServiceScopeFactory scopeFactory)
    {
        _userManager = userManager;
        _logger = logger;
        _emailSender = emailSender;
        _scopeFactory = scopeFactory;
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

        if (!result.Succeeded)
        {
            _logger.LogError("Failed to add user to committee");
            return BadRequest(ApiResponse.Fail("Failed to add user to committee", result.Errors.Select(e => e.Description).ToList()));
        }

        _logger.LogInformation("Successfully added user to committee");

        var admin = await _userManager.GetUserAsync(User);
        var adminName = admin?.DisplayName ?? admin?.UserName ?? "An Administrator";

        // Trigger welcome email in background
        _ = SendCommitteeWelcomeEmailAsync(user.Id, adminName);

        return Ok(ApiResponse.Ok("User promoted to CommitteeMember"));
    }

    private async Task SendCommitteeWelcomeEmailAsync(string userId, string adminName)
    {
        using var scope = _scopeFactory.CreateScope();
        var scopedUserManager = scope.ServiceProvider.GetRequiredService<UserManager<IdeahubUser>>();
        var scopedEmailSender = scope.ServiceProvider.GetRequiredService<IEmailSender>();

        try
        {
            var user = await scopedUserManager.FindByIdAsync(userId);
            if (user == null || string.IsNullOrEmpty(user.Email)) return;

            var name = user.DisplayName ?? user.UserName;
            var subject = "🏆 Welcome to the Ideahub Committee!";

            var emailBody = $@"
                <div style=""font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc; padding: 40px; color: #1e293b;"">
                  <div style=""max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.1); border: 1px solid #e2e8f0;"">
                    <!-- Brand Header -->
                    <div style=""background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); padding: 40px; text-align: center;"">
                      <div style=""font-size: 50px; margin-bottom: 10px;"">✨</div>
                      <h1 style=""color: #ffffff; margin: 0; font-size: 28px; text-transform: uppercase; letter-spacing: 2px;"">New Appointment</h1>
                      <p style=""color: rgba(255,255,255,0.9); margin-top: 5px; font-size: 16px;"">Official Committee Member</p>
                    </div>

                    <!-- Content Area -->
                    <div style=""padding: 40px; text-align: center;"">
                      <h2 style=""color: #1e293b; margin-top: 0; font-size: 24px;"">Congratulations, {name}!</h2>
                      <p style=""font-size: 16px; line-height: 1.8; color: #64748b;"">
                        You have been officially appointed to the <strong>Ideahub Committee</strong> by <strong>{adminName}</strong>.
                      </p>
                      
                      <div style=""background: #f1f5f9; border-radius: 12px; padding: 25px; margin: 30px 0; text-align: left;"">
                        <h3 style=""margin-top: 0; color: #4f46e5; font-size: 18px;"">Your Responsibilities:</h3>
                        <ul style=""color: #64748b; font-size: 14px; padding-left: 20px; line-height: 1.6;"">
                          <li>Review and score innovative ideas.</li>
                          <li>Help shape the future of our organization's innovation pipeline.</li>
                        </ul>
                      </div>
                    </div>

                    <!-- Footer -->
                    <div style=""background: #f8fafc; padding: 25px; text-align: center; border-top: 1px solid #e2e8f0;"">
                      <p style=""font-size: 12px; color: #94a3b8; margin: 0;"">This is an official communication from the Ideahub Platform.</p>
                    </div>
                  </div>
                </div>";

            await scopedEmailSender.SendEmailAsync(user.Email, subject, emailBody);
            _logger.LogInformation("Committee welcome email sent to {email}", user.Email);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send committee welcome email to user {userId}", userId);
        }
    }
}
