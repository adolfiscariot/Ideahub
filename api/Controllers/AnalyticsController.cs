using System.Security.Claims;
using api.Data;
using api.Helpers;
using api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class AnalyticsController : ControllerBase
{
    private readonly IdeahubDbContext _context;
    private readonly ILogger<AnalyticsController> _logger;

    public AnalyticsController(IdeahubDbContext context, ILogger<AnalyticsController> logger)
    {
        _context = context;
        _logger = logger;
    }

    [HttpGet("dashboard-stats")]
    public async Task<IActionResult> GetDashboardStats()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrWhiteSpace(userId))
        {
            return Unauthorized(ApiResponse.Fail("User not authenticated"));
        }

        try
        {
            // Stats for ideas created by the user
            var userIdeas = _context.Ideas.Where(i => i.UserId == userId);

            var totalIdeas = await userIdeas.CountAsync();
            var openIdeas = await userIdeas.CountAsync(i => i.Status == IdeaStatus.Open);
            var closedIdeas = await userIdeas.CountAsync(i => i.Status == IdeaStatus.Closed);
            var promotedIdeas = await userIdeas.CountAsync(i => i.IsPromotedToProject);

            // Stats for groups the user belongs to
            var totalGroups = await _context.UserGroups.CountAsync(ug => ug.UserId == userId);

            var stats = new DashboardStatsDto
            {
                TotalIdeas = totalIdeas,
                OpenIdeas = openIdeas,
                ClosedIdeas = closedIdeas,
                PromotedIdeas = promotedIdeas,
                TotalGroups = totalGroups
            };

            return Ok(ApiResponse.Ok("Dashboard stats retrieved", stats));
        }
        catch (Exception e)
        {
            _logger.LogError("Error fetching dashboard stats: {e}", e);
            return StatusCode(500, ApiResponse.Fail("Failed to fetch dashboard stats"));
        }
    }

    [HttpGet("recent-activity")]
    public async Task<IActionResult> GetRecentActivity()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrWhiteSpace(userId))
        {
            return Unauthorized(ApiResponse.Fail("User not authenticated"));
        }

        try
        {
            // Get 5 most recent ideas created by the user
            var recentIdeas = await _context.Ideas
                .Where(i => i.UserId == userId)
                .OrderByDescending(i => i.CreatedAt)
                .Take(5)
                .Select(i => new 
                {
                    i.Id,
                    i.Title,
                    i.Status,
                    i.CreatedAt,
                    GroupName = i.Group.Name,
                    GroupId = i.GroupId
                })
                .ToListAsync();

            return Ok(ApiResponse.Ok("Recent activity retrieved", recentIdeas));
        }
        catch (Exception e)
        {
            _logger.LogError("Error fetching recent activity: {e}", e);
            return StatusCode(500, ApiResponse.Fail("Failed to fetch recent activity"));
        }
    }
}
